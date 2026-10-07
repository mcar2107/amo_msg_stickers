# План прогона: screens-forms-ux

База прогона: `03ff8ef5d8f9bdba080e795858a8e886a999c3dd`
База дополнения (G9–G12): `b2c553bd0c0ec45cc675a4b9570cf90118bd8db3`
Гейт: `pnpm lint && pnpm test`
Быстрые проверки: `pnpm typecheck`, `pnpm exec vitest --project=unit --run tests/<файл>.test.ts`
Долгие слои: стенд `dev/harness.html` в headless Chrome (CLAUDE.local.md) — G3, G4, G5, G6, G7, G8, G11, G12; `pnpm docs:build` — G8, G12
Хук коммита: typecheck + `vitest --changed` — каждая группа оставляет типы зелёными, временных поломок между группами нет.

## Контракты

- **K1 AddSegment** — `type AddSegment = 'telegram' | 'custom'` в `usePickerView/usePickerView.types.ts`. Владелец G1; потребители G4, G5.
- **K2 Цель ошибки импорта** — `importErrorTarget(screen: PickerScreen | null, segment: AddSegment): 'field' | 'status'` в
  `PickerProvider/finishImport/`; `'field'` только при `screen === 'add'` и `segment === 'telegram'`. Владелец G1; потребитель G5.
- **K3 Признак инструкции** — `readHintSeen(storage)` / `writeHintSeen(storage)` из `core/importHint.ts`, ключ
  `amo-stickers:import-hint-seen`. Владелец G1; потребитель G5.
- **K4 Проверки** — `checkGifKey(host, provider, key): Promise<'ok' | 'rejected' | 'unavailable'>` и константа статусов отказа
  рядом с ней; `isBotTokenFormat(token): boolean` в `sources/telegram.ts`. Владелец G1; потребитель G7 (8.4 может дополнить константу).
- **K5 Словарь** — все ключи D10 заводит G2 парой RU/EN; позже ключ добавляется только если G2 его упустил, в блок префикса
  своей группы. `settings.save` удаляет G7 (последнее использование), прочие неиспользуемые ключи — G8.
- **K6 Screen** — `Screen` с `title`, `footer` (и доступом футера к `leave()` для «Готово»); экран рендерят сами `AddView` /
  `SettingsView`, а не `Picker.tsx`; высота футера — константа, общая с `StatusBar isRaised`. Владелец G3; потребители G4, G7.
- **K7 Field** — `Field/`: `<label htmlFor>`, подсказка / ошибка / результат проверки — id в `describedBy`, `isInvalid` →
  `aria-invalid`, вариант скрытого значения с «Показать» / «Скрыть» (`aria-pressed`). Владелец G3; потребители G5, G6, G7.
- **K8 Формы** — `Button` с `type` / `form`; `<form id onSubmit>` с `preventDefault`, кнопка футера `type="submit" form={id}`.
  Итог 1.2 — в журнал; при отказе — футер внутри `<form>` (запасной D3), Screen и K8 меняет G3. Владелец G3 (Button, решение),
  G4 (формы сегментов в `AddView`, панели получают `isActive`); потребители G5, G6, G7.
- **K9 Черновик стикера** — `useStickerDraft` отдаёт `isConverting` и `saveBlock: 'noFile' | 'converting' | null`, хук вызывает
  `AddView`, панель получает состояние пропсами. Владелец G4; потребитель G6.

- **K10 Набор пака** — `resolveTelegramSet(host, ownToken, name)` (`getStickerSet`, выбор токена, `guardBuiltin`),
  `importTelegramSet(host, ownToken, set, onProgress, signal?)` без `getStickerSet`, `previewOutcome(error)` — «пак не найден»
  (HTTP 400 / `ok: false`) или «без превью», всё в `sources/telegram.ts`. Владелец G9; потребитель G10.
- **K11 Кэш превью** — чистый `PickerProvider/packPreview/`: `Map<имя, Promise<набор>>` (отклонённый удаляется) и номер
  запроса; превью и импорт `usePackImport` получают набор только через него. Владелец G9; потребитель G10.
- **K12 Отмена** — `signal` идёт `importTelegramSet` → `toStickerGif(blob, kind, { signal })` → `encodeLadder` / `writeFrames`;
  отмена бросает `signal.reason` после отката; `runPackImport` отличает её по `signal.aborted` → `onCancel`. Владелец G9 (ядро),
  G10 (`runPackImport`); потребители G10, G11.
- **K13 Импорт для UI** — `useTelegramImport` отдаёт превью (загрузка / набор с «уже в библиотеке» / нет), снимок
  `{ title, total }`, `progress`, `cancelImport`; «пак не найден» — через `fieldError`. Владелец G10; потребитель G11.
- **K14 Словарь дополнения** — ключи парой RU/EN через typograf (`en-US`): статус «Импорт отменён» — G10, карточка и
  «Отменить» — G11, в блоки своих префиксов.

## Группы

