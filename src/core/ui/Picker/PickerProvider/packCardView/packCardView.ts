import type { Pack } from '../../../../db.types';

import type {
  PackCard,
  PackCardInput,
  PreviewEntry,
  PreviewView,
} from './packCardView.types';

/**
 * Запрос превью — по смене имени пака, а не текста ссылки: правка, которая имя не меняет,
 * запроса не шлёт. Без своего и встроенного токена запроса нет — импорт сам скажет, что токена
 * нет.
 *
 * Сбой без превью (сеть, отказ бота) по тому же имени запрашивается снова: эффект превью
 * перезапускается сменой токена, и новый токен должен получить шанс показать карточку, а не
 * упереться в прежний отказ до правки ссылки.
 *
 * @param name — имя пака из поля; `null` — ссылка без имени
 * @param entry — последний принятый ответ превью
 * @param hasToken — есть свой или встроенный токен
 * @returns `true` — нужен запрос состава пака
 */
export const shouldRequestPreview = (
  name: string | null,
  entry: PreviewEntry | null,
  hasToken: boolean
): boolean => {
  if (!name || !hasToken) return false;

  return entry?.name !== name || entry.result.status === 'none';
};

/**
 * Превью для имени в поле. Ответ по другому имени не показывается: пока ответ по имени в поле
 * не пришёл, на месте карточки заглушка.
 *
 * «Уже в библиотеке» — по списку паков на момент показа: ответ превью живёт, пока имя то же, а
 * импорт или удаление пака за это время меняют библиотеку.
 *
 * @param name — имя пака из поля; `null` — ссылка без имени
 * @param entry — последний принятый ответ превью
 * @param hasToken — есть свой или встроенный токен
 * @param packs — паки библиотеки
 * @returns превью или `null` — его нет
 */
export const previewView = (
  name: string | null,
  entry: PreviewEntry | null,
  hasToken: boolean,
  packs: Pack[]
): PreviewView => {
  if (!name || !hasToken) return null;
  if (entry?.name !== name) return { status: 'loading' };
  const { result } = entry;

  switch (result.status) {
    case 'ready': {
      const { title, total, packId } = result;
      const isInLibrary = packs.some(({ id }) => {
        return id === packId;
      });

      return { status: 'ready', title, total, isInLibrary };
    }

    case 'notFound': {
      return result;
    }

    case 'none': {
      return null;
    }

    default: {
      const unknownResult: never = result;

      throw new Error(`Unknown preview result: ${String(unknownResult)}`);
    }
  }
};

/**
 * Карточка во время импорта показывает пак, который импортируется, а не тот, что в поле:
 * правка ссылки посреди импорта карточку не меняет.
 *
 * @param input — ход импорта и превью поля
 * @returns содержимое карточки или `null` — карточки нет
 */
export const packCard = (input: PackCardInput): PackCard | null => {
  const { isImporting, snapshot, progress, preview } = input;

  if (isImporting) {
    if (!snapshot) return { status: 'loading' };

    return { status: 'importing', ...snapshot, done: progress?.done || 0 };
  }

  if (!preview) return null;

  switch (preview.status) {
    case 'loading': {
      return preview;
    }

    case 'ready': {
      const { title, total, isInLibrary } = preview;

      return { status: 'preview', title, total, isInLibrary };
    }

    case 'notFound': {
      return null;
    }

    default: {
      const unknownPreview: never = preview;

      throw new Error(`Unknown preview: ${String(unknownPreview)}`);
    }
  }
};
