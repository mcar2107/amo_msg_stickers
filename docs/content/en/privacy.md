# Privacy policy

amo stickers is a browser extension and a userscript for the amo messenger. amo stickers has no server of its own:
everything the extension stores stays in your browser, and nothing goes to the developer.

## What is stored in the browser

**Your own GIF keys and your own Telegram bot token**, if you entered them in “Settings”:

- for the extension — in the extension storage; the amo page and its scripts can’t see it;
- for the userscript in a script manager (for example, Tampermonkey) — in the manager storage; the amo page and its
  scripts can’t see it;
- for the userscript without manager storage — for example, if the script is added to the page directly or the manager
  doesn’t provide its own storage — in the amo site storage (`localStorage`). It is available to scripts on the amo
  page.

**Stickers and history** — in the amo site storage (IndexedDB and `localStorage`) with any installation method:

- imported Telegram packs and your own stickers — ready GIFs and their captions;
- recent stickers and recent GIFs — up to 40 of each kind; for GIFs — a link to the file and the title;
- the selected panel mode — “Stickers” or “GIFs”.

Stickers and history are deleted together with the amo site data in the browser settings. Keys and the token in the
extension or manager storage are deleted together with the extension or the script, and in the amo site storage —
together with its data.

## What is sent and where

amo stickers contacts only three services and only when you use them:

- **GIPHY and KLIPY** — GIF search. The service receives the search query, a key and the interface language: GIPHY —
  your key, KLIPY — the built-in amo stickers key or yours, if you set your own in “Settings”. Trending GIFs are
  requested without a query.
- **Telegram** (`api.telegram.org`) — pack import. Telegram receives the pack name and a bot token: the built-in amo
  stickers bot’s or yours, if you set your own token in “Settings”.

The browser loads files from these services’ servers: GIF images in the feed, GIF files when sending and sticker
files when importing. The server receives a regular browser request — including your IP address.

A sent sticker or GIF goes to amo as a regular message attachment — just like a file you pasted into the message field
yourself. After that, amo handles it according to its own rules.

## What the developer receives

Nothing. amo stickers has no analytics, counters or error reports, and it doesn’t contact any addresses other than those
listed above. Your own keys, your own token, stickers, search queries and messages aren’t sent to the developer.

Import with the built-in bot and search with the built-in KLIPY key bypass the developer too: the requests go from your
browser straight to Telegram and KLIPY, and pack names and search queries aren’t sent to the developer. Besides, the Bot
API doesn’t show the bot owner which packs were requested through it.

The extension and script files are downloaded from GitHub, and Tampermonkey checks for script updates there. GitHub
shows the developer only the total number of release file downloads.

## Changes

If amo stickers starts storing or sending anything else, this page will change before such a version is released.
Questions — in [issues on GitHub](https://github.com/mcar2107/amo_msg_stickers/issues).
