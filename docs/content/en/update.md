# Updating

How to update amo stickers depends on how you installed it.

## Extension from the Chrome Web Store

The browser updates the extension from the store by itself — you don’t need to do anything. A new version reaches
the store after review, so it sometimes arrives later than the archive and the userscript.

If you have the extension from the archive now, you can replace it with the extension from the store: remove
the extension from the archive and install it
from the [Chrome Web Store](https://chromewebstore.google.com/detail/amo-stickers/abjnjphijggkkdbbmkldhibgepgdcgip).
You will have to enter the GIF keys and your own bot token again; stickers and packs stay.

## Extension from the archive {#archive}

The archive doesn’t update by itself: the browser doesn’t know where to get a new version from.

1. Download the new archive from the same link:
   [amo-stickers.zip](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.zip) — it is
   always the latest version.
2. Delete everything inside the extension folder, but keep the folder itself. Unpacking over the old files would leave
   files that are no longer in the new version.
3. Unpack the new archive into the same folder.
4. On the extensions page (for example, <CopyCode text="chrome://extensions" />), click “Update” at the top of the page
   or the “Reload” icon (a circular arrow) on the amo stickers card.
5. Reload the amo tab.

![Chrome extensions page in developer mode: the “Update” button at the top and the “Reload” icon (a circular arrow) on the amo stickers card](../img/update/extensions-reload.png)

::: warning The same folder
Unpack the new version into the same folder as the old one. The browser treats an extension from a different folder as
a new extension, and you will have to enter the GIF keys and your own bot token again.
:::

The installed version is shown on the amo stickers card on the extensions page, the latest one — on the
[releases](https://github.com/mcar2107/amo_msg_stickers/releases/latest) page.

## Userscript

Tampermonkey checks for script updates and installs the new version by itself. To check right away, use the
Tampermonkey icon menu: “Utilities” → “Check for userscript updates”. The new version will start working after you
reload the amo tab.

![Tampermonkey icon menu on the amo page: the “Utilities” section is expanded, the “Check for userscript updates” item](../img/update/tampermonkey-check-updates.png)

In managers without guarantees — Violentmonkey, Userscripts in Safari — automatic updates aren’t tested. If the new
version hasn’t arrived, install it manually from the link
[amo-stickers.user.js](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.user.js).
