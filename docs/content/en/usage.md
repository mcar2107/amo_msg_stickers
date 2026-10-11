# How to use

## Panel

The sticker button is in the message field, next to the emoji button. Hovering opens the panel, a click pins it: then
it closes only with another click on the button, a click outside or Escape.

<img src="../img/usage/panel.png" alt="The amo stickers panel in the Stickers mode: tabs for Recent, My stickers and packs, the + button, and Stickers, GIFs and Settings at the bottom" width="364">

Tabs: “Recent” (up to 40 stickers), “My stickers” and packs from Telegram — the one you last sent from comes first.
Packs are reordered the next time the panel opens, not under your cursor.

## Sending

Click a sticker or GIF, and it’s sent as a separate message: the text and attachments in the message field stay
in place. If the reply bar is shown above the field, the sticker is sent as a reply.

A recipient without amo stickers gets a regular GIF, one with amo stickers sees a sticker without a bubble,
as in Telegram.

## Custom sticker {#custom}

<video width="364" autoplay loop muted playsinline aria-label="The Create sticker tile → Choose file → the caption “Привет!” → Save to “My stickers”: the sticker appears in My stickers">
  <source src="../img/usage/custom-sticker.webm" type="video/webm">
  <source src="../img/usage/custom-sticker.mp4" type="video/mp4">
</video>

An image, GIF, video or `.tgs` will do, and you can drop the file too. The caption is drawn on the sticker. The sticker
fits into 512 px, animation is cut to 4 seconds, and if the file is heavier than 2 MB, its side is reduced.

## GIFs

KLIPY search works without a key, a [GIPHY key](./setup/gif-keys) adds the “GIPHY” and “GIPHY stickers” sources. Without
a query, the feed shows recent GIFs and trending ones. A GIF heavier than 2 MB is recompressed before sending.

## Preview {#preview}

<video width="364" autoplay loop muted playsinline aria-label="A sticker is held down with the mouse button and shown large over the page; the cursor moves over other stickers with the button held, and the preview follows; the button is released and the preview closes">
  <source src="../img/usage/preview.webm" type="video/webm">
  <source src="../img/usage/preview.mp4" type="video/mp4">
</video>

Press and hold a sticker or GIF to see it large. Keep holding and move the cursor over the feed to switch the preview.
Release — it closes, and nothing is sent. If it doesn’t open, keep the cursor still. On a touch screen, use “Preview”
in the menu.
The preview opened from the menu closes with Escape or a click, and the arrow keys switch stickers and GIFs in it.

## Menu and deleting {#menu}

<div class="media-row">
<img src="../img/usage/menu.png" alt="Sticker context menu: Preview and Delete sticker" width="300">
<img src="../img/usage/pack-menu.png" alt="The … menu in a pack header: Copy link and Delete pack" width="300">
</div>

Open the menu of a sticker or GIF with a right click, the menu key or Shift+F10; recent items have “Remove from recent”
in it. A pack header has “…”: “Copy link” gives a link to [import](./setup/telegram) the pack on another device.
The recent header has “Clear”.

Confirm deleting and clearing with a second press within a couple of seconds — the first one changes the label
to “Really delete?”.
