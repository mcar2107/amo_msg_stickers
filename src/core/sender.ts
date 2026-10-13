import { t } from './i18n/translate';
import { isDraftEmpty, isEditing, sendButtonOf } from './amoDom';
import type { SendComposer } from './amoDom.types';
import { inspectGif } from './gif';
import type { PageClient } from './pageClient.types';

export class SendError extends Error {}

const POLL_INTERVAL_MS = 80;
const ATTACH_TIMEOUT_MS = 15_000;

/**
 * Пауза после появления вложения: React должен дорисовать его, иначе onMainSend может
 * не увидеть файл.
 */
const RENDER_SETTLE_MS = 60;

const wait = (ms: number) => {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
};

const waitFor = async (check: () => boolean, timeoutMs: number) => {
  const start = Date.now();

  while (!check()) {
    if (Date.now() - start > timeoutMs) return false;
    await wait(POLL_INTERVAL_MS);
  }

  return true;
};

/**
 * Запасной путь — штатный путь пользователя: paste файла в поле ввода → вложение → клик
 * «Отправить».
 *
 * В DataTransfer кладём ТОЛЬКО файл: при наличии text/plain поле вставит текст, а не вложение.
 *
 * Ждём саму кнопку «Отправить», а не непустой черновик: где кнопка появляется только с готовым
 * вложением, полоса вложений показывается раньше неё. Кнопка ищется заново в момент нажатия —
 * найденная до вставки могла смениться.
 */
const sendViaPaste = async (composer: SendComposer, file: File) => {
  if (isEditing(composer)) throw new SendError(t('error.send.editing'));
  if (!isDraftEmpty(composer)) throw new SendError(t('error.send.draftNotEmpty'));

  const { editable } = composer;
  const dataTransfer = new DataTransfer();

  dataTransfer.items.add(file);

  editable.focus();
  editable.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    })
  );

  const isAttached = await waitFor(() => {
    return Boolean(sendButtonOf(composer));
  }, ATTACH_TIMEOUT_MS);

  if (!isAttached) throw new SendError(t('error.send.notAttached'));

  await wait(RENDER_SETTLE_MS);
  const sendButton = sendButtonOf(composer);

  /**
   * Кнопка пропала за паузу дорисовки — нажимать нечего, и «отправлено» было бы ложью.
   */
  if (!sendButton) throw new SendError(t('error.send.notAttached'));
  sendButton.click();
};

/**
 * Отправляет стикер отдельным сообщением через очередь amo, не трогая поле ввода. Если amo
 * сообщение не принял — агента нет, внутренности amo сменились, открыт не чат, — стикер
 * уходит запасным путём, вставкой в поле, с проверками черновика. После приёма в очередь
 * запасной путь закрыт при любом исходе загрузки: иначе один клик дал бы два стикера.
 *
 * @param composer — поле ввода, от которого идёт отправка
 * @param file — GIF с готовым именем
 * @param pageClient — клиент агента в мире страницы
 */
export const sendFile = async (
  composer: SendComposer,
  file: File,
  pageClient: PageClient
) => {
  const result = pageClient.send(composer.editable, file);

  switch (result.status) {
    case 'accepted': {
      return;
    }

    case 'unavailable': {
      console.info(
        `[amo-stickers] amo queue unavailable (${result.reason}), pasting instead`
      );
      await sendViaPaste(composer, file);

      return;
    }

    default: {
      const unknownResult: never = result;

      throw new Error(`Unknown page send result: ${JSON.stringify(unknownResult)}`);
    }
  }
};

/**
 * Имени по умолчанию нет: его собирает вызывающий, и в файл оно уходит как есть — по нему amo
 * подписывает картинку в ленте, а расширение уже входит в собранное имя.
 *
 * @param blob — готовый GIF
 * @param fileName — полное имя файла с расширением
 * @returns файл для вставки в поле ввода
 */
export const toGifFile = (blob: Blob, fileName: string) => {
  return new File([blob], fileName, { type: 'image/gif' });
};

/**
 * То же, что `toGifFile`, но для файла из сети: байты проверяются как GIF, иначе
 * `SendError` — в поле ввода не попадёт HTML-страница ошибки или обрезанный файл.
 *
 * @param blob — скачанный файл
 * @param fileName — полное имя файла с расширением
 * @returns файл для вставки в поле ввода
 */
export const toCheckedGifFile = async (blob: Blob, fileName: string) => {
  if (!inspectGif(new Uint8Array(await blob.arrayBuffer()))) {
    throw new SendError(t('error.send.notGif'));
  }

  return toGifFile(blob, fileName);
};
