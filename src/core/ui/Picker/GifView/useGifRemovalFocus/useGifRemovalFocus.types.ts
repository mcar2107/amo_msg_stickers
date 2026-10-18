import type { RefObject } from 'preact';

export type GifRemovalFocus = {
  /**
   * Ссылка для кнопки «Открыть настройки»: без ключей поля поиска нет, и фокус после удаления
   * уходит на неё.
   */
  settingsRef: RefObject<HTMLButtonElement>;

  /**
   * Запоминает цели фокуса перед правкой ячейки: «Убрать из недавних» или пунктом избранного.
   */
  expectCellChange: (sectionId: string, key: string) => void;

  /**
   * Запоминает цель фокуса перед «Очистить».
   */
  expectRecentClear: () => void;

  /**
   * Снимает запомненные цели: правка не применилась, и фокус не должен уйти по ним на следующей,
   * чужой перерисовке ленты.
   */
  cancelExpected: () => void;
};

/**
 * Ячейка ленты GIF, на которую встаёт фокус.
 */
export type GifFocusCell = {
  /**
   * Раздел ячейки.
   */
  sectionId: string;

  /**
   * Ключ GIF (`gifKey`).
   */
  key: string;
};
