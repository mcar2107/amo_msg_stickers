import { BUILTIN_KLIPY_KEY } from '../builtinKlipyKey';
import type { RemoteGif } from '../db.types';
import type { Host, Settings } from '../host.types';
import type { Locale, MessageKey } from '../i18n/i18n.types';
import { t } from '../i18n/translate';
import { httpStatus, isAllowedUrl } from '../net';
import { MAX_GIF_BYTES } from '../sidePick';

import {
  type GifFeed,
  type GifPage,
  type GifProvider,
  type GiphyImage,
  type GiphyKind,
  isGiphyImage,
  isGiphyItem,
  isGiphyResponse,
  isTenorMedia,
  isTenorResponse,
  isTenorResult,
  type KeyCheck,
  type SizePick,
  type TenorMedia,
} from './gifs.types';

/**
 * Ключи словаря, а не тексты: модуль загружается до выбора языка, и готовая строка осталась бы
 * на языке по умолчанию.
 */
export const FEED_LABELS: Record<GifFeed, MessageKey> = {
  'giphy-gifs': 'gifs.feed.giphyGifs',
  'giphy-stickers': 'gifs.feed.giphyStickers',
  klipy: 'gifs.feed.klipy',
};

/**
 * Ключ KLIPY для запроса: свой из «Настроек» важнее встроенного в сборку. Встроенный —
 * знание модуля источников, а не настроек: в поле ввода и хранилище он не попадает.
 *
 * @param ownKey — ключ из «Настроек», пустой — не задан
 * @returns ключ (пустой — KLIPY недоступен) и признак, что он встроенный
 */
const klipyKeyOf = (ownKey: string) => {
  return { key: ownKey || BUILTIN_KLIPY_KEY, isBuiltin: !ownKey };
};

export const availableFeeds = ({ giphyKey, klipyKey }: Settings): GifFeed[] => {
  const feeds: GifFeed[] = [];

  if (giphyKey) feeds.push('giphy-gifs', 'giphy-stickers');
  if (klipyKeyOf(klipyKey).key) feeds.push('klipy');

  return feeds;
};

const PAGE_SIZE = 24;

const GIPHY_BASE = 'https://api.giphy.com/v1';
const GIPHY_RATING = 'pg-13';

/**
 * KLIPY v2 повторяет Tenor v2 (Tenor API закрыт Google 30.06.2026).
 */
const KLIPY_BASE = 'https://api.klipy.com/v2';
const KLIPY_CLIENT_KEY = 'amo-stickers';

/**
 * Все форматы-кандидаты на отправку (`KLIPY_SEND_CANDIDATES`); превью — `tinygif` и `gif` —
 * входят в тот же набор. KLIPY отдаёт только форматы из фильтра, без него — 16 форматов.
 */
const KLIPY_MEDIA_FILTER = 'gif,mediumgif,tinygif,nanogif';
const KLIPY_CONTENT_FILTER = 'medium';

/**
 * Tenor v2 ждёт локаль с регионом: язык без региона KLIPY не документирует.
 */
const KLIPY_LOCALES: Record<Locale, string> = { ru: 'ru_RU', en: 'en_US' };

/**
 * Рендишны по убыванию предпочтения: превью и отправка, когда выдача не сообщила вес ни
 * одной версии. `original` GIPHY отдаёт почти всегда, остальные — не у каждого GIF.
 */
const GIPHY_PREVIEW_RENDITIONS = ['fixed_width_small', 'fixed_width', 'original'];
const GIPHY_SEND_RENDITIONS = ['downsized', 'original'];
const KLIPY_PREVIEW_FORMATS = ['tinygif', 'gif'];
const KLIPY_SEND_FORMATS = ['gif', 'tinygif'];

/**
 * Версии GIF для выбора по весу — от крупной к мелкой: порядок решает равенство веса.
 * Не берутся `*_still` (один кадр), `*_downsampled` и `preview_gif` (прореженные кадры),
 * `*_mp4` и `webp` (не GIF).
 */
