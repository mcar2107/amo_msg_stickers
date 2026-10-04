import { LocalizedError } from './i18n/translate';

/**
 * Сетевая политика ядра: куда разрешено ходить и сколько байт читать. Её применяют оба
 * окружения — service worker расширения и userscript, — чтобы вести себя одинаково.
 */

export const BYTES_IN_MB = 1024 * 1024;

/**
 * Лимит скачивания GIF из поиска. Версию для отправки выбирают по весу из выдачи
 * (`sources/gifs.ts`), но вес бывает неизвестен или расходится с фактом: лимит обрывает
 * скачивание независимо от ответа API.
 */
export const MAX_REMOTE_GIF_BYTES = 8 * BYTES_IN_MB;

const ALLOWED_PROTOCOL = 'https:';

/**
 * Сверены с `host_permissions` в manifest и с `@connect` в заголовке userscript
 * (`build.mjs`, совпадение с `@connect` держит тест). Bot API живёт на одном хосте — он
 * сравнивается точно; медиа GIPHY и KLIPY раздают CDN на поддоменах — там разрешён домен со
 * всеми поддоменами. Ссылки из ответов API на другие хосты не скачиваем — иначе IP и Referer
 * пользователя amo утекают туда, куда укажет ответ.
 */
export const ALLOWED_HOSTS = ['api.telegram.org'];
export const ALLOWED_DOMAINS = ['giphy.com', 'klipy.com'];

/**
 * Сколько символов тела ответа попадает в текст ошибки — достаточно, чтобы понять причину,
 * и не раздувает сообщение HTML-страницей ошибки.
 */
const ERROR_BODY_PREVIEW = 200;

/**
 * Ошибка политики — `LocalizedError`: её создаёт и service worker, и мир страницы, а показать её нужно на
 * языке amo, которого SW не знает.
 *
 * @returns ошибка адреса вне политики
 */
export const notAllowedError = () => {
  return new LocalizedError('error.net.notAllowed');
};

/**
 * Хост сравнивается после разбора URL, а не регуляркой по строке: так
 * `giphy.com.evil.example`, `evilgiphy.com` и `https://api.telegram.org@evil.example/`
 * не проходят.
 *
 * @param url — проверяемый адрес
 * @returns true, если по адресу можно ходить
 */
export const isAllowedUrl = (url: string) => {
  if (!URL.canParse(url)) return false;
  const { protocol, hostname } = new URL(url);

  return (
    protocol === ALLOWED_PROTOCOL &&
    (ALLOWED_HOSTS.includes(hostname) ||
      ALLOWED_DOMAINS.some((domain) => {
        return hostname === domain || hostname.endsWith(`.${domain}`);
      }))
  );
};

/**
 * Адреса в тексте ошибки нет: в пути запросов к Telegram лежит токен бота, а текст ошибки
 * показывается в попапе и пишется в консоль.
 *
 * @param url — проверяемый адрес
 */
export const assertAllowedUrl = (url: string) => {
  if (!isAllowedUrl(url)) throw notAllowedError();
};

/**
 * Ошибка превышения лимита размера — общий текст для всех путей чтения тела. `LocalizedError`, как
 * и ошибка политики: лимит доходит через границу service worker параметром, а не готовым текстом.
 *
 * @param maxBytes — предел размера, который превышен
 * @returns ошибка с пределом в мегабайтах
 */
export const tooBigError = (maxBytes: number) => {
  return new LocalizedError('error.net.tooBig', {
    size: Math.round((maxBytes / BYTES_IN_MB) * 10) / 10,
  });
};

/**
 * Ошибка не-2xx ответа — общий текст для всех сетевых путей: HTTP-статус и начало тела,
 * по которому видна причина.
 *
 * @param status — HTTP-статус ответа
 * @param body — тело ответа как текст
 * @returns ошибка с HTTP-статусом и не больше 200 символов тела
 */
export const httpError = (status: number, body: string) => {
  return new Error(`HTTP ${status} ${body.slice(0, ERROR_BODY_PREVIEW)}`);
};

/**
 * Начало текста ошибки `httpError` со статусом.
 */
const HTTP_STATUS_RE = /^HTTP (\d{3}) /;

/**
 * HTTP-статус ошибки не-2xx ответа. Граница service worker-а передаёт ошибку текстом,
 * поэтому статус разбирается из формата `httpError`, одинакового во всех окружениях.
 *
 * @param error — пойманная ошибка
 * @returns статус; `null` — ошибка не от не-2xx ответа (сеть, политика, лимит) или не `Error`
 */
export const httpStatus = (error: unknown): number | null => {
  if (!(error instanceof Error)) return null;

  const match = HTTP_STATUS_RE.exec(error.message);

  return match ? Number(match[1]) : null;
};

/**
 * Читает поток целиком, но не больше `maxBytes`: при превышении источник отменяется, и
 * остаток не скачивается и не распаковывается.
 *
 * @param stream — поток байтов
 * @param maxBytes — предел размера
 * @returns все байты потока
 */
export const readLimited = async (
  stream: ReadableStream<Uint8Array>,
  maxBytes: number
) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;
    total += value.byteLength;

    if (total > maxBytes) {
      await reader.cancel();
      throw tooBigError(maxBytes);
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
};

/**
 * Тело ответа не больше `maxBytes`. `Content-Length` отсекает заведомо большой ответ до
 * чтения, но сервер может его не прислать или соврать — поэтому поток читается с лимитом
 * всегда.
 *
 * @param res — ответ fetch
 * @param maxBytes — предел размера тела
 * @returns байты тела
 */
export const readResponseLimited = async (res: Response, maxBytes: number) => {
  if (Number(res.headers.get('content-length')) > maxBytes) {
    await res.body?.cancel();
    throw tooBigError(maxBytes);
  }

  if (!res.body) return new Uint8Array(0);

  return readLimited(res.body, maxBytes);
};

/**
 * fetch в рамках сетевой политики. Адрес вне политики — исключение без обращения к сети;
 * редирект fetch проходит сам, поэтому политика проверяется и на итоговом адресе. Не-2xx
 * ответ — исключение с HTTP-статусом и началом тела.
 *
 * @param url — адрес запроса
 * @returns успешный ответ
 */
export const fetchChecked = async (url: string) => {
  assertAllowedUrl(url);
  const res = await fetch(url);

  if (!isAllowedUrl(res.url || url)) {
    await res.body?.cancel();
    throw notAllowedError();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => {
      return '';
    });

    throw httpError(res.status, body);
  }

  return res;
};
