# Safari

In Safari on a Mac, amo stickers can be installed as a userscript with the free Userscripts app.

::: warning No guarantees
This way isn’t tested: the script may work, or it may not. The tested way is a Chromium browser
([Chrome, Yandex Browser, Edge, Opera](./chromium)) or [Firefox](./firefox): there amo stickers is installed as an
extension or as a userscript in Tampermonkey.
:::

::: warning Where the keys are stored
Userscripts may keep settings not in the app itself but in the amo site storage. Then the GIF keys and your own bot
token are available to scripts on the amo page. If this matters to you, install amo stickers in a tested way — see
the links above.
:::

**Install Userscripts.**

1. Install the [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) app from the App Store and open it
   once.
2. In Safari, open Settings → Extensions and turn on Userscripts.
3. Open amo, click the Userscripts icon in the Safari toolbar and allow the extension to run on this site.

Once allowed, the amo site will appear in the Userscripts permissions list in the same settings.

![Safari settings, the Extensions section: Userscripts is on, web.amo.tm and api.telegram.org in the permissions list](../../img/install/safari-userscripts.png)

<!--@include: ../../_parts/en/userscript.md-->
