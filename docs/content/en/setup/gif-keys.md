# GIF keys

GIF search in the “GIFs” mode works through the KLIPY and GIPHY services. amo stickers has no shared key: everyone
gets their own free key. One is enough; with two, the “GIFs” mode will have more sources, and each has its own request
limit.

The keys are stored only in your browser, and each goes only to its own service: the KLIPY key — to KLIPY, the GIPHY
key — to GIPHY.

## KLIPY — recommended

Start with KLIPY if you choose one service: it has a wider selection of GIFs and stickers.

1. Open the [KLIPY Partner Panel](https://partner.klipy.com/) and sign up or sign in.
2. Go to the keys page — [partner.klipy.com/api-keys](https://partner.klipy.com/api-keys). Click “Add Platform” and
   enter any name, for example `amo stickers`, then click “Create Key” on the platform. A test key with the “Testing”
   status, which the panel issues right away, works for amo stickers.
3. Click “Show key” on the key and copy it.
4. In amo, open the amo stickers panel with the sticker button in the message field, and click “Settings” at the
   bottom of the panel.
5. Paste the key into the “KLIPY API key” field. The key saves on its own — as soon as you stop typing, leave the field
   or press Enter.

![API Keys page in the KLIPY Partner Panel: a platform with an app, a hidden key with “Show key”, the “Testing” status and the “Add Platform” and “Create Key” buttons](../../img/setup/klipy-api-keys.png)

When you leave the field or press Enter, amo stickers checks the key with a request to the service. The result is under
the field:

- “Checking the key…” — the check is running;
- “The key works” — you’re all set;
- “KLIPY rejected the key” — the key was copied partially or with extra characters: copy it again and paste it instead
  of the old one;
- “Couldn’t check the key” — the service didn’t respond: there is no network or the key hit the [request
  limit](#limits). The key is saved, check the “GIFs” mode later.

Check it: the “KLIPY” source has appeared in the “GIFs” mode: without a query, the feed shows trending GIFs; with a
query, search results.

![amo stickers “GIFs” mode: the “KLIPY” source is selected, the feed shows search results for a query](../../img/setup/gif-mode-klipy.png)

## GIPHY

1. Open the [GIPHY developer dashboard](https://developers.giphy.com/dashboard/) and sign up or sign in.
2. Click “Create an API Key”, choose the “API” type, not “SDK”, and click “Next Step”.
3. Enter an app name and description — anything, for example `amo stickers` and `Stickers for amo`, — accept the
   terms and create the key.
4. Copy the key from the list of apps on the dashboard.
5. In the amo stickers “Settings”, paste the key into the “GIPHY API key” field. It saves on its own, and the check
   result appears under the field — as with the KLIPY key, only with “GIPHY rejected the key” for a wrong key.

<img src="../../img/setup/giphy-dashboard.png" alt="The “Create A New API Key” window in the GIPHY developer dashboard: the “API” type is selected, the “Next Step” button" width="550">

Check it: the “GIPHY” and “GIPHY stickers” sources have appeared in the “GIFs” mode. Both work with one GIPHY key.

## Request limit {#limits}

Free keys are test keys, and they have a request limit:

- **GIPHY** — 100 requests per hour;
- **KLIPY** — 100 requests per hour according to KLIPY at the time of writing; the current number is in the Partner
  Panel.

Each key has its own limit: the key is personal, and requests of other amo stickers users don’t use it up. Requests are
used by:

- **search** — every time you stop typing in the search field;
- **loading the next page** — when the feed is scrolled to the end, amo stickers loads the next batch of GIFs;
- **trending** — the feed without a query when the “GIFs” mode opens;
- **key check** — one request when you change the key in “Settings”.

The “GIPHY” and “GIPHY stickers” sources share one limit — the limit of the GIPHY key.

**If you hit the limit**, search in this source will stop finding GIFs, and an error will appear in the status bar.
Wait: the limit is per hour, and search will work again within an hour. Or switch to another source — if you don’t
have a key for the second service yet, get one following the steps above. Recent GIFs in the feed without a query stay
at hand.
