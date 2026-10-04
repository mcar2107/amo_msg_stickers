**Install the script.** Click the link
[amo-stickers.user.js](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.user.js) —
it is the latest version. The manager will offer to install the “amo stickers” script and show its version number —
confirm the installation:

- **Tampermonkey** opens a separate tab with an “Install” button, or, if amo stickers is already installed, with an
  “Update” button and the installed version number;
- **Userscripts in Safari** opens the link as text — that’s fine: click the Userscripts icon in the Safari toolbar,
  and it will offer to install the script.

If the manager didn’t offer anything, check that it is installed and turned on.

![Tampermonkey tab with amo stickers: the new and the installed version numbers, the “Update” button](../../img/install/tampermonkey-install.png)

**What the manager will ask.** The script runs only on amo sites (`*.amo.tm`) and connects to three addresses on its
own:

- `api.telegram.org` — importing packs from Telegram;
- `giphy.com` and `klipy.com` — GIF search.

The script has no other addresses. With Tampermonkey, the GIF keys and your own bot token are stored in the manager
itself, and scripts on the amo page can’t see them.

**Check it.** Open or reload the amo tab: a sticker button will appear in the message field next to the emoji button.

![amo message field: the sticker button is to the right of the emoji button](../../img/install/sticker-button.png)

**Updates** are checked and installed by Tampermonkey itself — see [“Updating”](../update) for details.