const GIPHY_SEND_CANDIDATES = [
  'original',
  'downsized_large',
  'downsized_medium',
  'downsized',
  'fixed_height',
  'fixed_width',
  'fixed_height_small',
  'fixed_width_small',
];
const KLIPY_SEND_CANDIDATES = ['gif', 'mediumgif', 'tinygif', 'nanogif'];

/**
 * Первый пригодный вариант файла: правильной формы и со ссылкой в пределах сетевой
 * политики. null — ни один не подошёл, элемент выдачи отбрасывается.
 *
 * @param variants — варианты файла по имени
 * @param names — имена по убыванию предпочтения
 * @param isVariant — гард формы варианта
 * @returns вариант или null
 */
const pickVariant = <T extends GiphyImage | TenorMedia>(
  variants: Record<string, unknown>,
  names: string[],
  isVariant: (value: unknown) => value is T
): T | null => {
  for (const name of names) {
    const variant = variants[name];

    if (isVariant(variant) && isAllowedUrl(variant.url)) return variant;
  }

  return null;
};

/**
 * GIPHY отдаёт вес строкой. Нечисловая строка, 0 и отрицательное — веса нет.
 *
 * @param image — рендишн GIPHY
 * @returns вес в байтах или null
 */
const giphyBytes = ({ size }: GiphyImage) => {
  const bytes = typeof size === 'string' ? Number(size) : Number.NaN;

  return Number.isFinite(bytes) && bytes > 0 ? bytes : null;
};

/**
 * KLIPY отдаёт вес числом. Иной тип, 0 и отрицательное — веса нет.
 *
 * @param media — формат KLIPY
 * @returns вес в байтах или null
 */
const klipyBytes = ({ size }: TenorMedia) => {
  return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : null;
};

/**
 * Версия для отправки по весу из ответа источника: самая тяжёлая из не больше
 * `MAX_GIF_BYTES` уходит без конвертации. Если таких нет — самая лёгкая: меньше качать и
 * быстрее пережимать. Самая лёгкая заодно и «самая лёгкая до лимита скачивания», если
 * такая есть; если нет — скачивание оборвётся на лимите с понятной ошибкой. Равный вес —
 * первая по списку. null — ни у одной пригодной версии нет веса, выбор остаётся за
 * `pickVariant`.
 *
 * @param variants — варианты файла по имени
 * @param names — кандидаты от крупной версии к мелкой
 * @param isVariant — гард формы варианта
 * @param bytesOf — вес варианта из ответа; null — веса нет
 * @returns вариант или null
 */
const pickBySize = <T extends GiphyImage | TenorMedia>(
  variants: Record<string, unknown>,
  names: string[],
  isVariant: (value: unknown) => value is T,
  bytesOf: (variant: T) => number | null
): T | null => {
  const { heaviestFit, lightest } = names.reduce<SizePick<T>>(
    (acc, name) => {
      const variant = variants[name];

      if (!isVariant(variant) || !isAllowedUrl(variant.url)) return acc;
      const bytes = bytesOf(variant);

      if (bytes === null) return acc;

      if (bytes <= MAX_GIF_BYTES && (!acc.heaviestFit || acc.heaviestFit.bytes < bytes)) {
        acc.heaviestFit = { variant, bytes };
      }

      if (!acc.lightest || acc.lightest.bytes > bytes) acc.lightest = { variant, bytes };

      return acc;
    },
    { heaviestFit: null, lightest: null }
  );
  const picked = heaviestFit || lightest;

  return picked ? picked.variant : null;
};

