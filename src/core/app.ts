import { readAmoLocale } from './i18n/locale';
import { setLocale, t } from './i18n/translate';
import { createPicker } from './ui/createPicker';
import { stickerIcon } from './ui/icons';
import {
  composerOf,
  findComposers,
  injectMessageStyle,
  isDarkTheme,
  watchSystemTheme,
} from './amoDom';
import type { ButtonMarkup, Composer } from './amoDom.types';
import { toStickerGif } from './convert';
import { getSticker, pushRecent } from './db';
import type { SendItem } from './db.types';
import { sendFileName } from './fileName';
import type { Host } from './host.types';
import { createHoverPopup } from './hoverPopup';
import type { OpenedBy } from './hoverPopup.types';
import { MAX_REMOTE_GIF_BYTES } from './net';
import { createPageClient, fileInputOf } from './pageClient';
import { isPageEscape } from './pageEscape';
import { SendError, sendFile, toCheckedGifFile, toGifFile } from './sender';
import { MAX_GIF_BYTES } from './sidePick';

const MARK = 'data-amo-stickers';

/**
 * Задержка открытия наведением: курсор, который прошёл кнопку по пути в другое место,
 * попап не открывает.
 */
const HOVER_OPEN_DELAY_MS = 250;

/**
 * Задержка закрытия после ухода курсора: её хватает, чтобы перевести курсор с кнопки на
 * попап через промежуток между ними.
 */
const HOVER_CLOSE_DELAY_MS = 500;

