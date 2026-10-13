import {
  KIND_KEY,
  kindOfValue,
  NAME_PARAM_KEY,
  NAME_PARAM_VALUE,
  splitStickerFileName,
  STICKER_MARKER,
} from '../shared/stickerMark';

import type { SendItem } from './db.types';
import type {
  ParsedStickerFileName,
  StickerFileKind,
  StickerFileNameParams,
  StickerLabelSource,
} from './fileName.types';

/**
 * Подстроки имени для селекторов стиля ленты (`amoDom*.ts`): маркер с точкой — своё сообщение, сегмент вида в
 * точках — стикер. Собраны из тех же констант, что и само имя, поэтому смена маркера не разведёт имя и стиль.
 */
export const MARKER_NAME_PART = `${STICKER_MARKER}.`;
export const STICKER_NAME_PART = `.${KIND_KEY}-${'sticker' satisfies StickerFileKind}.`;

/**
 * Других форматов сейчас нет: всё, что отправляется, приведено к GIF.
 */
const EXTENSION = 'gif';

const MAX_LABEL_GRAPHEMES = 32;

/**
 * Потолок в байтах сверх потолка в графемах: длина графемы не ограничена (комбинирующие знаки), а слишком длинное
 * имя сервер или браузер может урезать вместе с маркером. 128 байт вмещают 32 графемы кириллицы и 32 простых эмодзи.
 */
const MAX_LABEL_BYTES = 128;

/**
 * Точка и слеш ломают разбор имени по сегментам и путь при скачивании, управляющие символы (перевод строки) ломают
 * скачивание, символы управления направлением текста (`\p{Bidi_Control}`: LRM, RLM, ALM, встраивания, переопределения и
 * изоляты) подменяют видимое имя скачанного файла. Весь `\p{Cf}` не вычищается: в нём ZWJ, без которого составные
 * эмодзи распадаются.
 */
const LABEL_JUNK = /[./\p{Cc}\p{Bidi_Control}]/gu;

/**
 * Режем по графемам, а не по UTF-16 единицам или кодпоинтам: первое разрывает суррогатную пару, второе — ZWJ-эмодзи
 * и флаги.
 */
const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const UTF8 = new TextEncoder();

/**
 * Метка для имени файла: без символов, ломающих имя, не длиннее 32 графем и 128 байт UTF-8, без пробелов по краям.
 * Графема не разрезается: не влезает целиком — метка на ней заканчивается.
 *
 * @param raw — эмодзи, подпись или название GIF как есть
 * @returns метка; пустая строка — метки нет, имя начинается с маркера
 */
export const sanitizeLabel = (raw: string): string => {
  const cleaned = raw.replaceAll(LABEL_JUNK, '').trim();
  let label = '';
  let count = 0;
  let bytes = 0;

  for (const { segment } of GRAPHEME_SEGMENTER.segment(cleaned)) {
    const segmentBytes = UTF8.encode(segment).length;

    if (count === MAX_LABEL_GRAPHEMES || bytes + segmentBytes > MAX_LABEL_BYTES) {
      break;
    }

    label += segment;
    count += 1;
    bytes += segmentBytes;
  }

  /**
   * Обрезка могла оставить пробел в конце — он встал бы перед маркером (`Привет .amostk.…`).
   */
  return label.trim();
};

/**
 * Имя файла для отправки. Параметры приходят только из констант кода, поэтому невалидный параметр — ошибка
 * программиста, а не пользовательский ввод.
 *
 * @param fileName — вид, метка как есть и необязательные параметры
 * @returns имя `[метка.]amostk.k-<вид>[.<ключ>-<значение>]*.gif`; пустая после вычистки метка не пишется
 * @throws {Error} ключ или значение параметра не из `[a-z0-9]`, ключ не с буквы или равен `k`
 */
export const buildStickerFileName = ({
  kind,
  label,
  params,
}: StickerFileNameParams): string => {
  const paramSegments = Object.entries(params || {}).map(([key, value]) => {
    if (key === KIND_KEY || !NAME_PARAM_KEY.test(key) || !NAME_PARAM_VALUE.test(value)) {
      throw new Error(`Невалидный параметр имени файла: «${key}» = «${value}»`);
    }

    return `${key}-${value}`;
  });
  const cleanLabel = sanitizeLabel(label);
  const labelSegments = cleanLabel ? [cleanLabel] : [];

  return [
    ...labelSegments,
    STICKER_MARKER,
    `${KIND_KEY}-${kind}`,
    ...paramSegments,
    EXTENSION,
  ].join('.');
};

/**
 * Разбор имени файла amo stickers. Незнакомый вид, незнакомые параметры и сегменты иного вида имя чужим не делают:
 * будущий вид остаётся именем amo stickers.
 *
 * @param name — имя файла
 * @returns вид, метка и параметры без `k`; null — нет маркера на месте или расширения
 */
export const parseStickerFileName = (name: string): ParsedStickerFileName | null => {
  const parts = splitStickerFileName(name);

  if (!parts) {
    return null;
  }

  const { [KIND_KEY]: kindValue, ...params } = parts.params;

  return { kind: kindOfValue(kindValue), label: parts.label, params };
};

/**
 * Имя файла для отправки элемента пикера. Вид берётся из элемента, а не из записи: у «Недавних» GIF из поиска
 * остаётся `gif`, какие бы данные ни пришли рядом.
 *
 * @param item — что отправляется: стикер из пака или GIF из поиска
 * @param sticker — запись стикера для `local`: метка — подпись, без неё — эмодзи; для `remote` не читается
 * @returns имя файла; нет метки — имя начинается с маркера
 */
export const sendFileName = (item: SendItem, sticker?: StickerLabelSource): string => {
  switch (item.kind) {
    case 'local': {
      return buildStickerFileName({
        kind: 'sticker',
        label: sticker?.caption || sticker?.emoji || '',
      });
    }

    case 'remote': {
      return buildStickerFileName({ kind: 'gif', label: item.gif.title || '' });
    }

    default: {
      const unknownItem: never = item;

      throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
    }
  }
};