const giphy = async (
  host: Host,
  key: string,
  kind: GiphyKind,
  q: string,
  next: string | null,
  locale: Locale
): Promise<GifPage> => {
  const params = new URLSearchParams({
    api_key: key,
    limit: String(PAGE_SIZE),
    offset: String(Number(next || 0)),
    rating: GIPHY_RATING,
  });

  /**
   * Язык — только у поиска: у `trending` GIPHY параметра языка нет, тренды общие.
   */
  if (q) {
    params.set('q', q);
    params.set('lang', locale);
  }

  const endpoint = q ? 'search' : 'trending';
  const response = await host.fetchJson(`${GIPHY_BASE}/${kind}/${endpoint}?${params}`);

  if (!isGiphyResponse(response))
    throw new Error(t('error.source.badResponse', { source: 'GIPHY' }));
  const { data, pagination } = response;

  const items = data.reduce<RemoteGif[]>((acc, item) => {
    if (!isGiphyItem(item)) return acc;
    const preview = pickVariant(item.images, GIPHY_PREVIEW_RENDITIONS, isGiphyImage);
    const send =
      pickBySize(item.images, GIPHY_SEND_CANDIDATES, isGiphyImage, giphyBytes) ||
      pickVariant(item.images, GIPHY_SEND_RENDITIONS, isGiphyImage);

    if (preview && send) {
      acc.push({
        id: item.id,
        provider: 'giphy',
        title: item.title || undefined,
        url: send.url,
        previewUrl: preview.url,
        width: Number(preview.width),
        height: Number(preview.height),
      });
    }

    return acc;
  }, []);
  const consumed = pagination.offset + pagination.count;

  return { items, next: consumed < pagination.total_count ? String(consumed) : null };
};

/**
 * Статусы, которыми источник отказывает ключу. Любой другой исход — не приговор ключу, а сбой
 * проверки.
 *
 * KLIPY на неверный ключ отвечает 404 с «The provided API key is invalid.»: ключ — часть
 * адреса его API. У GIPHY 404 в отказ не входит: неверный ключ он отклоняет 401, а 404 значил
 * бы сбой адреса запроса, а не ключа.
 */
const KEY_REJECT_STATUSES: Record<GifProvider, readonly number[]> = {
  giphy: [401, 403],
  klipy: [401, 403, 404],
};

const klipy = async (
  host: Host,
  key: string,
  q: string,
  next: string | null,
  locale: Locale
): Promise<GifPage> => {
  const params = new URLSearchParams({
    key,
    client_key: KLIPY_CLIENT_KEY,
    limit: String(PAGE_SIZE),
    media_filter: KLIPY_MEDIA_FILTER,
    contentfilter: KLIPY_CONTENT_FILTER,
    locale: KLIPY_LOCALES[locale],
  });

  if (q) params.set('q', q);
  if (next) params.set('pos', next);
  const endpoint = q ? 'search' : 'featured';
  const response = await host.fetchJson(`${KLIPY_BASE}/${endpoint}?${params}`);

  if (!isTenorResponse(response))
    throw new Error(t('error.source.badResponse', { source: 'KLIPY' }));
  const { results, next: nextPos } = response;

  const items = results.reduce<RemoteGif[]>((acc, result) => {
    if (!isTenorResult(result)) return acc;
    const formats = result.media_formats;
    const preview = pickVariant(formats, KLIPY_PREVIEW_FORMATS, isTenorMedia);
    const send =
      pickBySize(formats, KLIPY_SEND_CANDIDATES, isTenorMedia, klipyBytes) ||
      pickVariant(formats, KLIPY_SEND_FORMATS, isTenorMedia);

    if (preview && send) {
      const [width, height] = preview.dims;

      acc.push({
        id: result.id,
        provider: 'klipy',
        title: result.content_description || undefined,
        url: send.url,
        previewUrl: preview.url,
        width,
        height,
      });
    }

    return acc;
  }, []);

  return { items, next: nextPos || null };
};

/**
 * Отказ KLIPY встроенному ключу: статусы отказа ключу — ключ отозван или недействителен —
 * и 429 — общий ключ упёрся в лимит. Ни то, ни другое пользователь не исправит, кроме как
 * своим ключом.
 */
const BUILTIN_KLIPY_REFUSAL_STATUSES = [...KEY_REJECT_STATUSES.klipy, 429];

