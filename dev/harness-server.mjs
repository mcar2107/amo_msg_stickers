/**
 * Сервер стенда `dev/harness.html`: отдаёт файлы репозитория и подмешивает в стенд настройки
 * из `.env` (`GIPHY_KEY`, `KLIPY_KEY`, `TELEGRAM_BOT_TOKEN`) и прокси файлов Telegram.
 *
 * Запуск — `pnpm harness`, адрес — http://127.0.0.1:8777/dev/harness.html, порт меняет
 * переменная `PORT`. Сервер слушает только 127.0.0.1 и отвечает только на свой адрес в `Host`:
 * ключи из `.env` не уходят ни в сеть, ни чужой странице через DNS rebinding.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8777;
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
const HARNESS_PATH = '/dev/harness.html';
const PROXY_PATH = '/__proxy';
const SETTINGS_KEY = 'amo-stickers:settings';
const TELEGRAM_HOST = 'api.telegram.org';
const TELEGRAM_FILE_PREFIX = '/file/';
const NO_STORE = 'no-store';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};
const DEFAULT_MIME = 'application/octet-stream';

/**
 * Переменные `.env` строками. Кавычки вокруг значения снимаются, как у dotenv; файла нет —
 * пустой объект, и стенд открывается без ключей.
 *
 * @returns переменные по именам
 */
const readEnv = () => {
  const envPath = join(ROOT, '.env');

  if (!existsSync(envPath)) return {};

  return readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((env, line) => {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);

      if (match) {
        const [, key, value] = match;

        env[key] = value.replace(/^(['"])(.*)\1$/, '$2');
      }

      return env;
    }, {});
};

/**
 * Файлы стикеров Telegram отдаются без CORS-заголовков, а userscript без менеджера ходит прямым
 * `fetch` со страницы, и скачивание пака падает на `Failed to fetch`. Менеджер и расширение
 * ходят в обход CORS сами, поэтому на стенде их роль играет прокси сервера: `fetch` файлов
 * подменяется, а `url` ответа остаётся исходным — ядро проверяет итоговый адрес по сетевой
 * политике.
 */
const PROXY_SHIM = `
(function(){
  var FILE_PREFIX = 'https://${TELEGRAM_HOST}${TELEGRAM_FILE_PREFIX}';
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    var url = typeof input === 'string' ? input : input && input.url;
    if (!url || url.indexOf(FILE_PREFIX) !== 0) { return nativeFetch(input, init); }
    return nativeFetch('${PROXY_PATH}?u=' + encodeURIComponent(url), init && init.signal ? {signal: init.signal} : undefined)
      .then(function(response){
        Object.defineProperty(response, 'url', {value: url});
        return response;
      });
  };
})();
`;

/**
 * Скрипт в начало `<head>` стенда: настройки из `.env` в `localStorage` — хранилище
 * userscript без менеджера — и прокси файлов Telegram. `.env` читается на каждый запрос стенда:
 * правка ключа видна после перезагрузки страницы, без перезапуска сервера.
 *
 * @returns разметка `<script>`
 */
const buildSeed = () => {
  const env = readEnv();
  const settings = {
    giphyKey: env.GIPHY_KEY || '',
    klipyKey: env.KLIPY_KEY || '',
    telegramToken: env.TELEGRAM_BOT_TOKEN || '',
  };
  const seed = JSON.stringify(JSON.stringify(settings));

  return `<script>try{localStorage.setItem(${JSON.stringify(SETTINGS_KEY)},${seed});}catch(e){}${PROXY_SHIM}</script>`;
};

/**
 * Проксирует только файлы Telegram. Адрес проверяется разобранным `URL`, а не строкой:
 * `/file/../bot<токен>/<метод>` схлопнулся бы в вызов Bot API.
 *
 * @param target — адрес файла из параметра `u`
 * @param res — ответ сервера
 */
const proxyTelegramFile = async (target, res) => {
  const url = URL.canParse(target) ? new URL(target) : null;
  const isTelegramFile =
    url?.protocol === 'https:' &&
    url.host === TELEGRAM_HOST &&
    url.pathname.startsWith(TELEGRAM_FILE_PREFIX);

  if (!isTelegramFile) {
    res.writeHead(403).end('forbidden');

    return;
  }

  const upstream = await fetch(url);

  res.writeHead(upstream.status, {
    'content-type': upstream.headers.get('content-type') || DEFAULT_MIME,
    'cache-control': NO_STORE,
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
};

/**
 * Файл репозитория по пути запроса. Путь вне корня и путь со скрытым сегментом (`.env`,
 * `.git`) не отдаются: в `.env` лежат ключи.
 *
 * @param pathname — путь запроса
 * @returns абсолютный путь файла; `null` — отдавать нечего
 */
const resolveFile = (pathname) => {
  const file = normalize(join(ROOT, pathname));
  const isInside = file.startsWith(ROOT + sep);
  const isHidden = pathname.split('/').some((segment) => {
    return segment.startsWith('.');
  });

  if (!isInside || isHidden || !existsSync(file) || !statSync(file).isFile()) return null;

  return file;
};

/**
 * Путь запроса без процентного кодирования; битое кодирование — `null`.
 *
 * @param pathname — путь из URL запроса
 * @returns декодированный путь
 */
const decodePath = (pathname) => {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
};

createServer(async (req, res) => {
  if (!ALLOWED_HOSTS.has(req.headers.host || '')) {
    res.writeHead(421).end('misdirected request');

    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${HOST}`);

  if (requestUrl.pathname === PROXY_PATH) {
    await proxyTelegramFile(requestUrl.searchParams.get('u') || '', res).catch(() => {
      res.writeHead(502).end('bad gateway');
    });

    return;
  }

  const pathname = decodePath(requestUrl.pathname);
  const file = pathname && resolveFile(pathname);

  if (!file) {
    res.writeHead(404).end('not found');

    return;
  }

  const headers = {
    'content-type': MIME[extname(file)] || DEFAULT_MIME,
    'cache-control': NO_STORE,
  };

  if (pathname === HARNESS_PATH) {
    const html = readFileSync(file, 'utf8').replace('<head>', `<head>${buildSeed()}`);

    res.writeHead(200, headers).end(html);

    return;
  }

  res.writeHead(200, headers).end(readFileSync(file));
}).listen(PORT, HOST, () => {
  console.info(`harness: http://${HOST}:${PORT}${HARNESS_PATH}`);
});
