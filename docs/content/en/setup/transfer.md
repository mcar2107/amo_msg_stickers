# Moving your library

Packs and custom stickers are stored in the browser, on the amo site. Another browser or another computer doesn’t
have them — move them with an `.amostickers` file: export the library here and load it there.

::: warning The library lives in the browser
Clearing the amo site data in the browser settings deletes all packs and custom stickers. The export file is a backup
of your library: export it from time to time, and after clearing you can load it back.
:::

## 1. Export the library {#export}

In the “Stickers” mode, click “+” → “File” → “Export library”.

<!-- скрин: img/setup/file-segment.png — the “Add stickers” screen, the “File” tab: the “Load from file” group with the drop zone and the “Choose file” button, below it the “Export to file” group with the “Export library” button -->

The browser downloads an `amo-stickers-<date>.amostickers` file — as a regular download, to your downloads folder.
It has all packs and custom stickers. The export progress is shown next to the button, and at the end — “Library
exported, stickers: N”. While the library has no stickers, the button is unavailable.

## 2. Load the file in the new place {#import}

[Install amo stickers](../install/) in the new browser, open amo and click “+” → “File”. Click “Choose file” or drop
the file onto the zone. A `.zip` will do too — if the file was renamed or unpacked and packed again with an archiver.

<!-- скрин: img/setup/file-import.png — the “File” tab with a file chosen: the “Packs in the file” card with the packs and the “New packs: N, stickers: M” total, the “Import” button in the footer -->

The card under the zone shows the packs in the file: how many stickers a new pack has and how many will be added
to a pack you already have. Click “Import”. First the stickers are checked — “Cancel” stops it, then “Saving…” — this
can’t be interrupted. At the end — “Stickers added: N”, and the feed scrolls to the first section that got new
stickers.

You can leave the screen — the chosen file and the card stay, and the import progress moves to the bottom of the panel.

## What loading does {#merge}

- **It only adds.** Your packs and stickers stay as they are: a pack you already have gets only the stickers it
  doesn’t have yet, at the end.
- **Custom stickers** from the file, including someone else’s file, go to “My stickers”.
- **Loading the same file again** doesn’t create duplicates: the card says “Everything in this file is already in your
  library”.
- **Captions and emoji** are kept, and a pack from Telegram keeps its “Copy link”.
- **Recent** doesn’t change. Where new packs go — in the [FAQ](../faq#pack-order).
- **Canceling, an error or a lack of space** leave the library as it was.

## Share a pack {#share-pack}

The “…” menu in a pack header → “Export pack”. The file is named after the pack, for example `Cats.amostickers` —
send it to a colleague, and they load it the same way: “+” → “File”. “My stickers” has only this item in the menu.

A pack from Telegram is easier to share with a link — “Copy link” in the same menu, and a file suits custom stickers
and a pack that has been deleted from Telegram.

## What’s in the file {#contents}

Stickers, their emoji and captions, pack names and Telegram set names. A whole library export also has when each pack
was added and when a sticker was last sent from it: in the new place, packs line up in the same order. GIF keys, the
bot token, recent items and settings aren’t in the file, so it’s safe to forward. More — in
the [privacy policy](../privacy#export-file).

## If it didn’t work {#errors}

A loading error appears under the zone, and if you left the screen — at the bottom of the panel too. An export error
appears at the bottom of the panel.

- **“This is not an amo stickers file”** — a different file or archive was chosen.
- **“The file is corrupted or not fully downloaded”** — download the file again or export the library once more.
- **“The file was exported by a newer version of amo stickers”** — [update amo stickers](../update).
- **“Not enough browser storage”** — free up disk space and click “Import” again.
- **“The library doesn’t fit in one file”** — a file holds up to 10,000 stickers and is under 4 GB. Export packs
  one at a time from the “…” menu.