export const start = (host: Host) => {
  setLocale(readAmoLocale());
  if (window.__amoStickers) return;
  window.__amoStickers = true;
  injectMessageStyle();

  let activeButton: HTMLElement | null = null;

  /**
   * Кнопка разметки у каждой вставленной обёртки: цвет иконки меняется классами той разметки, в
   * поле которой обёртка стоит, а поле к моменту закрытия попапа может уже исчезнуть.
   */
  const buttonMarkups = new WeakMap<HTMLElement, ButtonMarkup>();

  /**
   * Классы цвета иконки в закрытом и открытом состоянии — свои у разметки поля: они заменяют
   * друг друга, а не дополняют (`ButtonMarkup`).
   *
   * @param button — обёртка кнопки стикеров; null — попап ни у какой кнопки не открыт
   * @param isOpen — открыт ли попап у этой кнопки
   */
  const setIconOpen = (button: HTMLElement | null, isOpen: boolean) => {
    const markup = button && buttonMarkups.get(button);
    const icon = button?.querySelector('svg');

    if (!icon || !markup) return;
    const { idleClasses, openClasses } = markup;

    icon.classList.remove(...(isOpen ? idleClasses : openClasses));
    icon.classList.add(...(isOpen ? openClasses : idleClasses));
  };

  const pageClient = createPageClient(document, fileInputOf);

  const toFile = async (item: SendItem) => {
    switch (item.kind) {
      case 'local': {
        const sticker = await getSticker(item.stickerId);

        if (!sticker) throw new SendError(t('error.send.stickerDeleted'));

        return toGifFile(sticker.blob, sendFileName(item, sticker));
      }

      case 'remote': {
        const blob = await host.fetchBlob(item.gif.url, MAX_REMOTE_GIF_BYTES);
        const file = await toCheckedGifFile(blob, sendFileName(item));

        if (file.size <= MAX_GIF_BYTES) return file;

        /**
         * Решение — по весу скачанного файла, а не по весу из выдачи: так пережимается и
         * GIF из выдачи без весов, и недавняя GIF со ссылкой на тяжёлую версию. Проверка
         * GIF идёт до конвертации — страница ошибки получит «Файл не похож на GIF», а не
         * ошибку декодера.
         */
        const { blob: gif } = await toStickerGif(file, 'image');

        return toGifFile(gif, file.name);
      }

      default: {
        const unknownItem: never = item;

        throw new Error(`Unknown send item: ${JSON.stringify(unknownItem)}`);
      }
    }
  };

  const send = async (item: SendItem) => {
    const composer = activeButton && composerOf(activeButton);

    if (!composer) throw new SendError(t('error.send.noComposer'));

    await sendFile(composer, await toFile(item), pageClient);
    await pushRecent(item);
  };

  const picker = createPicker(host, {
    onSend: send,
    /**
     * Пикер закрывается и изнутри (Escape, успешная отправка) — контроллер наведения
     * узнаёт об этом здесь, иначе он считал бы попап открытым.
     */
    onClose: () => {
      setIconOpen(activeButton, false);
      activeButton = null;
      hoverPopup.dismiss();
    },
    onHoldRelease: () => {
      hoverPopup.release();
    },
  });

  /**
   * Тема читается заново на каждом источнике её смены, а не держится с подписки: поле
   * Worker-версии, от которого зависит системная тема, страница рисует после старта.
   */
  const syncTheme = () => {
    picker.setTheme(isDarkTheme());
  };

  syncTheme();

  const show = (button: HTMLElement, openedBy: OpenedBy) => {
    activeButton = button;
    /**
     * Хост попапа живёт внутри кнопки: position:fixed считается от ближайшего предка
     * с transform — контейнера поля ввода, как у родного попапа эмодзи, или самой обёртки
     * кнопки (`ButtonMarkup.anchor`). Поэтому и курсор над попапом остаётся внутри обёртки.
     *
     * Уже вставленный в эту кнопку хост не переставляется: перестановка узла сбросила бы
     * переход уходящей панели, и возврат курсора во время ухода мигнул бы ею.
     */
    if (picker.element.parentElement !== button) button.append(picker.element);
    setIconOpen(button, true);
    syncTheme();
    const markup = buttonMarkups.get(button);

    /**
     * Высота считается на каждом открытии, а не держится с монтирования: над кнопкой
     * становится меньше места с плашкой ответа и многострочным текстом.
     */
    picker.open(openedBy, {
      by: markup?.anchor || 'composer',
      maxHeight: markup?.panelHeight?.(button) || null,
    });
  };

  /**
   * У каждого поля ввода своя кнопка, а попап один: контроллер открывает его у той кнопки,
   * что его вызвала.
   */
  const hoverPopup = createHoverPopup<HTMLElement>({
    openDelay: HOVER_OPEN_DELAY_MS,
    closeDelay: HOVER_CLOSE_DELAY_MS,
    onOpen: (openedBy, button) => {
      show(button, openedBy);
    },
    onClose: () => {
      picker.close();
    },
    /**
     * Фокус в поле попапа, диалог файла, импорт или конвертация — уход курсора попап не
     * закрывает, клик вне него и Escape закрывают всегда, в том числе Escape вне панели.
     */
    isHeld: () => {
      return picker.isHeld();
    },
    /**
     * Сразу открывается только панель, уходящая у той же кнопки: у другого поля ввода
     * попап открывается с обычной задержкой.
     */
    isLeaving: (button) => {
      return picker.isClosing && picker.element.parentElement === button;
    },
  });

  const mount = ({ emojiWrap, markup: { button } }: Composer) => {
    const wrap = document.createElement('div');

    wrap.setAttribute(MARK, '');
    wrap.className = button.wrapClass;
    /**
     * Обёртка — контейнер `fixed`-панели только там, где у поля ввода нет предка с transform:
     * добавить transform полосе поля нельзя — внутри неё `fixed`-панель форматирования
     * страницы, и она уехала бы.
     */
    if (button.anchor === 'button') wrap.style.transform = 'translateZ(0)';
    buttonMarkups.set(wrap, button);
    const inner = document.createElement('div');

    inner.className = button.innerClass;
    /**
     * title на inner, а не на wrap: иначе подсказка всплывает над всем попапом.
     */
    inner.title = t('picker.title');
    inner.innerHTML = stickerIcon(button.iconClass, button.iconFill);
    inner.addEventListener('click', () => {
      hoverPopup.click(wrap);
    });
    wrap.addEventListener('mouseenter', () => {
      hoverPopup.enter(wrap);
    });
    wrap.addEventListener('mouseleave', () => {
      hoverPopup.leave();
    });
    wrap.append(inner);
    emojiWrap.after(wrap);
  };

  const scan = () => {
    let hasMounted = false;

    for (const composer of findComposers()) {
      if (composer.row.querySelector(`:scope > [${MARK}]`)) continue;
      mount(composer);
      hasMounted = true;
    }

    /**
     * Новое поле могло оказаться полем Worker-версии: без явной темы её тема — системная.
     */
    if (hasMounted) syncTheme();

    if (picker.isOpen && !picker.element.isConnected) picker.close();
  };

  let isScanScheduled = false;

  const scheduleScan = () => {
    if (isScanScheduled) return;
    isScanScheduled = true;
    requestAnimationFrame(() => {
      isScanScheduled = false;
      scan();
    });
  };

  const handleDocumentMouseDown = (event: MouseEvent) => {
    if (!hoverPopup.isOpen || !activeButton) return;

    const path = event.composedPath();

    /**
     * Клик по закреплённому предпросмотру: слой лежит вне кнопки, но закрывает только
     * предпросмотр, попап остаётся.
     */
    if (path.includes(activeButton) || path.includes(picker.previewElement)) return;

    hoverPopup.dismiss();
  };

  /**
   * Перехват в capture-фазе окна — раньше обработчиков страницы на любом узле: Escape вне пикера закрывает только
   * пикер и до страницы не доходит. Закрытый пикер Escape страницы не трогает.
   */
  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (!hoverPopup.isOpen || !activeButton) return;

    if (!isPageEscape(event, [activeButton, picker.previewElement])) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    hoverPopup.dismiss();
  };

  /**
   * `mouseout` без `relatedTarget` — курсор ушёл за окно: `mouseleave` обёртки при быстром
   * уходе с края страницы может не прийти, и попап, открытый наведением, остался бы висеть.
   */
  const handleDocumentMouseOut = (event: MouseEvent) => {
    if (!event.relatedTarget) hoverPopup.leave();
  };

  new MutationObserver(scheduleScan).observe(document.body, {
    childList: true,
    subtree: true,
  });
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-amo-theme'],
  });
  watchSystemTheme(syncTheme);

  document.addEventListener('mousedown', handleDocumentMouseDown, true);
  document.addEventListener('mouseout', handleDocumentMouseOut);
  window.addEventListener('keydown', handleWindowKeyDown, true);

  scan();
  console.info(`[amo-stickers] started (${host.name})`);
};
