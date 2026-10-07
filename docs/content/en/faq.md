# FAQ

## There is no sticker button

The sticker button appears in the message field next to the emoji button. If it isn’t there:

1. **Reload the amo tab.** The extension and the script start when the page loads, so a tab opened before the
   installation won’t have the button.
2. **Check that you are using amo in a browser.** amo stickers works on `*.amo.tm` sites. It doesn’t start in the amo
   desktop app — see [“amo app”](./install/desktop) for details.
3. **Check that amo stickers is turned on.** The extension — on the extensions page (for example,
   <CopyCode text="chrome://extensions" />), the script — in the script manager dashboard. If the script is installed
   in Tampermonkey but doesn’t work, see the next question.

If everything is turned on but there is no button, amo may have changed the page. Report it in
[issues on GitHub](https://github.com/mcar2107/amo_msg_stickers/issues).

## Tampermonkey doesn’t run the script

The script is installed, but there is no sticker button, and the Tampermonkey icon on the amo page shows no count of
running scripts.

- **Chrome, Edge, Yandex Browser, Opera.** The browser runs user scripts only if this is allowed separately. Open the
  extensions page, click “Details” on Tampermonkey and turn on “Allow User Scripts”. If there is no such toggle, turn
  on “Developer mode” on the extensions page. See the “Userscript” tab of the [installation](./install/chromium)
  section for details.
- **Site access.** In the Tampermonkey details on the extensions page, check that the extension has access to sites —
  to all of them or at least to amo.
- **The script is turned on.** In the Tampermonkey dashboard, the toggle next to amo stickers should be on.

Reload the amo tab after each change.

## It doesn’t work in Violentmonkey or Safari

Violentmonkey and the Userscripts app in Safari aren’t tested: the script may work in them, or it may not, and fixes
for them aren’t guaranteed. The tested ways are the extension or the userscript in Tampermonkey in a Chromium browser
([Chrome, Yandex Browser, Edge, Opera](./install/chromium)) or in [Firefox](./install/firefox).

## “Couldn’t parse the link” when importing

The import field needs a sticker pack link like `https://t.me/addstickers/Name` — or just the pack name. A link to a
message, a channel or the sticker itself won’t work. How to copy the pack link — see
[“Import from Telegram”](./setup/telegram#pack-link).

## GIF search stopped working

Most likely, the key has hit its request limit. Free keys are test keys: GIPHY allows 100 requests per hour, KLIPY —
the limit from the Partner Panel. Requests are used by search, loading the next page of the feed and trending GIFs.

What to do:

- **wait** — the limit is per hour, and search will work again within an hour;
- **switch to another source** in the “GIFs” mode or **get a key for the second service** — each key has its own
  limit.

More about limits and keys — in [“GIF keys”](./setup/gif-keys#limits).

## Keys and token are gone after updating from the archive

The browser tells extensions from an archive apart by the folder they are loaded from. If you unpack the new version
into a different folder, the browser installs it as a new extension — with empty “Settings”. Enter the GIF keys again,
and your own bot token if you set one, and from then on update the extension in the same folder — following the steps in
[“Updating”](./update#archive). Stickers and packs aren’t lost: they are stored on the amo site, not in the extension.

## How to view a sticker or GIF larger

Press and hold the main mouse button on a sticker or GIF in the feed for more than 300 ms: an enlarged picture appears
over the whole page, and animation plays. Without releasing the button, move the cursor over other stickers or GIFs:
the preview immediately shows the one under the cursor. Release the button, and the preview closes without sending
the sticker or GIF. A short click sends it as usual. A finger touch doesn’t open the preview by holding:
on a touchscreen, use the menu.

Another way: right-click a sticker or GIF (or press the context menu key or Shift+F10), then choose “Preview”. This
preview doesn’t close on its own. Close it with the Escape key, by clicking anywhere on the page or with the “Close
preview” button. Escape closes only the preview, and the panel stays open. You can’t switch stickers with the cursor
in this preview: that needs the hold.

If holding doesn’t open the preview, keep the cursor still while you hold the button: moving it by more than 6
px cancels the hold. The right and middle mouse buttons don’t open the preview.

## How to share a pack from Telegram

Click “…” in the pack header above its stickers and choose “Copy link”: a link like t.me/addstickers/Name goes
to the clipboard, and “Pack link copied” appears at the bottom of the panel. You can send it in a chat or paste it on the
“Add stickers” screen on another device. “My stickers” has no menu, and a pack without a Telegram set name has no “Copy link”
item.