### G1 · Чистые модули ядра · M · волна 1

- Задачи: 2.1, 2.2, 2.3, 2.4
- Зависит от: —
- Файлы: `src/core/importHint*.ts`, `src/core/sources/{telegram,gifs}.ts`, `PickerProvider/finishImport/**`,
  `usePickerView/usePickerView.types.ts` (только K1), `tests/{importHint,telegram,gifs,finishImport}.test.ts`
- Требования: `telegram-import` → «Подсказка импорта», «Форма импорта»; `runtime-hosts` → «Проверка ключей и токена»
- Design: D5, D6, D9
- Контракты: вводит K1, K2, K3, K4
- Усиление проверок: 2.3 — адрес и `limit=1` для обоих источников, `httpError(401)` текстом через `httpStatus`, а не классом

### G2 · Словарь · S · волна 1

- Задачи: 3.1
- Зависит от: —
- Файлы: `src/core/i18n/messages.{ru,en}.ts`, `tests/translate.test.ts`
- Требования: `runtime-hosts` → «Подсказки настроек»; `picker-states` → «Формы экранов»
- Design: D10
- Контракты: вводит K5
- Усиление проверок: 3.1 — `settings.save` не удалять (его читает `SettingsView`, typecheck хука упадёт)

### G3 · Каркас экрана и примитивы · M · волна 2

- Задачи: 1.2, 4.1, 4.2, 4.3, 4.4
- Зависит от: G2
- Файлы: `Picker/{Button,TextInput,Field,Screen,StatusBar,ViewBody}/**`, `Picker/Picker.tsx`, `AddView/AddView.tsx`,
  `SettingsView/SettingsView.tsx`, `SettingsView/SecretField/**`
- Требования: `picker-states` → «Каркас экрана», «Строка статуса», «Иерархия заголовков», «Формы экранов»
- Design: D1, D2, D3, D10
- Контракты: вводит K6, K7, K8 (Button, итог 1.2)
- Усиление проверок: 4.2 — на стенде дерево доступности поля «Настроек»: имя из `<label>`, описание из подсказки, `aria-invalid`

### G4 · Сегменты «Добавить стикеры» · M · волна 3

- Задачи: 5.1, 5.2, 7.1
- Зависит от: G1, G3
- Файлы: `usePickerView/**`, `SectionTabs/AddButton/**`, `StickerFeed/CreateTile/**`, `AddView/AddView.tsx`,
  `AddView/{TelegramImport,CreateSticker}/{TelegramImport,CreateSticker}.tsx`, `useStickerDraft/**`, `useTelegramImport/**`
- Требования: `composer-integration` → «Навигация попапа»; `custom-stickers` → «Предпросмотр»
- Design: D4, D7
- Контракты: вводит K8 (формы сегментов), K9; потребляет K1, K6
- Усиление проверок: 7.1 — `saveBlock` чистой функцией от файла и `isConverting` с тестом, а не только typecheck

### G5 · Импорт из Telegram · M · волна 4

- Задачи: 6.1, 6.2
- Зависит от: G1, G4
- Файлы: `PickerProvider/{usePackImport,usePickerState,PickerProvider.types}.ts`, `useTelegramImport/**`, `AddView/TelegramImport/**`
- Требования: `telegram-import` → «Форма импорта», «Подсказка импорта»; `picker-states` → «Формы экранов»
- Design: D5, D6
- Контракты: потребляет K1, K2, K3, K7, K8
- Усиление проверок: 6.1 — «Пак не найден» на стенде со своим токеном из `.env`, статус не дублирует; 6.2 — признак читает
  панель при монтировании (она монтируется вместе с `AddView`), `AddView.tsx` G5 не правит

### G6 · Свой стикер · M · волна 4

- Задачи: 7.2, 7.3
- Зависит от: G4
- Файлы: `AddView/CreateSticker/**`
- Требования: `custom-stickers` → «Выбор исходного файла», «Предпросмотр», «Подпись на стикере», «Сохранение в «Мои стикеры»»
- Design: D7
- Контракты: потребляет K7, K8, K9
- Усиление проверок: 7.2 — на английском в дереве доступности нет «Файл не выбран» / «No file chosen»

### G7 · Настройки: автосохранение и проверка · M · волна 3

- Задачи: 8.1, 8.2, 8.3, 8.4
- Зависит от: G1, G2, G3
- Файлы: `PickerProvider/{usePickerState,PickerProvider.types}.ts`, `SettingsView/**`, `src/core/sources/gifs.ts` (только
  константа статусов, 8.4), `tests/gifs.test.ts`, `tests/settingsDraft*.test.ts`, `src/core/i18n/messages.{ru,en}.ts` (`settings.save`)
