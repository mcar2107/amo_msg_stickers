import type { StickerKind, StickerNameParts } from './stickerMark.types';

/**
 * Пометка сообщения amo stickers — одна на ядро, агента в мире страницы и стиль ленты: имя файла собирает ядро, в
 * Worker-версии amo web имя читает агент и переносит вид на строку ленты, а стиль узнаёт сообщение по имени или по
 * атрибуту строки. Модуль в `shared/`: агент не импортирует ядро, а смена маркера не разведёт имя, разбор и стиль.
 */

/**
 * Маркер имени файла amo stickers: `[метка.]amostk.k-<вид>[.<ключ>-<значение>]*.gif`.
 */
export const STICKER_MARKER = 'amostk';

/**
 * Ключ параметра вида в имени файла.
 */
export const KIND_KEY = 'k';

/**
 * Атрибут строки ленты Worker-версии со своим сообщением: значение — вид (`sticker` или `gif`). Имени файла в DOM этой
 * версии нет, и стиль узнаёт сообщение только по нему.
 */
export const MARK_KIND_ATTR = 'data-amo-stickers-kind';

/**
 * Коробка медиа фото в строке ленты Worker-версии — место под картинку, которое стиль вписывает в 208 px. В строке
 * своего сообщения она одна: пересылку и подпись агент не помечает, а превью цитаты — картинка без коробки.
 */
export const MARK_BOX_SELECTOR = '[data-media="photo"][data-media-box]';

/**
 * Переменные CSS коробки медиа Worker-версии со сторонами картинки — целыми числами без единиц. На коробке, а не на
 * строке: смена переменной пересчитывает стиль только поддерева коробки, а не всей строки с пузырём и рамками.
 */
export const MARK_WIDTH_VAR = '--amostk-w';
export const MARK_HEIGHT_VAR = '--amostk-h';

/**
 * Без точек и дефисов в ключе и значении разбор однозначен: точка делит сегменты, первый дефис — ключ и значение.
 */
export const NAME_PARAM_KEY = /^[a-z][a-z0-9]*$/;
export const NAME_PARAM_VALUE = /^[a-z0-9]+$/;

const EXTENSION_SEGMENT = /^[a-z0-9]+$/;

/**
 * Имя из двух сегментов — маркер с расширением или метка с маркером без расширения: в обоих нет ни вида, ни места
 * под него, такое имя не считается именем amo stickers.
 */
const MIN_SEGMENTS = 3;

/**
 * Где искать маркер: сначала сегмент 1 (сегмент 0 — метка), затем сегмент 0 (метки нет). В таком порядке имя
 * `amostk.amostk.k-gif.gif` читается как метка `amostk`, а не как имя без метки. Дальше сегмента 1 маркера не
 * бывает: точки из метки вычищены.
 */
const MARKER_POSITIONS = [1, 0];

/**
 * Параметры из сегментов между маркером и расширением. Сегмент не в форме `ключ-значение` пропускается — будущие
 * версии формата могут добавить сегменты иного вида; при повторе ключа действует первое вхождение.
 *
 * @param segments — сегменты после маркера без расширения
 * @returns все параметры, включая `k`
 */
const parseParams = (segments: string[]): Record<string, string> => {
  return segments.reduce<Record<string, string>>((acc, segment) => {
    const dashIndex = segment.indexOf('-');
    const key = segment.slice(0, dashIndex);
    const value = segment.slice(dashIndex + 1);

    if (
      dashIndex > 0 &&
      NAME_PARAM_KEY.test(key) &&
      NAME_PARAM_VALUE.test(value) &&
      !Object.hasOwn(acc, key)
    ) {
      acc[key] = value;
    }

    return acc;
  }, {});
};

/**
 * Разбор имени файла amo stickers на метку и параметры. Незнакомый вид, незнакомые параметры и сегменты иного вида
 * имя чужим не делают.
 *
 * @param name — имя файла
 * @returns метка и параметры с `k`; null — нет маркера на месте или расширения
 */
export const splitStickerFileName = (name: string): StickerNameParts | null => {
  const segments = name.split('.');
  const extension = segments.at(-1) || '';

  if (segments.length < MIN_SEGMENTS || !EXTENSION_SEGMENT.test(extension)) {
    return null;
  }

  const markerIndex = MARKER_POSITIONS.find((index) => {
    return segments[index] === STICKER_MARKER;
  });

  if (markerIndex === undefined) {
    return null;
  }

  return {
    label: markerIndex === 1 ? segments[0] || '' : '',
    params: parseParams(segments.slice(markerIndex + 1, -1)),
  };
};

/**
 * Вид по значению `k`.
 *
 * @param value — значение параметра `k`, если он есть
 * @returns вид; null — параметра нет или вид незнакомый
 */
export const kindOfValue = (value: string | undefined): StickerKind | null => {
  switch (value) {
    case 'sticker': {
      return 'sticker';
    }

    case 'gif': {
      return 'gif';
    }

    default: {
      return null;
    }
  }
};

/**
 * Вид для пометки строки ленты. Незнакомый или отсутствующий вид — `gif`: сообщение остаётся своим, но показывается
 * без уменьшения, как GIF, — стикером его делает только явный вид.
 *
 * @param name — имя файла картинки сообщения
 * @returns вид; null — имя не amo stickers, строка не помечается
 */
export const markKindOf = (name: string): StickerKind | null => {
  const parts = splitStickerFileName(name);

  if (!parts) return null;

  return kindOfValue(parts.params[KIND_KEY]) || 'gif';
};
