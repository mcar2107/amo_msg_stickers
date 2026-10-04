## 1. Сборка

- [x] 1.1 `scripts/telegramToken.ts`: `readTelegramToken(value)` — пусто/`undefined` → `''`, обрезка пробелов и
  переводов строки, не `^\d+:[\w-]+$` → `Error` о формате без значения; `tests/telegramToken.test.ts` покрывает пустое
  значение, валидный токен, токен с `\n` и битое значение (текст ошибки не содержит его) — `pnpm test` зелёный
- [x] 1.2 `build.mjs`: `readTelegramToken(process.env.TELEGRAM_BOT_TOKEN)` до сборки, `common.define`
  `__TELEGRAM_BOT_TOKEN__`, строка «встроенный токен Telegram: есть / нет» без значения; `src/types.d.ts` — `declare
  const`, `vitest.config.ts` — `define` пустой строкой. Проверка: `pnpm build` без переменной проходит;
  `TELEGRAM_BOT_TOKEN=123:abc pnpm build` — `rg -c '123:abc' dist/extension/content.js dist/amo-stickers.user.js`
  находит токен, а в `dist/extension/background.js` и `page.js` его нет; `TELEGRAM_BOT_TOKEN=bad pnpm build` падает, и
  `bad` в выводе нет

## 2. Ядро

- [x] 2.1 `src/core/builtinToken.ts` (`BUILTIN_TELEGRAM_TOKEN`) — единственный читатель `__TELEGRAM_BOT_TOKEN__`;
  `pnpm typecheck` зелёный
- [x] 2.2 `core/net.ts`: `httpStatus(error)` — разбор формата `httpError`; тест в `tests/net.test.ts`: статус из
  `httpError(401, …)`, `null` для `Error` без префикса и не-`Error`
- [x] 2.3 `sources/telegram.ts`: токен — свой или встроенный, `noToken` только без обоих; на встроенном токене 401/429
  от `call` и скачивания файла → `error.telegram.builtinUnavailable`, прочие ошибки как есть; ключ парой в
  `messages.ru.ts` / `messages.en.ts` (typograf). Тесты в `tests/telegram.test.ts` с `vi.mock` модуля встроенного токена:
  импорт без своего токена идёт со встроенным, свой важнее встроенного, без обоих — `noToken` без запросов, 401 и 429 на
  встроенном — ошибка недоступности, 401 на своём — текст ответа, 400 на встроенном — текст ответа, отказ `getFile` на
  всех стикерах — ошибка недоступности в статусе

## 3. Настройки

- [x] 3.1 `SettingsView`: подпись и подсказка поля токена по `BUILTIN_TELEGRAM_TOKEN` — `settings.telegram.labelOptional`
  и `settings.telegram.hintOptional` (ссылки на @BotFather и доку) при встроенном, прежние без него; ключи парой RU/EN
  (typograf, `en-US` у английского). Проверка: стенд `dev/harness.html` со сборкой `pnpm watch` с переменной и без — поле
  пустое, подсказка соответствующая на обоих языках; после «Сохранить» `telegramToken` в хранилище пуст

## 4. CI

- [x] 4.1 `ci.yml`: `env: TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}` у шага `pnpm build`; `release.yml`:
  `secrets: inherit` у вызова `ci.yml`. Проверка: прогон PR зелёный, в логе сборки строка о встроенном токене без
  значения

## 5. Дока и описания

- [x] 5.1 `docs/content/setup/telegram.md` и `en/setup/telegram.md`: импорт без настройки первым, свой бот —
  необязательный раздел с причиной (ошибка «встроенный бот недоступен») и предупреждением о секрете; `pnpm docs:build`
  проходит, `tests/userDocsPages.test.ts` зелёный
- [x] 5.2 `privacy.md` (оба языка) по требованию «Политика конфиденциальности»; `index.md` и `faq.md` (оба языка) не
  требуют токена для импорта; прочие упоминания «ключи GIF и токен бота» сверены — верны для своего токена;
  `pnpm docs:build` проходит
- [x] 5.3 `CLAUDE.md`: встроенный токен в «Стек и сборка» (переменная, `define`, проверка формата), «CI и релизы»
  (секрет, `secrets: inherit`), «Внешние данные» / «Окружения» (свой или встроенный токен, отказ встроенного бота)

## 6. Версия и проверка

- [x] 6.1 Версия 0.18.0 в `package.json`, `src/extension/manifest.json` и `@version` в `build.mjs`;
  `node scripts/check-version.mjs --base origin/master` проходит
- [x] 6.2 `pnpm lint` и `pnpm test` зелёные; кириллица вне комментариев в `src/` — только в `messages.ru.ts`,
  `_locales/ru/` и исключениях `CLAUDE.md`
