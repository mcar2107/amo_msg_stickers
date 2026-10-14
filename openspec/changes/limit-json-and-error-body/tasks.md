## 1. Ядро

- [x] 1.1 `core/net.ts`: `MAX_JSON_BYTES`, `readPrefix(stream, maxBytes)`, `readJson(res)`; `fetchChecked` читает тело ошибки через `readPrefix` не больше `ERROR_BODY_PREVIEW * 4` байт. Тесты в `tests/net.test.ts`: `readJson` разбирает JSON и обрывает ответ больше лимита (с `Content-Length` и без), `fetchChecked` на не-2xx с огромным телом отменяет поток после префикса и даёт текст из 200 символов, многобайтный текст не режется посреди символа — `pnpm test` зелёный

## 2. Окружения

- [x] 2.1 `extension/background.ts`: ветка `json` через `readJson`. Тест в `tests/background.test.ts`: JSON больше лимита — отказ с ключом `error.net.tooBig` и `size: 2` — `pnpm test` зелёный
- [x] 2.2 `userscript/fetchNetwork.ts`: `fetchJson` через `readJson`. Новый `tests/fetchNetwork.test.ts`: JSON разобран, JSON больше лимита — «Файл больше 2 МБ» — `pnpm test` зелёный
- [x] 2.3 `userscript/gmNetwork.ts`: лимит JSON вместо `NO_LIMIT`, размер текстового тела на `onload` в байтах UTF-8, обрыв тела не-2xx в `onprogress` после 800 байт. Тесты в `tests/gmNetwork.test.ts`: JSON больше лимита по `Content-Length`, по `onprogress`, только на `onload`; не-2xx с телом больше 800 байт обрывается в `onprogress` с HTTP-ошибкой — `pnpm test` зелёный

## 3. Документация

- [x] 3.1 `CLAUDE.md`, «Внешние данные»: лимит JSON и ограниченное чтение тела ошибки — проверка чтением диффа

## 4. Проверка

- [ ] 4.1 `pnpm lint`, `pnpm test`, `pnpm build` зелёные; на стенде (`pnpm harness`) поиск GIPHY и KLIPY и импорт пака Telegram работают