- Требования: `runtime-hosts` → «Настройки», «Подсказки настроек», «Проверка ключей и токена»; `telegram-import` → «Хранение токена»
- Design: D8, D9, D10
- Контракты: потребляет K4, K5, K6, K7, K8
- Усиление проверок: 8.2 — что писать (отличия от сохранённого, trim, пусто = нет ключа) и что проверять (непустое, отличное от
  проверенного) — чистыми функциями с тестом; 8.1 — Escape в пределах 600 мс после ввода и повторное открытие

### G8 · Дока и итоговая проверка · S · волна 5

- Задачи: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4
- Зависит от: G5, G6, G7
- Файлы: `docs/content/{,en/}setup/{gif-keys,telegram}.md`, `docs/content/{,en/}faq.md`, `docs/content/img/setup/**`,
  `CLAUDE.md`, `src/core/i18n/messages.{ru,en}.ts` (удаление неиспользуемых)
- Требования: `user-docs` → «Настройка ключей GIF», «Импорт из Telegram»; все сценарии change — стендом 10.1
- Design: D1–D10
- Контракты: K5 (чистка ключей)
- Усиление проверок: 10.2 — плюс поиск каждого ключа `messages.ru.ts` по `src/`: ключ без использования удалить

### G9 · Ядро: набор пака и отмена · M · волна 6

- Задачи: 11.1, 11.2, 12.1, 12.2
- Зависит от: —
- Файлы: `src/core/sources/telegram{,.types}.ts`, `src/core/{convert,encodeLadder,db}.ts`, `PickerProvider/packPreview/**`,
  `PickerProvider/usePackImport.ts` (только вызов под новую сигнатуру), `tests/{telegram,encodeLadder,packPreview,db}.test.ts`
- Требования: `telegram-import` → «Карточка пака», «Отмена импорта»
- Design: D11, D12
- Контракты: вводит K10, K11, K12 (ядро)
- Усиление проверок: 11.1 — счёт вызовов `fetchJson` по методу Bot API: импорт по набору не зовёт `getStickerSet`;
  11.2 — превью и импорт одного имени параллельно — `resolve` вызван один раз; 12.1 — обрыв посреди прохода закрывает
  приёмник (поддельный sink, если проход тестируем без `gif-worker:code`, иначе стенд в G12); 12.2 — отмена сразу после
  `putSticker` удаляет и этот стикер (снимок, а не счётчик); `listStickers` в `db.ts` нет — G9 заводит её с тестом

### G10 · Провайдер: превью и отмена · M · волна 7

- Задачи: 11.3, 12.3
- Зависит от: G9
- Файлы: `PickerProvider/{usePackImport,usePickerState,PickerProvider.types}.ts`, `PickerProvider/runPackImport/**`,
  `useTelegramImport/**`, `tests/runPackImport.test.ts`, `src/core/i18n/messages.{ru,en}.ts` (K14)
- Требования: `telegram-import` → «Карточка пака», «Отмена импорта»
- Design: D11, D12
- Контракты: потребляет K10, K11, K12; вводит K12 (`runPackImport`), K13
- Усиление проверок: 11.3 — нужен ли запрос (имя сменилось, есть свой или встроенный токен) и что показать (снимок при
  импорте, иначе превью) — чистыми функциями с тестом; стенд 11.3 — в G11 вместе с карточкой; 12.3 — `onCancel` не зовёт
  `onError` / `onSuccess` / прокрутку, статус — `showStatus`

### G11 · UI: карточка пака и «Отменить» · M · волна 8

- Задачи: 11.4, 12.4
- Зависит от: G10
- Файлы: `AddView/TelegramImport/**` (`PackCard/` вместо `ImportProgress/`), `Picker/Button/**`, `src/core/i18n/messages.{ru,en}.ts`
- Требования: `telegram-import` → «Карточка пака», «Отмена импорта»
- Design: D11, D12
- Контракты: потребляет K13, K14
- Усиление проверок: 11.4 — в дереве доступности описание поля ссылки содержит текст карточки; стенд сценариев 11.3;
  12.4 — двойной клик по «Импорт» на стенде: импорт идёт; Enter в поле ссылки во время импорта его не отменяет

### G12 · Стенд, дока и итог дополнения · S · волна 9

- Задачи: 12.5, 13.1, 13.2, 13.3
- Зависит от: G11
- Файлы: `CLAUDE.md`, `docs/content/{,en/}setup/telegram.md`, `docs/content/img/setup/**`
- Требования: `telegram-import` → «Отмена импорта» (стенд); `user-docs` → «Импорт из Telegram»
- Design: D11, D12
- Контракты: —
- Усиление проверок: 12.5 — «нет запросов после отмены» — подсчёт `fetch` / Worker в консоли стенда, а не на глаз;
  VoiceOver агенту недоступен — пункт пользователю

## Волны

1. G1, G2 — файлы не пересекаются
2. G3
3. G4, G7 — `usePickerView`/`AddView` против `PickerProvider`/`SettingsView`
4. G5, G6 — `TelegramImport`/провайдер против `CreateSticker`; `AddView.tsx` правит только G4
5. G8
6. G9
7. G10
8. G11
9. G12
