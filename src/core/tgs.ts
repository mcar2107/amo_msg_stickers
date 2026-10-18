import { isLottieJson } from './convert.types';
import type { MessageKey } from './i18n';
import { t } from './i18n';
import { BYTES_IN_MB, readLimited } from './net';

/**
 * `.tgs` — gzip-сжатый Lottie JSON. У стикеров Telegram это сотни КБ JSON, а сжатый файл
 * в 50 КБ может развернуться в гигабайты: распаковку ограничиваем.
 */
const MAX_TGS_JSON_BYTES = 8 * BYTES_IN_MB;

const NOT_LOTTIE = 'error.tgs.notLottie' satisfies MessageKey;

/**
 * Битый gzip распаковщик отдаёт `TypeError` с текстом браузера, а пикер показывает текст
 * ошибки как есть — подменяем его своим. Ошибка лимита — обычный `Error`, она проходит
 * без изменений.
 *
 * @param stream — распакованный поток `.tgs`
 * @returns байты JSON
 */
const readUnzipped = async (stream: ReadableStream<Uint8Array>) => {
  try {
    return await readLimited(stream, MAX_TGS_JSON_BYTES);
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error(t('error.tgs.broken'), { cause: error });
    throw error;
  }
};

/**
 * Распаковывает `.tgs` и проверяет, что внутри Lottie, пригодный для раскадровки. Больше
 * лимита, не gzip, не JSON или не Lottie — исключение; рендер при этом не запускается.
 *
 * @param blob — файл `.tgs`
 * @returns Lottie JSON
 */
export const readTgs = async (blob: Blob) => {
  const bytes = await readUnzipped(
    blob.stream().pipeThrough(new DecompressionStream('gzip'))
  );
  let json: unknown;

  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(t(NOT_LOTTIE));
  }

  if (!isLottieJson(json)) throw new Error(t(NOT_LOTTIE));

  return json;
};
