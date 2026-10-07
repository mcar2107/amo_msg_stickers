import { isObject } from '../../shared/guards';
import type { RemoteGif } from '../db.types';

export type GifFeed = 'giphy-gifs' | 'giphy-stickers' | 'klipy';

/**
 * Раздел GIPHY: у GIF и стикеров разные эндпоинты с одинаковой формой ответа.
 */
export type GiphyKind = 'gifs' | 'stickers';

/**
 * Источник GIF, у которого свой ключ API.
 */
export type GifProvider = RemoteGif['provider'];

/**
 * Итог проверки ключа: `ok` — источник отдал выдачу; `rejected` — источник отказал в доступе;
 * `unavailable` — проверить не удалось (сеть, сбой источника, ответ не той формы).
 */
export type KeyCheck = 'ok' | 'rejected' | 'unavailable';

export type GifPage = {
  /**
   * GIF текущей страницы выдачи.
   */
  items: RemoteGif[];

  /**
   * Курсор следующей страницы. null — выдача закончилась.
   */
  next: string | null;
};

export type GiphyImage = {
  /**
   * Ссылка на GIF-рендишн.
   */
  url: string;

  /**
   * Ширина в пикселях — GIPHY отдаёт числа строками.
   */
  width: string;

  /**
   * Высота в пикселях — GIPHY отдаёт числа строками.
   */
  height: string;

  /**
   * Вес файла в байтах строкой: `"1953125"`. Гард поле не проверяет — рендишн без веса
   * или с непригодным весом остаётся в выдаче; пригодность веса проверяет выбор версии
   * для отправки.
   */
  size?: string;
};

export type GiphyItem = {
  /**
   * Идентификатор GIF в GIPHY.
   */
  id: string;

  /**
   * Название GIF; пустая строка — названия нет.
   */
  title?: string;

  /**
   * Рендишны по имени (`original`, `downsized`, `fixed_width` …); набор зависит от GIF,
   * каждый проверяется `isGiphyImage` при выборе.
   */
  images: Record<string, unknown>;
};

export type GiphyPagination = {
  /**
   * Смещение текущей страницы.
   */
  offset: number;

  /**
   * Сколько элементов пришло на странице.
   */
  count: number;

  /**
   * Всего элементов в выдаче.
   */
  total_count: number;
};

export type GiphyResponse = {
  /**
   * GIF страницы выдачи; каждый элемент проверяется `isGiphyItem`.
   */
  data: unknown[];

  /**
   * Положение страницы в выдаче.
   */
  pagination: GiphyPagination;
};

export type TenorMedia = {
  /**
   * Ссылка на файл формата.
   */
  url: string;

  /**
   * Размеры в пикселях: [ширина, высота].
   */
  dims: [number, number];

  /**
   * Вес файла в байтах. Гард поле не проверяет — формат без веса или с непригодным весом
   * остаётся в выдаче; пригодность веса проверяет выбор версии для отправки.
   */
  size?: number;
};

export type TenorResult = {
  /**
   * Идентификатор GIF в KLIPY.
   */
  id: string;

  /**
   * Описание GIF; нет или пустая строка — описания нет.
   */
  content_description?: string;

  /**
   * Файлы по формату (`gif`, `mediumgif`, `tinygif` …); приходят только запрошенные в `media_filter`,
   * каждый проверяется `isTenorMedia` при выборе.
   */
  media_formats: Record<string, unknown>;
};

export type TenorResponse = {
  /**
   * GIF страницы выдачи; каждый элемент проверяется `isTenorResult`.
   */
  results: unknown[];

  /**
   * Курсор следующей страницы. Пустая строка или нет поля — выдача закончилась.
   */
  next?: string;
};

/**
 * Гарды проверяют только то, что код читает дальше: лишние поля ответа не мешают,
 * а без нужных элемент или страница выдачи бесполезны.
 */

/**
 * GIPHY отдаёт размеры строками: `"480"`. Нечисловая строка и 0 не проходят — размер
 * нужен сетке для раскладки.
 *
 * @param value — поле ответа
 * @returns true, если это строка с положительным числом
 */
const isPositiveNumeric = (value: unknown) => {
  return typeof value === 'string' && Number(value) > 0;
};

export const isGiphyImage = (value: unknown): value is GiphyImage => {
  return (
    isObject(value) &&
    'url' in value &&
    typeof value.url === 'string' &&
    'width' in value &&
    isPositiveNumeric(value.width) &&
    'height' in value &&
    isPositiveNumeric(value.height)
  );
};

export const isGiphyItem = (value: unknown): value is GiphyItem => {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'string' &&
    (!('title' in value) || typeof value.title === 'string') &&
    'images' in value &&
    isObject(value.images)
  );
};

export const isGiphyResponse = (value: unknown): value is GiphyResponse => {
  return (
    isObject(value) &&
    'data' in value &&
    Array.isArray(value.data) &&
    'pagination' in value &&
    isObject(value.pagination) &&
    'offset' in value.pagination &&
    typeof value.pagination.offset === 'number' &&
    'count' in value.pagination &&
    typeof value.pagination.count === 'number' &&
    'total_count' in value.pagination &&
    typeof value.pagination.total_count === 'number'
  );
};

export const isTenorMedia = (value: unknown): value is TenorMedia => {
  return (
    isObject(value) &&
    'url' in value &&
    typeof value.url === 'string' &&
    'dims' in value &&
    Array.isArray(value.dims) &&
    value.dims.length === 2 &&
    value.dims.every((dim) => {
      return typeof dim === 'number' && dim > 0;
    })
  );
};

export const isTenorResult = (value: unknown): value is TenorResult => {
  return (
    isObject(value) &&
    'id' in value &&
    typeof value.id === 'string' &&
    (!('content_description' in value) ||
      typeof value.content_description === 'string') &&
    'media_formats' in value &&
    isObject(value.media_formats)
  );
};

export const isTenorResponse = (value: unknown): value is TenorResponse => {
  return (
    isObject(value) &&
    'results' in value &&
    Array.isArray(value.results) &&
    (!('next' in value) || typeof value.next === 'string')
  );
};

/**
 * Версия GIF для отправки с известным весом.
 */
export type WeightedVariant<T> = {
  /**
   * Вариант файла, прошедший гард формы и сетевую политику.
   */
  variant: T;

  /**
   * Вес файла в байтах из ответа источника — положительное число.
   */
  bytes: number;
};

/**
 * Кандидаты выбора версии по весу, собранные за один проход по списку.
 */
export type SizePick<T> = {
  /**
   * Самая тяжёлая версия не больше `MAX_GIF_BYTES`; null — такой нет.
   */
  heaviestFit: WeightedVariant<T> | null;

  /**
   * Самая лёгкая версия с весом; null — веса нет ни у одной.
   */
  lightest: WeightedVariant<T> | null;
};