/**
 * Выдача KLIPY по своему или встроенному ключу. Отказ встроенному ключу показывается
 * предложением указать свой, а не сырым `HTTP <код>`: код не подсказывает, что делать, а
 * исправить такой отказ можно только своим ключом. Прочие ошибки и любые ошибки своего
 * ключа — как есть.
 *
 * @param host — окружение
 * @param ownKey — ключ из «Настроек», пустой — запрос по встроенному
 * @param q — запрос поиска, пустой — тренды
 * @param next — курсор следующей страницы
 * @param locale — язык выдачи
 * @returns страница выдачи
 */
const klipyFeed = async (
  host: Host,
  ownKey: string,
  q: string,
  next: string | null,
  locale: Locale
): Promise<GifPage> => {
  const { key, isBuiltin } = klipyKeyOf(ownKey);

  if (!isBuiltin) return klipy(host, key, q, next, locale);

  try {
    return await klipy(host, key, q, next, locale);
  } catch (error) {
    if (!BUILTIN_KLIPY_REFUSAL_STATUSES.includes(httpStatus(error) || 0)) throw error;

    throw new Error(t('error.gifs.builtinUnavailable'));
  }
};

export const fetchGifs = (
  host: Host,
  { giphyKey, klipyKey }: Settings,
  feed: GifFeed,
  q: string,
  next: string | null,
  locale: Locale
): Promise<GifPage> => {
  switch (feed) {
    case 'giphy-gifs': {
      return giphy(host, giphyKey, 'gifs', q, next, locale);
    }

    case 'giphy-stickers': {
      return giphy(host, giphyKey, 'stickers', q, next, locale);
    }

    case 'klipy': {
      return klipyFeed(host, klipyKey, q, next, locale);
    }

    default: {
      throw new Error(`Unknown feed: ${String(feed)}`);
    }
  }
};

/**
 * Адрес проверочного запроса: тренды одной GIF — самый дешёвый запрос, которому нужен ключ.
 *
 * @param provider — источник
 * @param key — ключ API
 * @returns адрес запроса
 */
const keyCheckUrl = (provider: GifProvider, key: string) => {
  switch (provider) {
    case 'giphy': {
      const params = new URLSearchParams({
        api_key: key,
        limit: '1',
        rating: GIPHY_RATING,
      });

      return `${GIPHY_BASE}/gifs/trending?${params}`;
    }

    case 'klipy': {
      const params = new URLSearchParams({
        key,
        client_key: KLIPY_CLIENT_KEY,
        limit: '1',
      });

      return `${KLIPY_BASE}/featured?${params}`;
    }

    default: {
      throw new Error(`Unknown provider: ${String(provider)}`);
    }
  }
};

/**
 * @param provider — источник
 * @param response — ответ API
 * @returns `true` — ответ формы выдачи источника
 */
const isFeedResponse = (provider: GifProvider, response: unknown) => {
  switch (provider) {
    case 'giphy': {
      return isGiphyResponse(response);
    }

    case 'klipy': {
      return isTenorResponse(response);
    }

    default: {
      throw new Error(`Unknown provider: ${String(provider)}`);
    }
  }
};

/**
 * Проверка ключа одним запросом трендов через `Host` — по той же сетевой политике, что и
 * выдача. Не бросает: итог — только подсказка у поля, ключ уже сохранён. Статус отказа берётся
 * из текста ошибки: граница service worker-а передаёт её текстом.
 *
 * @param host — окружение
 * @param provider — источник ключа
 * @param key — ключ API
 * @returns итог проверки
 */
export const checkGifKey = async (
  host: Host,
  provider: GifProvider,
  key: string
): Promise<KeyCheck> => {
  try {
    const response = await host.fetchJson(keyCheckUrl(provider, key));

    return isFeedResponse(provider, response) ? 'ok' : 'unavailable';
  } catch (error) {
    return KEY_REJECT_STATUSES[provider].includes(httpStatus(error) || 0)
      ? 'rejected'
      : 'unavailable';
  }
};
