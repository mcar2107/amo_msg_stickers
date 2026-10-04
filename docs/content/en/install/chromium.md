# Chrome, Edge, Yandex Browser, Opera

These steps also work for other Chromium browsers such as Brave and Vivaldi. There are three ways, pick one: the
extension from the Chrome Web Store (recommended), the extension from an archive or the userscript.

::::tabs
== Chrome Web Store
The recommended way is the extension from the Chrome Web Store: from the store it installs in a couple of clicks
and updates by itself.

1. Open the amo stickers page in the Chrome Web Store:
   [amo stickers](https://chromewebstore.google.com/detail/amo-stickers/abjnjphijggkkdbbmkldhibgepgdcgip).
2. Click “Add to Chrome” and confirm the installation. In other browsers the button may be named differently.
3. Open or reload the amo tab: the sticker button will appear in the message input next to the emoji button.

In Edge, first click “Allow extensions from other stores” on the Chrome Web Store page; in Opera, install the “Install
Chrome Extensions” extension — otherwise the browser won’t let you install an extension from the Chrome Web Store.

If you already have the extension from the archive, remove it before installing from the store. You will have to enter
the GIF keys again, and your own bot token if you set one; stickers and packs stay: they are stored on the amo
site, not in the extension.
== Archive
The archive is the same extension as in the Chrome Web Store, except that the browser loads it from a folder on your
computer.

::: warning The archive doesn’t update by itself
You need to install new versions manually — see below. Keep the extension in the same folder: if you unpack a new
version into a different folder, the browser will treat it as a new extension, and you will have to enter the GIF keys
again, and your own bot token if you set one.
:::

**Installation**

1. Download the latest archive:
   [amo-stickers.zip](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.zip).
2. Create a permanent folder for the extension, for example `Documents/amo-stickers`, and unpack the archive into it.
   The folder should contain the `manifest.json` file. Don’t delete or move this folder: the browser loads the
   extension from it.
3. Open the extensions page — type its address in the address bar:

   | Browser | Address |
   | --- | --- |
   | Chrome | <CopyCode text="chrome://extensions" /> |
   | Edge | <CopyCode text="edge://extensions" /> |
   | Yandex Browser | <CopyCode text="browser://extensions" /> |
   | Opera | <CopyCode text="opera://extensions" /> |
   | Brave | <CopyCode text="brave://extensions" /> |
   | Vivaldi | <CopyCode text="vivaldi://extensions" /> |

4. Turn on the “Developer mode” toggle. In Chrome, Yandex Browser and Opera it is in the top right corner of the page,
   in Edge — in the left panel.
5. Click “Load unpacked” and select the folder from step 2.
6. amo stickers will appear in the list of extensions. Open or reload the amo tab: a sticker button will appear in the
   message field next to the emoji button.

![Chrome extensions page: the “Developer mode” toggle is on, the “Load unpacked” button is below it](../../img/install/extensions-load-unpacked.png)

**Updating**

1. Download the new archive from the same link:
   [amo-stickers.zip](https://github.com/mcar2107/amo_msg_stickers/releases/latest/download/amo-stickers.zip).
2. Delete everything inside the extension folder, but keep the folder itself. Unpacking over the old files would leave
   files that are no longer in the new version.
3. Unpack the new archive into the same folder.
4. On the extensions page, click “Update” at the top of the page or the “Reload” icon (a circular arrow) on the amo
   stickers card.
5. Reload the amo tab.

The installed version is shown on the amo stickers card on the extensions page.
== Userscript
**Install Tampermonkey.** Tampermonkey is a script manager, and amo stickers is tested in it. Install it from
[tampermonkey.net](https://www.tampermonkey.net/): the site will offer the extension store of your browser. During
installation, the browser will warn you that the extension needs access to site data — without it the manager can’t
run the script.

**Allow Tampermonkey to run scripts.** Chromium browsers run user scripts only if this is allowed separately:

1. Open the extensions page (for example, <CopyCode text="chrome://extensions" />) and click “Details” on Tampermonkey.
   The “Manage extension” item in the Tampermonkey icon menu leads there too.
2. Turn on the “Allow User Scripts” toggle.
3. If there is no such toggle — this happens in browsers based on an older Chromium version — turn on “Developer mode”
   on the extensions page.

Without this step, Tampermonkey installs the script but doesn’t run it.

![Tampermonkey details page: the “Allow User Scripts” toggle is on](../../img/install/allow-user-scripts.png)

<!--@include: ../../_parts/en/userscript.md-->

::: info Violentmonkey — no guarantees
The script may also work in the [Violentmonkey](https://violentmonkey.github.io/) manager, but this way isn’t tested.
If something doesn’t work in Violentmonkey, install Tampermonkey following the steps above or the extension from the
“Archive” tab.
:::
::::
