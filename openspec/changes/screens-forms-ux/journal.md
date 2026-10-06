# Журнал прогона

Решения без заказчика, отступления от спеки, итоги аудитов и долг прогона change `screens-forms-ux`.

## 2026-10-06

### Живые образцы

Ключи GIPHY и KLIPY для 8.4 — переменные GIPHY_KEY и KLIPY_KEY в `.env` корня (значения в журнал, отчёты и коммиты не писать). Стенд — `dev/harness.html` (`python3 -m http.server 8777 -b 127.0.0.1`), `dev/amo.css` на месте; headless Chrome — по CLAUDE.local.md.

### G1 · Чистые модули ядра

Решения: признак инструкции хранится значением '1' (строго, как pickerMode); isBotTokenFormat снимает пробелы по краям; checkGifKey не бросает — любой сбой, кроме 401/403, даёт unavailable; KEY_REJECT_STATUSES локальна в gifs.ts (8.4 дополняет там); AddSegment (K1) заведён в usePickerView.types.ts в G1 — нужен сигнатуре importErrorTarget.
Аудит: ok с первого круга, мутации не понадобились.
Долг: проверка ключа KLIPY без media_filter — ответ тяжелее, на итог не влияет; KEY_REJECT_STATUSES не экспортирована.

### G2 · Словарь

Решения: ошибка неверной ссылки — имеющийся error.telegram.badLink (G5 берёт его); подпись поля — имеющийся add.custom.caption; «Токен хранится локально» вынесено из подсказок в settings.storedLocally; EN «Готово» → «Done» (перевод amo не сверен — вопрос в финал).
Отступление: settings.save и старые ключи (add.telegram.hint, add.custom.dropZone, settings.{giphy,klipy}.hint) не удалены — по K5 их удаляют G7 и G8; правлен tests/renderMessage.test.ts вслед за строкой подсказки.
Аудит: ok с первого круга.
Долг: G7 обязана вывести settings.storedLocally на экран; тест «подсказки токена не говорят о хранении» проверяет только RU; 10.2 убирает старые ключи.

### G3 · Каркас экрана и примитивы

1.2: headless Chrome 154 (CDP) — Enter в поле формы в закрытом shadow root шлёт submit с submitter = кнопка type="submit" form="<id>" вне формы; disabled — не шлёт. Основной вариант D3 в силе, запасной не нужен; Firefox не проверялся (поведение — стандарт HTML).
Решения: Button — union ButtonActionProps | ButtonSubmitProps; leave() для кнопок футера — ScreenContext + useScreenLeave (не render-prop); Screen рисует тело сам, ViewBody и SecretField удалены; Field — описание в порядке ошибка → результат → подсказка; общая высота футера — SCREEN_FOOTER_HEIGHT_PX = 48 inline-стилем (Tailwind не сканирует .ts); isTextField вынесен в общий модуль (вне файлов группы).
Аудит: ok с первого круга. Исполнитель сменён после 52 вызовов (эстафета на 4.4).
Долг: тип View в usePickerView.types.ts больше не используется — удалить в G4; AddView footer={null} до G4; useScreenLeave не переиспользует тип ScreenLeave.

### G4 · Сегменты «Добавить стикеры»

Решения: формы сегментов — SegmentForm (`<form role="tabpanel" hidden>`) в AddView, кнопки — TelegramImportFooter и CreateStickerFooter (уже лежат в каталогах G5/G6) с type="submit" form; раскладка полей во вложенном div (flex на форме перебил бы hidden); resolveAddSegment, DEFAULT_ADD_SEGMENT = 'telegram'; saveBlock({ hasFile, isConverting }): без файла — noFile даже при сборке; isDraftConverting: окно задержки подписи (500 мс) считается сборкой.
Решения координатора: окно задержки подписи → сборка — по букве custom-stickers «Сборка после правки подписи» (аудитор поднял question, спека это покрывает), отдано вторым critical. G5 разрешено править AddView.tsx (провод ошибки поля ссылки): волна 4 идёт последовательно в одном дереве; альтернатива — проп fieldError заранее в G4.
Аудит: 1 круг доработки — critical: isConverting не доходил до CreateStickerProps (K9); окно задержки подписи. Оба закрыты. Исполнитель сменён после 75 вызовов.
Долг: TelegramImport получает isActive, но читает его только G5; удержание попапа conversion не держится в окне задержки ввода (при фокусе в поле держится); провод openScreen и ARIA tabs проверен исполнителем на стенде, тестами — только resolveAddSegment.
