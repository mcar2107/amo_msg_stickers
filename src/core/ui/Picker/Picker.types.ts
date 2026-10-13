import type { PanelPhase } from '../../hoverPopup.types';
import type { PanelAnchor } from '../createPicker.types';

export type PickerProps = {
  /**
   * Фаза панели: открытая, уходящая анимацией закрытия или скрытая. Скрытая остаётся в
   * дереве и сохраняет состояние.
   */
  phase: PanelPhase;

  /**
   * Тёмная тема страницы.
   */
  isDark: boolean;

  /**
   * Место и высота панели у кнопки, которая её открыла.
   */
  anchor: PanelAnchor;

  /**
   * Корень слоя предпросмотра на странице: оверлей рисуется в него, вне панели.
   */
  previewRoot: ShadowRoot;

  /**
   * Колбэк на закрытие пикера изнутри — по Escape.
   */
  onClose: () => void;
};
