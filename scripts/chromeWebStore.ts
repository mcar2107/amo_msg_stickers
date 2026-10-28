/**
 * Клиент Chrome Web Store API v2 для релиза: вход сервисным аккаунтом, загрузка пакета и отправка на проверку.
 * Только стираемый синтаксис TS и без рантайм-импортов: `scripts/publish-chrome-web-store.mjs` импортирует модуль
 * напрямую, а Node снимает типы сам. Подпись JWT — Web Crypto, а не `node:crypto`: типов Node в проекте нет.
 */

import type {
  PublishOptions,
  PublishResult,
  ServiceAccountKey,
  StoreApi,
  StoreItem,
} from './chromeWebStore.types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const API_ORIGIN = 'https://chromewebstore.googleapis.com';

const STORE_SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

/**
 * Срок жизни JWT для обмена на токен — максимум, который принимает Google. Токен нужен на одну загрузку.
 */
const ASSERTION_LIFETIME_SECONDS = 3600;

/**
 * Загрузку, которую стор не закончил к ответу, опрашиваем раз в 5 с до 2 минут: пакет расширения — сотни
 * килобайт, обработка дольше означает сбой на стороне стора.
 */
const UPLOAD_POLL_INTERVAL_MS = 5000;

const UPLOAD_POLL_ATTEMPTS = 24;

/**
 * Тело ответа об ошибке в тексте исключения обрезается: оно идёт в лог прогона, а целиком бывает страницей HTML.
 */
const ERROR_BODY_LIMIT = 500;

/**
 * Состояние, когда стор его не прислал, — значение по умолчанию перечисления `ItemState`.
 */
const UNSPECIFIED_STATE = 'ITEM_STATE_UNSPECIFIED';

const PEM_BODY_PATTERN = /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/;

/**
 * @param value — что угодно из JSON
 * @returns `true`, если это объект, а не `null` и не массив
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @param record — объект из ответа
 * @param key — имя поля
 * @returns строковое поле или пустая строка, если поля нет или оно не строка
 */
const readString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];

  return typeof value === 'string' ? value : '';
};

/**
 * @param bytes — байты
 * @returns base64url без `=`, как того требует JWT
 */
const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, (byte) => {
    return String.fromCodePoint(byte);
  }).join('');

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};

/**
 * @param value — объект заголовка или полезной нагрузки JWT
 * @returns его JSON в base64url
 */
const encodeJsonSegment = (value: object): string => {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
};

/**
 * @param pem — закрытый ключ PKCS#8 в PEM
 * @returns байты DER
 * @throws {Error} в строке нет блока `PRIVATE KEY`
 */
const pemToDer = (pem: string): Uint8Array<ArrayBuffer> => {
  const body = PEM_BODY_PATTERN.exec(pem)?.[1];

  if (!body) {
    throw new Error('В ключе сервисного аккаунта нет блока PRIVATE KEY');
  }

  return Uint8Array.from(atob(body.replaceAll(/\s/g, '')), (char) => {
    return char.codePointAt(0) || 0;
  });
};

/**
 * Разбирает JSON-ключ сервисного аккаунта из секрета. Текст ошибки не цитирует секрет: он уходит в лог прогона.
 *
 * @param json — содержимое JSON-ключа
 * @returns почта аккаунта и закрытый ключ
 * @throws {Error} не JSON или нет `client_email` / `private_key`
 */
export const readServiceAccountKey = (json: string): ServiceAccountKey => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Ключ сервисного аккаунта — не JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Ключ сервисного аккаунта — не объект JSON');
  }

  const clientEmail = readString(parsed, 'client_email');
  const privateKey = readString(parsed, 'private_key');

  if (!clientEmail || !privateKey) {
    throw new Error('В ключе сервисного аккаунта нет client_email или private_key');
  }

  return { clientEmail, privateKey };
};

