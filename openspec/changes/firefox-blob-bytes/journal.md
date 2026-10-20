# Журнал прогона

Решения без заказчика, отступления от спеки, итоги аудитов и долг прогона change `firefox-blob-bytes`.

## 2026-10-20

### Старт прогона

База прогона: 874bedda71c9dbcf6af5714937e7f2445b952426. Масштаб: малый, одна группа G1 (1.1–3.1).
Гейт: `pnpm lint && pnpm test`.
Вне группы: 3.2 — живой Firefox + Tampermonkey; Firefox и установку userscript-а запускает пользователь, управление по BiDi. Агент один выполнить не может — в финале вопрос пользователю.

### G1

Решения: помощники denyConstructor (геттер на экземпляр, gif) и withDeniedConstructor (геттер на Uint8Array.prototype на время вызова, finally); тест zip сравнивает результат после выхода из помощника — матчеры expect сами читают constructor; проверка 1.1 встроена в тест 1.3; hasGifSignature — цикл по шести индексам.
Аудит: ok с первого круга. Мутации (возврат subarray в gif.ts и zipRead.ts) роняют 3 новых теста с `Permission denied`. pnpm lint и pnpm test (1916) зелёные; ast-grep subarray — только net.ts:173 и gifEncoder.ts:107.
Долг: в `paths:` правила external-data.md нет src/core/sender.ts, где зовётся Blob.arrayBuffer() (строки 90, 158), — правило не подгрузится при правке sender.ts. Под отравленным прототипом проверено только stored-чтение zip; deflate-каталог идёт тем же кодом.
Отступлений нет. Сквозная работа в Firefox — только в 3.2.
