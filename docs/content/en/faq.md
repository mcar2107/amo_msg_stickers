# FAQ

## There is no sticker button

1. **Reload the amo tab** — a tab opened before the installation won’t have the button.
2. **Is amo open in a browser?** amo stickers works on `*.amo.tm`.
3. **Is amo stickers turned on?** The extension — on <CopyCode text="chrome://extensions" />, the script —
   in the script manager dashboard. The script is on but doesn’t work — see the next question.

Everything is on, but there is no button — amo may have changed the page: report
it in [issues on GitHub](https://github.com/mcar2107/amo_msg_stickers/issues).

## Tampermonkey doesn’t run the script

The sign: the Tampermonkey icon on the amo page shows no count of running scripts. On the extensions page,
in the Tampermonkey “Details”, check:

- **“Allow User Scripts”** is on (Chrome, Edge, Yandex Browser, Opera). No such toggle — turn on “Developer mode”. See
  the “Userscript” tab of the [installation](./install/chromium) section;
- **site access** — to all sites or at least to amo;
- **amo stickers is turned on** in the Tampermonkey dashboard.

Reload the amo tab after each change.

## It doesn’t work in Violentmonkey or Safari

They aren’t tested, and fixes aren’t guaranteed. The tested ways are the extension or Tampermonkey
in [Chrome, Yandex Browser, Edge, Opera](./install/chromium) or [Firefox](./install/firefox).

## “Couldn’t parse the link” when importing

You need a pack link — `https://t.me/addstickers/Name` — or just the pack name, not a link to a message, a channel
or a sticker. How to copy it — in [“Import from Telegram”](./setup/telegram#pack-link).

## A pack moved in the feed {#pack-order}

“Favorites” if it has stickers, “Recent” and “My stickers” always come first, then Telegram packs: the one you last sent
a sticker from is higher. Sending from “Favorites” and “Recent” doesn’t change the order. A new pack from Telegram goes
first. A pack loaded from a [file](./setup/transfer) goes by the last-sent time from the file — only a whole library
export has it — and without it, after the packs you have already sent from.

Packs are reordered the next time the panel opens, not under your cursor.

## How to move stickers to another computer

Export the library to a file — “Settings” → “Library” → “Export library” — and load it in the new browser —
[“Moving your library”](./setup/transfer). The same file is a backup: packs and custom stickers are stored in the browser
and are lost when the amo site data is cleared.

## GIF search stopped working

- **“The built-in KLIPY key is unavailable”** — the shared key hit its limit or was revoked: get
  [your own](./setup/gif-keys#own-klipy).
- **Your own key hit its [limit](./setup/gif-keys#limits)** — wait an hour or switch to another source.

## “The message field has text or attachments”

A sticker goes as a separate message and doesn’t touch the message field. The error means it can’t be sent this way
right now — what to do depends on your draft.

- **A file is attached or you are editing a message** — in the new version of amo this is expected: the sticker waits
  so that the attachment or the edit isn’t lost. Send or remove the attachment, finish or cancel editing — and send
  the sticker again. Typed text doesn’t get in the way and stays in the field. “Finish editing the message first”
  is the same while editing.
- **No attachment, no editing** — amo has changed the page, and the sticker goes the fallback way — through the message
  field, as an attached file. So that it isn’t sent with your draft, the field must be empty: send or delete what you
  typed. It happens every time — report it in [issues](https://github.com/mcar2107/amo_msg_stickers/issues).

## Keys and token are gone after updating from the archive

The new version was unpacked into a different folder, and the browser installed it as a new extension. Enter the keys
and the token again and from then on update in the same folder — [“Updating”](./update#archive). Stickers and packs are
safe: they are stored on the amo site.

## Errors after updating amo stickers {#after-update}

A new version of amo stickers upgrades the sticker storage on the amo site, and amo tabs with the old and the new
version can’t use it at the same time.

- **“Reload your other amo tabs: they run an older version of amo stickers”** — another amo tab still runs the version
  from before the update, and the new one can’t open the storage. Reload or close the other amo tabs and open the panel
  again: this tab doesn’t need a reload.
- **“Reload the tab: amo stickers has been updated”** — amo stickers was updated in another tab, and this one runs
  the older version. Reload this tab.
- **A technical database error in English** — for example,
  `The requested version (1) is less than the existing version (2)` — in an amo tab opened before amo stickers was
  updated: amo stickers was updated while the tab was open. Reload this tab.
