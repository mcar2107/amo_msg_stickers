import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createAssertion,
  findRevisionState,
  publishToChromeWebStore,
  readServiceAccountKey,
} from '@scripts/chromeWebStore';
import type { PublishOptions } from '@scripts/chromeWebStore.types';

import { fromBase64Url, mockResponse, privateKeyPem, routedFetch } from './helpers';

const ITEM = { publisherId: 'pub-1', itemId: 'abjnjphijggkkdbbmkldhibgepgdcgip' };

const ITEM_PATH = `publishers/${ITEM.publisherId}/items/${ITEM.itemId}`;

const UPLOAD_URL = `https://chromewebstore.googleapis.com/upload/v2/${ITEM_PATH}:upload`;

const STATUS_URL = `https://chromewebstore.googleapis.com/v2/${ITEM_PATH}:fetchStatus`;

const PUBLISH_URL = `https://chromewebstore.googleapis.com/v2/${ITEM_PATH}:publish`;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const NOW = 1_800_000_000;

/**
 * Пара ключей RS256 на весь файл: генерация RSA в Web Crypto занимает заметное время.
 */
let keyPair: CryptoKeyPair;

let serviceAccountKey: string;

/**
 * @param body — объект ответа
 * @param status — HTTP-статус
 * @returns ответ API с JSON-телом
 */
const json = (body: object, status = 200) => {
  return mockResponse(JSON.stringify(body), { status });
};

/**
 * @param fetchFn — мок `fetch`
 * @param overrides — поля, отличные от умолчаний
 * @returns параметры публикации версии 1.2.3
 */
const options = (
  fetchFn: typeof fetch,
  overrides: Partial<PublishOptions> = {}
): PublishOptions => {
  return {
    ...ITEM,
    serviceAccountKey,
    version: '1.2.3',
    zip: new Blob(['zip']),
    fetchFn,
    sleep: async () => {},
    nowSeconds: NOW,
    ...overrides,
  };
};

/**
 * @param fetchFn — мок `fetch`
 * @returns адреса вызовов по порядку
 */
const calledUrls = (fetchFn: ReturnType<typeof routedFetch>) => {
  return fetchFn.mock.calls.map(([input]) => {
    return String(input);
  });
};

beforeAll(async () => {
  keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
  serviceAccountKey = JSON.stringify({
    type: 'service_account',
    client_email: 'publisher@project.iam.gserviceaccount.com',
    private_key: privateKeyPem(
      await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    ),
  });
});

describe('readServiceAccountKey', () => {
  it('берёт почту и закрытый ключ', () => {
    expect(
      readServiceAccountKey('{"client_email":"a@b","private_key":"pem","x":1}')
    ).toEqual({ clientEmail: 'a@b', privateKey: 'pem' });
  });

  it.each([
    ['не JSON', '{', 'не JSON'],
    ['не объект', '[]', 'не объект'],
    ['без ключа', '{"client_email":"a@b"}', 'нет client_email или private_key'],
  ])('отклоняет %s', (_name, value, message) => {
    expect(() => {
      return readServiceAccountKey(value);
    }).toThrow(message);
  });

  it('не цитирует секрет в ошибке', () => {
    expect(() => {
      return readServiceAccountKey('{"private_key":"секрет"');
    }).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('секрет') })
    );
  });
});

describe('createAssertion', () => {
  it('подписывает JWT с областью Chrome Web Store, проверяемый открытым ключом', async () => {
    const assertion = await createAssertion(
      readServiceAccountKey(serviceAccountKey),
      NOW
    );
    const [header = '', payload = '', signature = ''] = assertion.split('.');
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      keyPair.publicKey,
      fromBase64Url(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    );

    expect(isValid).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(header)))).toEqual({
      alg: 'RS256',
      typ: 'JWT',
    });
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))).toEqual({
      iss: 'publisher@project.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/chromewebstore',
      aud: TOKEN_URL,
      iat: NOW,
      exp: NOW + 3600,
    });
  });

  it('отклоняет ключ без блока PRIVATE KEY', async () => {
    await expect(
      createAssertion({ clientEmail: 'a@b', privateKey: 'not a pem' }, NOW)
    ).rejects.toThrow('PRIVATE KEY');
  });
});

describe('findRevisionState', () => {
  const revision = (state: string, crxVersion: string) => {
    return { state, distributionChannels: [{ deployPercentage: 100, crxVersion }] };
  };

  it('находит версию на проверке', () => {
    expect(
      findRevisionState(
        {
          publishedItemRevisionStatus: revision('PUBLISHED', '1.2.2'),
          submittedItemRevisionStatus: revision('PENDING_REVIEW', '1.2.3'),
        },
        '1.2.3'
      )
    ).toBe('PENDING_REVIEW');
  });

  it('находит опубликованную версию', () => {
    expect(
      findRevisionState(
        { publishedItemRevisionStatus: revision('PUBLISHED', '1.2.3') },
        '1.2.3'
      )
    ).toBe('PUBLISHED');
  });

  it('другой версии и пустого статуса нет', () => {
    expect(
      findRevisionState(
        { publishedItemRevisionStatus: revision('PUBLISHED', '1.2.2') },
        '1.2.3'
      )
    ).toBeUndefined();
    expect(findRevisionState({}, '1.2.3')).toBeUndefined();
  });
});