/**
 * JWT сервисного аккаунта для обмена на access token (OAuth 2.0 JWT bearer). Подписывается здесь, а не через
 * IAM Credentials API: тому нужна роль `serviceAccountTokenCreator` аккаунта на самого себя.
 *
 * @param key — ключ сервисного аккаунта
 * @param nowSeconds — текущее время в секундах
 * @returns подписанный RS256 JWT
 */
export const createAssertion = async (
  key: ServiceAccountKey,
  nowSeconds: number
): Promise<string> => {
  const header = encodeJsonSegment({ alg: 'RS256', typ: 'JWT' });
  const payload = encodeJsonSegment({
    iss: key.clientEmail,
    scope: STORE_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + ASSERTION_LIFETIME_SECONDS,
  });
  const signingInput = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(key.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
};

/**
 * @param response — ответ API
 * @param action — что делали, для текста ошибки
 * @returns разобранный JSON-объект ответа
 * @throws {Error} статус не 2xx или тело — не объект JSON; в тексте — статус и начало тела
 */
const readJson = async (
  response: Response,
  action: string
): Promise<Record<string, unknown>> => {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${action}: HTTP ${response.status} ${text.slice(0, ERROR_BODY_LIMIT)}`
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${action}: ответ не JSON — ${text.slice(0, ERROR_BODY_LIMIT)}`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${action}: ответ не объект JSON`);
  }

  return parsed;
};

/**
 * @param fetchFn — `fetch`
 * @param key — ключ сервисного аккаунта
 * @param nowSeconds — текущее время в секундах
 * @returns access token с доступом к Chrome Web Store API
 * @throws {Error} Google отказал в токене
 */
const requestAccessToken = async (
  fetchFn: typeof fetch,
  key: ServiceAccountKey,
  nowSeconds: number
): Promise<string> => {
  const assertion = await createAssertion(key, nowSeconds);
  const response = await fetchFn(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await readJson(response, 'Токен сервисного аккаунта');
  const token = readString(body, 'access_token');

  if (!token) {
    throw new Error('Токен сервисного аккаунта: в ответе нет access_token');
  }

  return token;
};

/**
 * @param item — издатель и расширение
 * @returns путь ресурса расширения в API v2
 */
const itemPath = ({ publisherId, itemId }: StoreItem): string => {
  return `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(itemId)}`;
};

/**
 * Ревизия в сторе с этой версией — опубликованная или отправленная на проверку. Такую версию стор второй раз не
 * примет, а повторный прогон релиза (перезапуск упавшего job-а) не должен пытаться.
 *
 * @param status — ответ `fetchStatus`
 * @param version — версия пакета
 * @returns состояние ревизии с этой версией; `undefined` — версии в сторе нет
 */
export const findRevisionState = (
  status: Record<string, unknown>,
  version: string
): string | undefined => {
  const revisions = [
    status.submittedItemRevisionStatus,
    status.publishedItemRevisionStatus,
  ];

  for (const revision of revisions) {
    if (!isRecord(revision) || !Array.isArray(revision.distributionChannels)) {
      continue;
    }

    const hasVersion = revision.distributionChannels.some((channel) => {
      return isRecord(channel) && readString(channel, 'crxVersion') === version;
    });

    if (hasVersion) {
      return readString(revision, 'state') || UNSPECIFIED_STATE;
    }
  }

  return undefined;
};

/**
 * @param api — сеть, расширение и заголовок авторизации
 * @param action — что делали, для текста ошибки
 * @returns ответ `fetchStatus`
 */
const fetchItemStatus = async (
  { fetchFn, item, authorization }: StoreApi,
  action: string
): Promise<Record<string, unknown>> => {
  const response = await fetchFn(`${API_ORIGIN}/v2/${itemPath(item)}:fetchStatus`, {
    headers: { Authorization: authorization },
  });

  return readJson(response, action);
};

/**
 * Загрузка пакета. Стор может ответить, не закончив обработку, — тогда статус опрашивается через `fetchStatus`.
 *
 * @param api — сеть, расширение и заголовок авторизации
 * @param options — пакет, его версия и пауза между опросами
 * @throws {Error} загрузка не удалась, не закончилась за время опроса или стор прочитал не ту версию
 */
const uploadPackage = async (
  api: StoreApi,
  { zip, version, sleep }: Pick<PublishOptions, 'zip' | 'version' | 'sleep'>
): Promise<void> => {
  const { fetchFn, item, authorization } = api;
  const response = await fetchFn(`${API_ORIGIN}/upload/v2/${itemPath(item)}:upload`, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/zip' },
    body: zip,
  });
  const upload = await readJson(response, 'Загрузка пакета');
  let state = readString(upload, 'uploadState');

  /**
   * Первый проход разбирает ответ загрузки, каждый следующий — ответ очередного опроса, поэтому проходов на один
   * больше, чем опросов. Описание поля `uploadState` называет состояние обработки `UPLOAD_IN_PROGRESS`,
   * перечисление `UploadState` — `IN_PROGRESS`; принимаются оба.
   */
  for (let attempt = 0; attempt <= UPLOAD_POLL_ATTEMPTS; attempt += 1) {
    switch (state) {
      case 'SUCCEEDED': {
        /**
         * Версию прочитанного пакета сообщает только синхронный ответ `upload`: у загрузки, законченной через
         * опрос, `crxVersion` в нём нет, а `fetchStatus` версию черновика не отдаёт — тогда сверять не с чем.
         */
        const crxVersion = readString(upload, 'crxVersion');

        if (crxVersion && crxVersion !== version) {
          throw new Error(
            `Загрузка пакета: стор прочитал версию ${crxVersion}, а не ${version}`
          );
        }

        return;
      }

      case 'IN_PROGRESS':

      case 'UPLOAD_IN_PROGRESS': {
        if (attempt === UPLOAD_POLL_ATTEMPTS) {
          break;
        }

        await sleep(UPLOAD_POLL_INTERVAL_MS);
        state = readString(
          await fetchItemStatus(api, 'Статус загрузки'),
          'lastAsyncUploadState'
        );
        break;
      }

      default: {
        throw new Error(`Загрузка пакета: состояние ${state || 'не указано'}`);
      }
    }
  }

  throw new Error(
    `Загрузка пакета: стор не закончил обработку за ${(UPLOAD_POLL_ATTEMPTS * UPLOAD_POLL_INTERVAL_MS) / 1000} с`
  );
};

/**
 * Отправляет новую версию расширения в Chrome Web Store: загружает пакет и отправляет его на проверку с
 * публикацией по её итогу. Версия, которая уже есть в сторе, не загружается.
 *
 * @param options — ключ, издатель, расширение, пакет и окружение
 * @returns что сделано и состояние версии в сторе
 * @throws {Error} сбой входа, загрузки или отправки — с ответом API в тексте
 */
export const publishToChromeWebStore = async (
  options: PublishOptions
): Promise<PublishResult> => {
  const { fetchFn, serviceAccountKey, nowSeconds, publisherId, itemId, version } =
    options;
  const token = await requestAccessToken(
    fetchFn,
    readServiceAccountKey(serviceAccountKey),
    nowSeconds
  );
  const api: StoreApi = {
    fetchFn,
    item: { publisherId, itemId },
    authorization: `Bearer ${token}`,
  };
  const existingState = findRevisionState(
    await fetchItemStatus(api, 'Статус расширения'),
    version
  );

  if (existingState) {
    return { outcome: 'already-in-store', state: existingState };
  }

  await uploadPackage(api, options);

  const publishResponse = await fetchFn(
    `${API_ORIGIN}/v2/${itemPath(api.item)}:publish`,
    {
      method: 'POST',
      headers: { Authorization: api.authorization, 'Content-Type': 'application/json' },
      body: '{}',
    }
  );
  const published = await readJson(publishResponse, 'Отправка на проверку');

  return {
    outcome: 'submitted',
    state: readString(published, 'state') || UNSPECIFIED_STATE,
  };
};
