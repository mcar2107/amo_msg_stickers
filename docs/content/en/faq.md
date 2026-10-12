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

## GIF search stopped working

- **“The built-in KLIPY key is unavailable”** — the shared key hit its limit or was revoked: get
  [your own](./setup/gif-keys#own-klipy).
- **Your own key hit its [limit](./setup/gif-keys#limits)** — wait an hour or switch to another source.

## “The message field has text or attachments”

amo has changed the page, and the sticker goes the fallback way — through the message field, as an attached file.
So that it isn’t sent with your draft, the field must be empty: send or delete what you typed. “Finish editing
the message first” is the same while editing. It happens every time — report
it in [issues](https://github.com/mcar2107/amo_msg_stickers/issues).

## Keys and token are gone after updating from the archive

The new version was unpacked into a different folder, and the browser installed it as a new extension. Enter the keys
and the token again and from then on update in the same folder — [“Updating”](./update#archive). Stickers and packs are
safe: they are stored on the amo site.
