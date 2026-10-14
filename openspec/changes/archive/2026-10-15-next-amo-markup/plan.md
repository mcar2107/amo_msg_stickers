# План прогона: next-amo-markup

База прогона: `4c13b3afa6447eafb9286e083e6de08f30f55a08`
Гейт: `pnpm lint && pnpm test && pnpm build && pnpm docs:build`
Быстрые проверки: `pnpm typecheck`, `pnpm exec vitest --project=unit run tests/<файл>.test.ts`
Долгие слои: стенд (`pnpm build`, `pnpm harness`, chrome-devtools) — G2, G5–G8; живая Worker-версия (journal «Живые
образцы») — G1, G6 (дым), G8. Хук коммита гоняет `pnpm typecheck` и `vitest --changed`: группа оставляет их зелёными.

## Контракты

- **K1 Пометка** — маркер `amostk.`, вид по `.k-…` (незнакомый → `gif`), `data-amo-stickers-kind`, `--amostk-w/-h`
  (целые без единиц) объявлены только в `src/shared/`; `fileName.ts`, агент, `amoDomWorker.ts` импортируют. G3 → G7.
- **K2 Протокол** — `PageRequest.dims { w, h }` (целые > 0, иное отбрасывается), отказы `draft-busy`, `no-core`; ответ
  агента — только статус и причина. G3 → G6.
- **K3 Черновик** — `ComposeMarkup.isEditing / isDraftEmpty / sendButtonOf(composer)` читают DOM в момент вызова;
  `isShown` удалён. G2 → G5.
- **K4 Кнопка** — `AmoMarkup.button` (классы обёртки, узла, иконки, закрытого и открытого состояния, `anchor` — от поля
  или от кнопки); `createPicker.open(openedBy, anchor)`. G2 (поле и прежние значения) → G5.
- **K5 Стенд** — Worker-вариант стенда повторяет design «Context» и журнал G1, а не код `amoDomWorker.ts`: капсула,
  `[data-editing]`, `[data-attachments]`, `div[data-key]`, `__reactFiber$harness` / `__reactProps$harness` (`row`,
  `down { shown, onClick }`), ядро-Worker: `sendFiles` → `sent { chat, seq, key, refused }`, `draft`. G4 → G5–G8.
- **K6 Fiber** — одна функция в `src/page/`: ключи по префиксу `__reactFiber$` / `__reactProps$`, актуальная копия из
  (`fiber`, `alternate`) — чьи `memoizedProps` равны `__reactProps$` узла. G6 → G7.
- **K7 Ранний старт** — агент на `document_start` не требует `body`, наблюдатель ленты — на `document`. G6 → G7.

## Группы

### G1 · Разведка в живой Worker-версии · M · волна 1

- Задачи: 1.1, 1.2
- Зависит от: —
- Файлы: `local/**`, `openspec/changes/next-amo-markup/{design.md,specs/**}`
- Требования: `sticker-sending` → «Прямая отправка в Worker-версии amo web»; `chat-message-style` → «Стиль ленты в Worker-версии amo web»
- Design: D2, D4, D6, D8, «Риски»
- Контракты: уточняет K5 (форма `down`, путь к кнопкам ленты, отступы плашки)
- Усиление проверок: сборка — копией в `local/`, не из `dist/`; (а)–(е) — «да/нет + цифра» в «Риски»; (а)/(б) «нет» — стоп

### G2 · Контракт разметки: черновик, кнопка, язык · M · волна 1

- Задачи: 3.1, 3.2, 3.5
- Зависит от: —
- Файлы: `src/core/amoDom{,.types,Stable,Legacy}.ts`, `src/core/{sender,app}.ts`, `src/core/ui/icons.ts`,
  `src/core/i18n/locale.ts`, `tests/{sender,locale}.test.ts`
- Требования: `sticker-sending` → «Ожидание вложения и таймаут»; `composer-integration` → «Кнопка стикеров в поле
  ввода»; `localization` → «Язык интерфейса по языку amo»
- Design: D1, D4
- Контракты: вводит K3, K4
- Усиление проверок: 3.1 — `sendButtonOf` сначала `null`, потом кнопка: клик ровно один; 3.2 — `outerHTML` кнопки
  прежних разметок стенда = база; 3.5 — `lang=""` → языки браузера, `lang="de"` при `['en']` → русский

### G3 · Протокол и стороны GIF · M · волна 2

- Задачи: 2.1, 2.2, 2.3
- Зависит от: G1, G2
- Файлы: `src/shared/**`, `src/core/{fileName,gif,sender}.ts`, `src/core/pageClient*.ts`,
  `tests/{fileName,pageBridge,gif,pageClient,sender}.test.ts`
