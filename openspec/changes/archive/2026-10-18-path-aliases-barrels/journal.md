# Журнал прогона

Решения без заказчика, отступления от спеки, итоги аудитов и долг прогона change `path-aliases-barrels`.

## 2026-10-18

### Старт прогона

База прогона: 0a1ed2b (master) + коммит артефактов спеки.
Масштаб: малый, одна группа G1 (однородная механика — codemod).
Гейт: pnpm lint && pnpm test && pnpm build.
Базовые бандлы до правки (сборка с TELEGRAM_BOT_TOKEN=123456:FAKETOKENzz KLIPY_API_KEY=FAKEKLIPYzz): /private/tmp/claude-501/-Users-corvus278-Projects-amo-msg-stickers/5b0e3cbd-ac47-43b3-9290-1e8a174c668e/scratchpad/dist-before/ — amo-stickers.user.js 516217 (token 1, klipy 1), content.js 500978 (1/1), background.js 42150 (0/0), page.js 10515 (0/0).
3.3 (стенд в браузере) — вне G1, проверяет координатор после аудита.

### G1

Пачки: 1.1–1.4, 2.1–2.4 (один исполнитель), 3.1 3.2 4.1 (второй) — крупнее двух задач: однородная механика.
Решения: vitest — resolve.tsconfigPaths vite 8.3 + заглушка gif-worker:code/page-agent:code вместо vi.mock в 14 тестах; eslint читает alias из tsconfig; build.mjs не тронут (esbuild читает paths сам).
Отступления: `@ui` → `./src/core/ui/Picker/index`, Picker снаружи только через `@ui` (на macOS `./Picker` резолвился в picker.css); исключение `../../tailwind.config` в запрете `../` (корень репо вне alias); .types.ts со значениями — `export *`.
Циклы через barrel родителя разорваны переносом в дочерние модули: libraryFile/importRecords/, PickerProvider/errorMessage/, Screen/useScreenMotion/screenTiming/, ModePanel/scrollMemory/, StickerFeed/cellId/, MasonryGrid/gifCellId/.
Аудит: ok с первого круга; бандлы равны базе по размеру, page.js побайтно, токен/ключ только в content.js и userscript.
Долг: исключение tailwind.config пускает его из любого файла src/; отдельные импорты из ./helpers в tests/pageAgent, pageMarkRows не слиты; moduleStructure.test читает tsconfig как JSON (комментарий в нём уронит тест); CLAUDE.md называет 2 из 6 переносов.

### Стенд

Стенд pnpm harness, headless Chrome 155, сборка ветки (userscript).
Прежняя разметка: пикер открывается, GIF и стикер уходят очередью amo (alt с amostk.k-gif / k-sticker).
Стабильная: стикер уходит, data-file-name с меткой.
Worker-версия: стикер уходит ядром страницы (без no-core/запасного пути), строка помечена data-amo-stickers-kind="sticker", --amostk-w на коробке.
Ошибок в консоли нет (кроме 404 favicon стенда).

### Итог

Гейт pnpm lint && pnpm test && pnpm build — ok. openspec validate --strict — ok (skip_specs).
Закрыто 12/12. Вопросов к пользователю нет. Долг G1 — в записи группы.
