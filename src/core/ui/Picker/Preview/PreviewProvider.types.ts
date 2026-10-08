import type { ComponentChildren } from 'preact';

import type { PanelPhase } from '../../../hoverPopup.types';

import type { PreviewDirection } from './previewDirection/previewDirection.types';

/**
 * Что показывает предпросмотр.
 */
export type PreviewTarget = {
  /**
   * Адрес картинки, которая уходит при отправке: версия стикера или GIF для отправки.
   */
  url: string;

  /**
   * Адрес облегчённого превью GIF; стоит на месте, пока грузится `url`. У стикера нет.
   */
  previewUrl?: string;

  /**
   * Эмодзи стикера: показывается над картинкой. У стикера без эмодзи и у GIF его нет.
   */
  emoji?: string | undefined;

  /**
   * Имя для скринридера: целая фраза словаря `CellNames.preview`.
   */
  name: string;
};

/**
 * Ячейка, на которую переключается закреплённый предпросмотр.
 */
export type PreviewStep = {
  /**
   * Что показывать.
   */
  target: PreviewTarget;

  /**
   * Кнопка ячейки: в неё возвращается картинка и на неё встаёт фокус при закрытии.
   */
  source: HTMLElement;
};

/**
 * Сосед ячейки ленты в направлении шага; `null` — край ленты, переключать некуда. Лента сама
 * прокручивается к соседу, чтобы он был виден целиком.
 */
export type PreviewNavigator = (
  source: HTMLElement,
  direction: PreviewDirection
) => PreviewStep | null;

/**
 * Как открыт предпросмотр: `hold` живёт, пока держат кнопку мыши, `pinned` — пока его не
 * закроют.
 */
export type PreviewMode = 'hold' | 'pinned';

/**
 * Открытый предпросмотр.
 */
export type PreviewState = {
  /**
   * Что показывать.
   */
  target: PreviewTarget;

  /**
   * Способ открытия.
   */
  mode: PreviewMode;

  /**
   * Элемент, из которого открыт предпросмотр: на него возвращается фокус при закрытии.
   */
  source: HTMLElement;

  /**
   * Предпросмотр закрыт и слой доигрывает уход (картинка возвращается в ячейку). По смыслу он
   * уже закрыт: удержание попапа снято, открыть или переключить его нельзя, слой курсор и фокус
   * не принимает.
   */
  isLeaving: boolean;

  /**
   * Навигатор ленты, из которой открыт закреплённый предпросмотр; `null` — стрелки его не
   * переключают: предпросмотр удержания и превью вне ленты.
   */
  navigate: PreviewNavigator | null;

  /**
   * Предпросмотр переключён стрелкой хоть раз: имя ячейки объявляется скринридеру только после
   * шага — при открытии диалог объявляется своим именем.
   */
  isStepped: boolean;
};

export type PreviewContextValue = {
  /**
   * Открытый предпросмотр; `null` — закрыт.
   */
  preview: PreviewState | null;

  /**
   * Открывает предпросмотр на время удержания кнопки.
   */
  openHold: (target: PreviewTarget, source: HTMLElement) => void;

  /**
   * Переключает предпросмотр, открытый удержанием, на другую ячейку: указатель с зажатой
   * кнопкой вошёл на неё. Закрытый и закреплённый предпросмотр не меняется.
   */
  swapHold: (target: PreviewTarget, source: HTMLElement) => void;

  /**
   * Открывает закреплённый предпросмотр. С навигатором ленты его переключают стрелки, без него —
   * нет.
   */
  openPinned: (
    target: PreviewTarget,
    source: HTMLElement,
    navigate?: PreviewNavigator | null
  ) => void;

  /**
   * Переключает открытый закреплённый предпросмотр с навигатором на соседнюю ячейку. На краю
   * ленты, у предпросмотра удержания, без навигатора и у уходящего ничего не меняется.
   */
  step: (direction: PreviewDirection) => void;

  /**
   * Закрывает предпросмотр: слой доигрывает уход, а не пропадает сразу. Закрытый и уже
   * уходящий предпросмотр остаётся как есть.
   */
  close: () => void;

  /**
   * Уход доигран: снимает слой. Состояние снимается, только если оно всё ещё то, что слой
   * уводил, — уход, отменённый повторным открытием, нового предпросмотра не закроет.
   */
  finishLeave: (leaving: PreviewState) => void;
};

export type PreviewProviderProps = {
  /**
   * Фаза панели: закрытая панель закрывает предпросмотр.
   */
  phase: PanelPhase;

  /**
   * Дерево панели, в котором работает `usePreview`.
   */
  children: ComponentChildren;
};