describe('publishToChromeWebStore', () => {
  it('загружает пакет и отправляет на проверку', async () => {
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [json({ publishedItemRevisionStatus: { state: 'PUBLISHED' } })],
      [UPLOAD_URL]: [json({ uploadState: 'SUCCEEDED', crxVersion: '1.2.3' })],
      [PUBLISH_URL]: [json({ state: 'PENDING_REVIEW' })],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).resolves.toEqual({
      outcome: 'submitted',
      state: 'PENDING_REVIEW',
    });
    expect(calledUrls(fetchFn)).toEqual([TOKEN_URL, STATUS_URL, UPLOAD_URL, PUBLISH_URL]);

    const uploadInit = fetchFn.mock.calls[2]?.[1];

    expect(uploadInit?.method).toBe('POST');
    expect(uploadInit?.headers).toMatchObject({ Authorization: 'Bearer token-1' });

    const tokenBody = new URLSearchParams(String(fetchFn.mock.calls[0]?.[1]?.body));

    expect(tokenBody.get('grant_type')).toBe(
      'urn:ietf:params:oauth:grant-type:jwt-bearer'
    );
  });

  it('не загружает версию, которая уже в сторе', async () => {
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [
        json({
          submittedItemRevisionStatus: {
            state: 'PENDING_REVIEW',
            distributionChannels: [{ crxVersion: '1.2.3' }],
          },
        }),
      ],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).resolves.toEqual({
      outcome: 'already-in-store',
      state: 'PENDING_REVIEW',
    });
    expect(calledUrls(fetchFn)).toEqual([TOKEN_URL, STATUS_URL]);
  });

  it('опрашивает статус, пока стор обрабатывает загрузку', async () => {
    const sleep = vi.fn(async () => {});
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [
        json({}),
        json({ lastAsyncUploadState: 'IN_PROGRESS' }),
        json({ lastAsyncUploadState: 'SUCCEEDED' }),
      ],
      [UPLOAD_URL]: [json({ uploadState: 'UPLOAD_IN_PROGRESS' })],
      [PUBLISH_URL]: [json({ state: 'PENDING_REVIEW' })],
    });

    await expect(
      publishToChromeWebStore(options(fetchFn, { sleep }))
    ).resolves.toMatchObject({
      outcome: 'submitted',
    });
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('сдаётся, если загрузка не закончилась за 24 опроса', async () => {
    const inProgress = Array.from({ length: 24 }, () => {
      return json({ lastAsyncUploadState: 'IN_PROGRESS' });
    });
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [json({}), ...inProgress],
      [UPLOAD_URL]: [json({ uploadState: 'IN_PROGRESS' })],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).rejects.toThrow(
      'не закончил обработку за 120 с'
    );
    expect(calledUrls(fetchFn)).not.toContain(PUBLISH_URL);
  });

  it('последний опрос с успехом засчитывается', async () => {
    const inProgress = Array.from({ length: 23 }, () => {
      return json({ lastAsyncUploadState: 'IN_PROGRESS' });
    });
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [
        json({}),
        ...inProgress,
        json({ lastAsyncUploadState: 'SUCCEEDED' }),
      ],
      [UPLOAD_URL]: [json({ uploadState: 'IN_PROGRESS' })],
      [PUBLISH_URL]: [json({ state: 'PENDING_REVIEW' })],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).resolves.toMatchObject({
      outcome: 'submitted',
    });
  });

  it('не отправляет на проверку после неудачной загрузки', async () => {
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [json({})],
      [UPLOAD_URL]: [json({ uploadState: 'FAILED' })],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).rejects.toThrow(
      'Загрузка пакета: состояние FAILED'
    );
    expect(calledUrls(fetchFn)).not.toContain(PUBLISH_URL);
  });

  it('отклоняет пакет, в котором стор прочитал другую версию', async () => {
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [json({})],
      [UPLOAD_URL]: [json({ uploadState: 'SUCCEEDED', crxVersion: '1.2.2' })],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).rejects.toThrow(
      'стор прочитал версию 1.2.2, а не 1.2.3'
    );
  });

  it('показывает статус и тело отказа API', async () => {
    const fetchFn = routedFetch({
      [TOKEN_URL]: [json({ access_token: 'token-1' })],
      [STATUS_URL]: [json({})],
      [UPLOAD_URL]: [json({ error: { message: 'version must be greater' } }, 400)],
    });

    await expect(publishToChromeWebStore(options(fetchFn))).rejects.toThrow(
      /Загрузка пакета: HTTP 400 .*version must be greater/
    );
  });

  it('падает без access_token в ответе Google', async () => {
    const fetchFn = routedFetch({ [TOKEN_URL]: [json({})] });

    await expect(publishToChromeWebStore(options(fetchFn))).rejects.toThrow(
      'нет access_token'
    );
  });
});
