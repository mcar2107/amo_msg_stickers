## 1. Сетевая политика и лимит загрузки

- [x] 1.1 `src/core/net.ts`: `isAllowedUrl` (https, хост `api.telegram.org` точно, `giphy.com` / `klipy.com` с поддоменами, разбор через `URL`) и `readLimited(stream, maxBytes)` с `reader.cancel()` при превышении; проверка — `tests/net.test.ts`: разрешённые хосты, `http:`, `giphy.com.evil.example`, `evilgiphy.com`, `https://api.telegram.org@evil.example/`, битый URL; поток меньше, равный и больше лимита, отмена источника при превышении
- [x] 1.2 Контракт `Host` (`host.types.ts`): `fetchJson(url): Promise<unknown>`, `fetchBlob(url, maxBytes)`; `FetchRequest.maxBytes` в `messages.types.ts`; проверка — `pnpm typecheck` проходит, в `src/extension/content.ts` и `src/userscript/index.ts` нет `as T`
- [x] 1.3 Service worker: политика до `fetch` и по `res.url` после, проверка `sender.id === chrome.runtime.id` и `sender.tab`, `Content-Length` + `readLimited`; проверка — `tests/background.test.ts` с заглушкой `chrome`: чужой хост → `ok: false` без вызова `fetch`, редирект на чужой хост → `ok: false`, чужой `sender.id` или сообщение без `tab` → слушатель возвращает `false`, тело больше лимита → «Файл больше N МБ»
- [x] 1.4 Userscript: та же политика и лимит через общие `fetchChecked` / `readResponseLimited` из `core/net.ts`; проверка — `tests/net.test.ts`: чужой хост не вызывает `fetch`, редирект на чужой хост и превышение лимита → ошибка (сам `userscript/index.ts` при импорте запускает `start()` и в Node не тестируется)

## 2. Проверка ответов источников

- [x] 2.1 Гарды `isGiphyResponse`, `isTenorResponse` в `gifs.types.ts`; `gifs.ts` отбрасывает элементы без рендишна и со ссылками вне политики, убраны `!` у `images.original` и `formats.gif`; проверка — `tests/gifs.test.ts` (фейковый `Host`): битый ответ → ошибка «GIPHY: неожиданный ответ» / «KLIPY: неожиданный ответ», элемент без рендишна и элемент с чужим хостом отброшены, корректные элементы нормализованы как раньше
- [x] 2.2 Гарды `isTgResponse`, `isTgStickerSet`, `isTgSticker`, `isTgFile` в `telegram.types.ts`; `telegram.ts` проверяет каждый ответ, `file_path` — по `^(?!.*\.\.)[\w-][\w./-]{0,199}$`, файл стикера скачивается с лимитом 5 МБ; проверка — `tests/telegram.test.ts` (фейковый `Host`, `vi.mock` для `convert` и `db`): `file_path` с `..` не приводит к `fetchBlob`, импорт остальных продолжается; битый `getStickerSet` → ошибка без `putPack`; стикер без `file_unique_id` пропущен, прогресс доходит до N/N; `fetchBlob` вызывается с лимитом 5 МБ

## 3. Файлы: .tgs и GIF

- [x] 3.1 `src/core/tgs.ts`: `readTgs(blob)` — gzip потоком через `readLimited` (8 МБ), `JSON.parse`, расширенный `isLottieJson` (`w`, `h`, `ip`, `op`, `layers`, необязательный `fr` с границами); `convert.ts` использует его; проверка — `tests/tgs.test.ts` (`CompressionStream` в Node): корректный Lottie принят, Lottie без `fr` принят, gzip на 50 МБ нулей → ошибка до выделения 50 МБ, `{"w":512,"h":512}` → «Файл .tgs не похож на Lottie-анимацию», `w: 0`, `fr: 1000`, `op <= ip` отклонены, не-gzip → ошибка
- [x] 3.2 `src/core/gif.ts`: `inspectGif(bytes)` (порт из референса в стиле проекта); проверка — `tests/gif.test.ts`: GIF из `gifenc` (статичный и 3 кадра) → верные размеры и число кадров, PNG-сигнатура → `null`, HTML → `null`, обрезанный до конца первого кадра → `null`, без trailer → принят
- [x] 3.3 `sender.ts`: `toCheckedGifFile(blob, name)` рядом с `toGifFile` — `inspectGif` по байтам, иначе `SendError('Файл не похож на GIF')`; `app.ts` скачивает GIF из поиска с лимитом 8 МБ и отдаёт его в эту функцию; проверка — `tests/sender.test.ts`: HTML и обрезанный GIF → `SendError` с этим текстом, корректный GIF → `File` типа `image/gif` с исходными байтами

## 4. Сборка без dev-адресов

- [x] 4.1 `manifest.json` без `localhost` / `127.0.0.1`; `build.mjs` в `--watch` добавляет их в `content_scripts[0].matches` и `@match http://localhost:3000/*` в заголовок userscript, `manifest.json` пишется в `dist` через `writeFileSync`; проверка — после `pnpm build` `grep -c 'localhost\|127.0.0.1' dist/extension/manifest.json dist/amo-stickers.user.js` даёт 0 и 0; после `pnpm watch` (остановить после первой сборки) manifest в `dist` содержит оба адреса

## 5. Версия, документация, приёмка

- [x] 5.1 Версия 0.3.0 в `package.json`, `src/extension/manifest.json` и `@version` в `build.mjs`; проверка — `grep -n '0\.3\.0'` находит все три места, `grep -rn '0\.2\.0' package.json src/extension/manifest.json build.mjs` пуст
- [x] 5.2 `CLAUDE.md`: новые модули `net.ts`, `gif.ts`, `tgs.ts` в «Структуре», сетевая политика и лимиты в «Как работает», `localhost` только в `pnpm watch`; проверка — `grep -n 'net.ts\|gif.ts\|tgs.ts\|localhost' CLAUDE.md` находит новые строки, описание совпадает с кодом
- [x] 5.3 `pnpm lint`, `pnpm test`, `pnpm build` зелёные; в `dist/extension/content.js` по-прежнему нет `eval(` и `new Function(`; проверка — вывод команд приложен к PR
- [x] 5.4 Стенд `dev/harness.html` с userscript-сборкой: отправка своего стикера по-прежнему работает, импорт `.tgs` через «Добавить» даёт анимацию; проверка — скриншот стенда
