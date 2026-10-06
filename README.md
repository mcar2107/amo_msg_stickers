# amo stickers

Стикеры и GIF для мессенджера amo в браузере: кнопка стикеров в строке ввода рядом с кнопкой эмодзи, отправка одним
кликом.

<img src="docs/content/img/readme/demo.gif" alt="Панель стикеров над строкой ввода amo: отправка стикера и GIF кликом" width="720">

- **Свои стикеры** — из картинки, GIF, видео или анимированного стикера Telegram (`.tgs`), с подписью или без.
- **Паки из Telegram** — импорт целого пака по ссылке на него, без настройки.
- **Поиск GIF** — GIPHY и KLIPY по своему бесплатному ключу, недавние GIF всегда под рукой.
- **Отправка кликом** — собеседник получит стикер картинкой GIF, даже если amo stickers у него нет.

**[Установить →](https://mcar2107.github.io/amo_msg_stickers/install/)** — пошаговая инструкция для Chrome,
Яндекс Браузера, Edge, Opera, Firefox и Safari.

**In English:** [installation guide →](https://mcar2107.github.io/amo_msg_stickers/en/install/) ·
[documentation](https://mcar2107.github.io/amo_msg_stickers/en/)

Прямые ссылки на последнюю версию:
[расширение в Chrome Web Store](https://chromewebstore.google.com/detail/amo-stickers/abjnjphijggkkdbbmkldhibgepgdcgip) ·
[скачать архив расширения](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.zip) ·
[установить userscript](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.user.js).

[Документация](https://mcar2107.github.io/amo_msg_stickers/) ·
[Частые вопросы](https://mcar2107.github.io/amo_msg_stickers/faq) ·
[Политика конфиденциальности](https://mcar2107.github.io/amo_msg_stickers/privacy) ·
[Сообщить о проблеме](https://github.com/mcar2107/amo_msg_stickers/issues)

## Разработка

Одно ядро на TypeScript собирается в расширение Chrome (MV3) и userscript. Устройство, соглашения и правила — в
[CLAUDE.md](./CLAUDE.md).

```bash
pnpm i
pnpm build             # dist/extension/* и dist/amo-stickers.user.js
pnpm watch             # пересборка при изменениях
pnpm lint              # eslint + typecheck + prettier --check
pnpm test              # vitest
pnpm docs:dev          # сайт доки локально (исходники — docs/)
```

Pre-commit гоняет lint-staged, typecheck и тесты по изменённым файлам. На каждый PR в `master` CI проверяет линт,
типы, тесты, сборку, сборку доки и версию, а после мержа выпускает релиз.

**Публикация в Chrome Web Store.** Релиз сам загружает новую версию в стор и отправляет её на проверку. Доступ —
сервисный аккаунт Google Cloud, настраивается один раз:

1. В [Google Cloud Console](https://console.cloud.google.com/) включите в проекте Chrome Web Store API.
2. [Создайте сервисный аккаунт](https://console.cloud.google.com/iam-admin/serviceaccounts) без ролей и скачайте его
   ключ JSON: Keys → Add key → JSON.
3. В [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) добавьте почту аккаунта в разделе Account
   → Service accounts и скопируйте ID издателя из Publisher → Settings.
4. Положите ключ и ID в секреты репозитория:

   ```bash
   gh secret set CWS_SERVICE_ACCOUNT_KEY < key.json
   gh secret set CWS_PUBLISHER_ID --body '<ID издателя>'
   ```

Без секретов релиз выходит на GitHub как обычно, а публикация пропускается с предупреждением. Сбой загрузки в стор
виден красным job-ом `chrome-web-store` в прогоне релиза, сам релиз на GitHub к этому моменту уже выпущен.

Вручную публикация запускается из Actions, workflow «Chrome Web Store»: в поле тега — релиз, например `v0.16.0`,
пустое — последний релиз. Версия, которая уже на проверке или опубликована, повторно не загружается.

```bash
gh workflow run chrome-web-store.yml --ref master -f tag=v0.16.0
```

**Стенд.** `dev/harness.html` повторяет разметку поля ввода и ленты amo; вставка и «Отправить» в нём замоканы. Для
стилей положите CSS страницы amo в `dev/amo.css` (в git не лежит).

Ключи GIF и токен бота стенд берёт из `.env` в корне: `pnpm i` создаёт его из шаблона `.env.example`, если файла ещё
нет. Сервер стенда `pnpm harness` (порт — переменная `PORT`) кладёт их в настройки и проксирует файлы стикеров
Telegram: на стенде userscript работает без менеджера, а файлы Telegram отдаются без CORS.

```bash
pnpm harness
open http://127.0.0.1:8777/dev/harness.html
```
