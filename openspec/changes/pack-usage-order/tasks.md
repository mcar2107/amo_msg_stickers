## 1. Хранение и порядок

- [ ] 1.1 `Pack.usedAt?: number` в `src/core/db.types.ts` с jsdoc; `touchPack(packId)` в `src/core/db.ts` — чтение и запись `usedAt: Date.now()` одной `readwrite`-транзакцией, без записи и без исключения, если пака нет; проверка — `pnpm typecheck`
- [ ] 1.2 Чистая `orderPacks(packs, snapshot)` в `src/core/packOrder.ts` (design «Чистая функция порядка») и тест `tests/packOrder.test.ts`: свой пак первым; по `usedAt` по убыванию; без `usedAt` — после, по `createdAt`; равные `usedAt`; библиотека без `usedAt` — порядок импорта; снимок держит порядок при новых `usedAt`; пак не из снимка — первым среди паков Telegram; удалённый id снимка пропускается; вход не меняется — `pnpm test` зелёный

## 2. Импорт

- [ ] 2.1 `importTelegramSet`: новый пак — `usedAt: Date.now()`; повторный — `createdAt` и `usedAt` из прежней записи; `createdAt` стикеров — от времени начала импорта плюс индекс; откаты без изменений. Тесты в `tests/telegram.test.ts`: новый пак пишется с `usedAt`, повторный сохраняет `createdAt` и `usedAt` прежней записи, порядок `createdAt` стикеров по индексу — `pnpm test` зелёный

## 3. Пикер

- [ ] 3.1 Провайдер (`usePickerState`, типы `PickerProvider.types.ts`): снимок порядка в `ref`, `refreshPacks(options?)` с `isReorder` — пересчёт и обновление снимка, без него — порядок по снимку через `orderPacks`; `useOpenLoad` зовёт `refreshPacks({ isReorder: true })`, остальные вызовы не меняются — `pnpm typecheck`, на стенде порядок не меняется при импорте и удалении в открытом попапе
- [ ] 3.2 `send(item, packId?)` провайдера: после успешного `onSend` — `touchPack(packId)` при переданном `packId`, сбой записи — `console.warn` без статуса; `useCellSend(item, packId?)`; `StickerCell` получает `packId` пропом (jsdoc в `StickerCell.types.ts`), `FeedRow` передаёт id раздела пака и ничего — у «Недавних» — `pnpm lint`, на стенде отправка из пака поднимает его при следующем открытии, из «Недавних» — нет
- [ ] 3.3 Описание порядка в `CLAUDE.md` («Режим «Стикеры»», «Хранение», структура — `packOrder.ts`) — проверка чтением диффа

## 4. Дока

- [ ] 4.1 Вопрос о порядке паков в `docs/content/faq.md` и `docs/content/en/faq.md` (спека `user-docs`, «Порядок паков в доке»), тексты через typograf (`en-US` для английского) — `pnpm docs:build` без ошибок, `tests/userDocsPages.test.ts` зелёный

## 5. Проверка

- [ ] 5.1 `pnpm lint`, `pnpm test`, `pnpm build` зелёные; на стенде (`pnpm harness`) сценарии спеки `sticker-library` «Порядок паков по использованию» и `telegram-import` «Повторный импорт»: отправка из пака, из «Недавних», неудачная отправка, импорт нового и повторный, перезагрузка
