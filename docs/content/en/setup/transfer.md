# Moving your library

Packs, custom stickers, favorites and recent items are stored in the browser, on the amo site. Another browser
or another computer doesn’t have them — move them with an `.amostickers` file: export the library here and load
it there.

::: warning The library lives in the browser
Clearing the amo site data in the browser settings deletes all packs, custom stickers, favorites and recent items.
The export file is a backup of your library: export it from time to time, and after clearing you can load it back.
:::

## 1. Export the library {#export}

Open “Settings” — the icon at the bottom right of the panel — and click “Export library” in the “Library” group.
The “Export library” link on the “File” tab of the “Add stickers” screen leads there too.

<img src="../../img/setup/settings-library.png" alt="The amo stickers “Settings” screen scrolled down: the “Library” group with the description, the “Export library” button and the “Load from file” link" width="364">

The browser downloads an `amo-stickers-<date>.amostickers` file — as a regular download, to your downloads folder.
It has all packs and custom stickers, favorites, and recent stickers and GIFs. The export progress is shown next
to the button, and at the end — “Library exported, stickers: N”, or just “Library exported” for a library
with no stickers, only GIFs. While there’s nothing to export — no stickers, favorites or recent GIFs — the button
is unavailable.

The library file is for moving your own library: it has your favorites and send history. To share stickers, use a [pack
file](#share-pack).

## 2. Load the file in the new place {#import}

[Install amo stickers](../install/) in the new browser, open amo and click “+” → “File” — or the “Load from file” link
under the export button in “Settings”. Click “Choose file” or drop the file onto the zone. A `.zip` will do too —
if the file was renamed or unpacked and packed again with an archiver.

<img src="../../img/setup/file-import.png" alt="The “Add stickers” screen, the “File” tab: in place of the zone — the card of the amo-stickers-2026-10-18.amostickers file with the “Replace file” button, four new packs and the “New packs: 4, stickers: 150” total, the “Import” button in the footer" width="364">

The card takes the place of the zone and shows the packs in the file: how many stickers a new pack has and how many will
be added to a pack you already have — and below them, how many items will be added to favorites and to recent. A long
list of packs scrolls inside the card, and “Replace file” in its corner picks another file. Click “Import”. First
the stickers are checked — “Cancel” stops it, then “Saving…” — this can’t be interrupted. At the end — “Stickers added:
N”, and the feed scrolls to the first section that got new stickers, including “Favorites” or “Recent”. If no stickers
were added but favorites or recent items were, the end shows “Favorites and recent added”.

You can leave the screen — the chosen file and the card stay, and the import progress moves to the bottom of the panel.

## What loading does {#merge}

- **It only adds.** Your packs and stickers stay as they are: a pack you already have gets only the stickers it doesn’t
  have yet, at the end. Where new packs go — in the [FAQ](../faq#pack-order).
- **Custom stickers** from the file, including someone else’s file, go to “My stickers”.
- **Favorites and recent items** from the file are added to yours: nothing of yours is removed, and what’s already
  in favorites doesn’t change. Recent keeps the 40 latest stickers and the 40 latest GIFs, and an item that’s in both
  gets the later send time.
- **Loading the same file again** doesn’t create duplicates — in packs, favorites or recent: the card says “Everything
  in this file is already in your library”.
- **Captions and emoji** are kept, and a pack from Telegram keeps its “Copy link”.
- **Canceling, an error or a lack of space** leave the library, favorites and recent as they were.

## Share a pack {#share-pack}

The “…” menu in a pack header → “Export pack”. The file is named after the pack, for example `Cats.amostickers` —
send it to a colleague, and they load it the same way: “+” → “File”. “My stickers” has only this item in the menu.

A pack from Telegram is easier to share with a link — “Copy link” in the same menu, and a file suits custom stickers
and a pack that has been deleted from Telegram.

To share stickers, use a pack file: it has only the pack’s stickers, with no favorites or recent items. The library file
is personal: whoever you send it to will see your favorites and send history.

## What’s in the file {#contents}

Stickers, their emoji and captions, pack names and Telegram set names. A whole library export also has when each pack
was added and when a sticker was last sent from it (in the new place, packs line up in the same order), favorites,
and recent stickers and GIFs with their send time. A pack export has neither favorites nor recent items. GIF keys,
the bot token and settings aren’t in any file. More — in the [privacy policy](../privacy#export-file).

## If it didn’t work {#errors}

A loading error appears under the zone, and if you left the screen — at the bottom of the panel too. An export error
appears at the bottom of the panel.

- **“This is not an amo stickers file”** — a different file or archive was chosen.
- **“The file is corrupted or not fully downloaded”** — download the file again or export the library once more.
- **“The file was exported by a newer version of amo stickers”** — [update amo stickers](../update).
- **“Not enough browser storage”** — free up disk space and click “Import” again.
- **“The library doesn’t fit in one file”** — a file holds up to 10,000 stickers and is under 4 GB. Export packs
  one at a time from the “…” menu.
