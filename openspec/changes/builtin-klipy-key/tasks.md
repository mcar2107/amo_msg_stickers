## 1. Сборка

- [x] 1.1 `scripts/klipyKey.ts`: `readKlipyKey(value)` — пусто/`undefined` → `''`, обрезка пробелов и переводов строки,
  не `^[\w-]+$` → `Error` о формате без значения; `tests/klipyKey.test.ts` покрывает пустое значение, валидный ключ,
  ключ с `\n` по краям и битые значения (пробел внутри, кавычка) — текст ошибки их не содержит; `pnpm test` зелёный
- [x] 1.2 `build.mjs`: `readKlipyKey(process.env.KLIPY_API_KEY)` до сборки, `common.define` `__KLIPY_API_KEY__`, строка
  «встроенный ключ KLIPY: есть / нет» без значения; `src/types.d.ts` — `declare const`, `vitest.config.ts` — `define`
  пустой строкой. Проверка: `pnpm build` без переменной проходит; `KLIPY_API_KEY=abcXYZ123 pnpm build` —
  `rg -c abcXYZ123 dist/extension/content.js dist/amo-stickers.user.js` находит ключ, в `dist/extension/background.js` и
  `page.js` его нет; `KLIPY_API_KEY='a b' pnpm build` падает, значения в выводе нет

## 2. Ядро

- [x] 2.1 `src/core/builtinKlipyKey.ts` (`BUILTIN_KLIPY_KEY`) — единственный читатель `__KLIPY_API_KEY__`;
  `pnpm typecheck` зелёный
- [x] 2.2 `sources/gifs.ts`: ключ KLIPY — свой или встроенный, для `availableFeeds` и `fetchGifs`; на встроенном ключе
  статусы `KEY_REJECT_STATUSES.klipy` и 429 → `error.gifs.builtinUnavailable`, прочие ошибки как есть; ключ словаря
  парой в `messages.ru.ts` / `messages.en.ts` (typograf, `en-US` у английского). Тесты с `vi.mock` модуля встроенного
  ключа: `availableFeeds` без своих ключей со встроенным — `['klipy']`, без встроенного — `[]`, со своим GIPHY и
  встроенным — все три; запрос без своего ключа идёт со встроенным, свой важнее встроенного; 401, 403, 404, 429 на
  встроенном — ошибка недоступности; 404 на своём — `HTTP 404 …`; 500 и сетевая ошибка на встроенном — как есть

## 3. Настройки

- [x] 3.1 `SettingsView/klipyKeyText/`: подпись (ключ словаря или `null` для литерала «KLIPY API key»), подсказка
  поля и пояснение группы «GIF» по `BUILTIN_KLIPY_KEY` — `settings.klipy.labelOptional`,
  `settings.klipy.whereOptional`, `settings.gif.builtinNote` со встроенным, прежние без него; ключи парой RU/EN
  (typograf); тест чистой функции на оба исхода. Проверка на стенде `dev/harness.html` со сборкой `pnpm watch` с
  `KLIPY_API_KEY` и без (при пустом `KLIPY_KEY` в `.env`): поле KLIPY пустое, подпись, подсказка и пояснение группы
  соответствуют на обоих языках; после ухода из поля и «Назад» `klipyKey` в хранилище пуст

## 4. Стенд

- [x] 4.1 Стенд со сборкой `KLIPY_API_KEY=<продовый или тестовый ключ> pnpm watch` и пустыми ключами в `.env`: режим
  «GIF» показывает тренды KLIPY и ищет, переключателя источников нет, «Powered by KLIPY» под лентой; ключ GIPHY в
  «Настройках» добавляет переключатель из трёх источников; свой неверный ключ KLIPY даёт «GIF: HTTP 404 …»; со
  встроенным неверным ключом (`KLIPY_API_KEY=bad`) — ошибка недоступности встроенного ключа в статусе и на пустой ленте

## 5. CI

- [x] 5.1 `ci.yml`: `KLIPY_API_KEY` в `workflow_call.secrets` и `env` шага `pnpm build`; `release.yml`: явная передача
  секрета у вызова `ci.yml`. Проверка: прогон PR зелёный, в логе сборки строка о встроенном ключе без значения

## 6. Дока

- [x] 6.1 `docs/content/setup/gif-keys.md` и `en/setup/gif-keys.md` по требованию «Настройка ключей GIF»: поиск KLIPY
  без ключа первым, свои ключи необязательны с причиной у каждого, шаги получения и лимиты своих ключей сохранены;
  `pnpm docs:build` проходит, `tests/userDocsPages.test.ts` зелёный
- [x] 6.2 `privacy.md` (оба языка) по требованию «Политика конфиденциальности»; `index.md` и `faq.md` (оба языка) не
  требуют ключа для поиска KLIPY, ответ про лимит — о своём ключе; `README.md` — без обязательного ключа; прочие
  упоминания «ключи GIF» (`update.md`, `install/*`, `_parts/*`) сверены — верны для своих ключей; `pnpm docs:build`
  проходит
- [x] 6.3 `CLAUDE.md`: встроенный ключ KLIPY в «Стек и сборка» (переменная, `define`, проверка, модуль-читатель),
  «CI и релизы» (секрет), «Внешние данные» (свой или встроенный ключ, отказ встроенного), структура (`builtinKlipyKey.ts`,
  `scripts/klipyKey.ts`)

## 7. Проверка

- [x] 7.1 `pnpm lint` и `pnpm test` зелёные; кириллица вне комментариев в `src/` — только в `messages.ru.ts`,
  `_locales/ru/` и исключениях `CLAUDE.md`; `openspec validate builtin-klipy-key` проходит
