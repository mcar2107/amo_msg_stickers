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
