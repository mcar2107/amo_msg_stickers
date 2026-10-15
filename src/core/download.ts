/**
 * Через сколько отозвать адрес блоба. Отзыв сразу после `click()` может оборвать скачивание: браузер
 * начинает его асинхронно. Минута — с запасом на медленный старт; блоб держится в памяти только до
 * отзыва, а выгрузка ссылается на блобы стикеров в IndexedDB, а не на свою копию байтов.
 */
export const REVOKE_DELAY_MS = 60_000;

/**
 * Сохраняет блоб обычным скачиванием браузера под именем `name`, без диалогов amo stickers.
 *
 * Ссылка не вставляется в документ: `click()` скачивает и с отсоединённой ссылки, а вставка будила бы
 * `MutationObserver` ядра и amo на `body`.
 *
 * @param blob — содержимое файла
 * @param name — имя файла в загрузках; браузер ещё может заменить в нём недопустимые символы
 */
export const downloadBlob = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = name;
  anchor.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
};
