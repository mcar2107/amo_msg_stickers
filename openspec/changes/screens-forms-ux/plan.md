# План прогона: screens-forms-ux

База прогона: `03ff8ef5d8f9bdba080e795858a8e886a999c3dd`
Гейт: `pnpm lint && pnpm test`
Быстрые проверки: `pnpm typecheck`, `pnpm exec vitest --project=unit --run tests/<файл>.test.ts`
Долгие слои: стенд `dev/harness.html` в headless Chrome (CLAUDE.local.md) — G3, G4, G5, G6, G7, G8; `pnpm docs:build` — G8
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

## Волны

1. G1, G2 — файлы не пересекаются
2. G3
3. G4, G7 — `usePickerView`/`AddView` против `PickerProvider`/`SettingsView`
4. G5, G6 — `TelegramImport`/провайдер против `CreateSticker`; `AddView.tsx` правит только G4
5. G8