- Требования: `sticker-sending` → «Прямая отправка в Worker-версии amo web»; `runtime-hosts` → «Агент в мире страницы»
- Design: D6, D7
- Контракты: вводит K1, K2
- Усиление проверок: 2.2 — отбрасываются `0`, отрицательное, дробное, `NaN`, строка; 2.3 — GIF 300×70 (сторона > 255,
  w ≠ h); K1 — `rg` литералов пометки вне `src/shared/` пуст

### G4 · Стенд Worker-версии · M · волна 2

- Задачи: 6.1
- Зависит от: G1
- Файлы: `dev/harness.html`, `dev/harness-server.mjs`
- Требования: Worker-сценарии всех спек change
- Design: D9, «Context»
- Контракты: вводит K5
- Усиление проверок: ядро создаётся после агента, имя ≠ имени Worker-а страницы; «ядро не поймано» — до агента

### G5 · Разметка Worker-версии: поле, панель, тема · M · волна 3

- Задачи: 4.1, 3.3, 3.4
- Зависит от: G1, G2, G4
- Файлы: `src/core/amoDom{Worker,,.types}.ts`, `src/core/app.ts`, `src/core/ui/{createPicker.tsx,Picker/Picker.tsx}`
- Требования: `composer-integration` → «Кнопка стикеров в поле ввода», «Соответствие теме amo»
- Design: D1, D2, D3
- Контракты: K3, K4, K5
- Усиление проверок: 4.1 — `evaluate` на стенде: каждая разметка — 1 поле в своём варианте, 0 в чужих, в т. ч. при
  вложении и правке; 3.4 — эмуляция тёмной системы: Worker без атрибута — тёмный попап с первого открытия, прежние —
  светлый; 3.3 — прямоугольник панели прежних разметок = база

### G6 · Агент: ядро страницы, отправка, ранний старт · M · волна 3

- Задачи: 5.1, 5.2, 5.4
- Зависит от: G1, G3, G4
- Файлы: `src/page/**`, `src/extension/manifest.json`, `build.mjs`, `src/userscript/index.ts`,
  `tests/{pageAgent,pageWorkerCore,userscriptBanner,userscriptEntry}.test.ts`
- Требования: `sticker-sending` → «Прямая отправка в Worker-версии amo web»; `runtime-hosts` → «Агент в мире страницы»
- Design: D5, D6
- Контракты: K2; вводит K6, K7
- Усиление проверок: 5.1 — `onmessage`, `addEventListener` и `postMessage` с transfer — как без агента; ядро — по
  `{ kind: 'sent' }` при любом имени; 5.2 — журнал вызовов: `sendFiles` раньше `input`, `seq` после `2³²−1` → `10⁹`,
  `down.onClick` — не на чужой `seq` и не при `shown: false`; 5.4 — в `dist/` `page.js` `document_start`, `content.js`
  `document_idle`; дым — один стикер в живой Worker-версии

### G7 · Лента Worker-версии: пометка и стиль · M · волна 4

- Задачи: 5.3, 4.2, 4.3
- Зависит от: G3, G5, G6
- Файлы: `src/page/**`, `src/core/amoDom{Worker,Style,Stable,Legacy,.types}.ts`, `tests/pageMarkRows.test.ts`
- Требования: `chat-message-style` → «Распознавание своего сообщения», «Стиль ленты в Worker-версии amo web»
- Design: D7, D8
- Контракты: K1, K5, K6, K7
- Усиление проверок: 5.3 — шпион записи: повторная пачка — 0 записей, `row` на 13-м шаге — без пометки; 4.2 — правил
  в листе `#amo-stickers-message` столько же, сколько в тексте; 4.3 — размеры `getBoundingClientRect`, прежние = база

### G8 · Стенд и живая приёмка · M · волна 5

- Задачи: 6.2, 7.1, 7.2
- Зависит от: G2, G3, G5, G6, G7
- Файлы: `local/**`, `openspec/changes/next-amo-markup/design.md`; дефекты — в файлах G2–G7
- Требования: все требования спек change
- Design: «Риски»
- Контракты: K1–K7 — сверка стыков
- Усиление проверок: сначала сверка стенда (K5) с живой Worker-версией; 7.2 — тот же чат с агентом и без

### G9 · Документы и итог · S · волна 6

- Задачи: 8.1, 8.2, 8.3
- Зависит от: G8
- Файлы: `docs/content/{faq.md,en/faq.md}`, `CLAUDE.md`
- Требования: `user-docs` → «Ошибка черновика в доке»
- Design: —
- Контракты: —
- Усиление проверок: 8.1 — совет про issues только для запасного пути

## Волны

1. G1, G2 — файлы не пересекаются
2. G3, G4 — файлы не пересекаются
3. G5, G6 — `src/core/` и UI против `src/page/**` и сборки
4. G7
5. G8
6. G9
