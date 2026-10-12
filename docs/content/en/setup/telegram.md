# Import from Telegram

A Telegram pack is added whole — static, animated (`.tgs`) and video stickers become GIFs. Nothing to set up:
the built-in amo stickers bot downloads the pack.

## 1. Copy the pack link {#pack-link}

**Click a sticker from the pack in a Telegram chat, open the “⋮” menu in the pack window → “Copy Link”.**

- Telegram for macOS has no such item: “Share” → the copy link button in the top right corner.
- A pack you have already added: “Settings” → “Stickers and Emoji” → the pack → “⋮” → “Copy Link”.

`https://t.me/addstickers/Name`, an emoji pack link `t.me/addemoji/Name` or just the pack name will do.

<img src="../../img/setup/telegram-pack-link.png" alt="A pack window in Telegram for macOS: the “…” menu is open with the “Share” item — behind it is the chat selection window with the copy link button" width="480">

## 2. Import the pack {#import}

In the “Stickers” mode, click “+” → “Telegram”, paste the link and click “Import”.

<img src="../../img/setup/telegram-import.png" alt="The “Add stickers” screen, the “Telegram” tab: a pack link in the “Pack link” field, under it the “Hot Cherry” pack card with a progress bar and the 14/34 count, the “Cancel” button in the footer" width="364">

The pack appears as a separate tab. The card under the field shows the pack name and sticker count before the import,
and for a pack you already have — that importing will update it. You can leave the screen — the progress moves
to the bottom of the panel. “Cancel” returns the library to how it was before the import.

## If it didn’t work

The error appears under the link field or, if you left the screen, at the bottom of the panel.

- **“The built-in Telegram bot is unavailable…”** — the bot hit its limit or was revoked. Try later or set
  up [your own bot](#own-bot).
- **“Enter the bot token in settings”** — a build without the built-in bot (for example, from source): you need
  [your own bot](#own-bot).
- **“Couldn’t parse the link…”** — the field doesn’t contain a pack link, see [step 1](#pack-link).
- **“HTTP 400 … STICKERSET_INVALID”** — there is no such pack. Check that the link opens in Telegram.
- **“HTTP 401 … Unauthorized”** — Telegram didn’t accept your token: copy it [again](#own-bot-token).

## Your own bot (optional) {#own-bot}

Only needed if the built-in one is unavailable. You create the bot once — no need to add it to chats or set it up.

::: warning The token is a secret
Anyone with the token controls the bot: don’t forward it or show it in screenshots. amo stickers keeps the token
in the browser and sends it only to `api.telegram.org`. If it leaked, click “Revoke” in @BotFather and paste
the new one.
:::

### 1. Create a bot

Open [@BotFather](https://t.me/BotFather) → “Open” → “Create a New Bot”. Any name will do, the username must end
in `bot`. Click “Create Bot”. In the old Telegram interface — the `/newbot` command in the chat with @BotFather.

<div class="media-row">
<img src="../../img/setup/botfather-my-bots.png" alt="The @BotFather window: the “My bots” section with the “Create a New Bot” button, bot names are blurred" width="300">
<img src="../../img/setup/botfather-newbot.png" alt="The “New bot” form in @BotFather: the bot name, the username marked “is available” and the “Create Bot” button" width="300">
</div>

### 2. Copy the token {#own-bot-token}

On the bot page, click “Copy”. Later you can copy the token in the same place: @BotFather → “My bots” → the bot →
“Copy”.

<img src="../../img/setup/botfather-token.png" alt="The new bot page in @BotFather: the token is hidden, the “Copy” and “Revoke” buttons are below it" width="300">

### 3. Paste the token into “Settings”

The amo stickers panel → “Settings” → the “Your Telegram bot token” field. The token saves on its own. “Doesn’t look
like a bot token” under the field — the token wasn’t copied in full.

<img src="../../img/setup/settings-token.png" alt="The amo stickers “Settings” screen: the “Telegram” group with the “Your Telegram bot token (optional)” field and the hint under it" width="364">

Now the import goes through your bot.
