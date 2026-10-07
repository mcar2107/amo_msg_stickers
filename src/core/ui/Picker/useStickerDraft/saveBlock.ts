import type { SaveBlock, SaveBlockInput } from './useStickerDraft.types';

/**
 * Причина, по которой сохранение недоступно, — текстом рядом с кнопкой. Без файла
 * причина — файл: собирать нечего, и флаг сборки здесь ничего не говорит пользователю.
 *
 * `null` не значит «можно сохранить»: после ошибки конвертации стикера нет, но причина уже
 * в статусе, а во время сохранения кнопка занята без пояснения.
 *
 * @param input — выбран ли файл и идёт ли сборка
 * @returns причина недоступности; `null` — пояснять нечего
 */
export const saveBlock = (input: SaveBlockInput): SaveBlock => {
  const { hasFile, isConverting } = input;

  if (!hasFile) return 'noFile';
  if (isConverting) return 'converting';

  return null;
};
