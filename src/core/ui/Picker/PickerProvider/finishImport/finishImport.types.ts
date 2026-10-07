import type { Pack } from '../../../../db.types';
import type {
  PickerScreen,
  SectionMotion,
} from '../../usePickerView/usePickerView.types';

export type FinishImportOptions = {
  /**
   * Экран поверх режима в момент завершения импорта; `null` — экрана нет.
   */
  screen: PickerScreen | null;

  /**
   * Импортированный пак.
   */
  pack: Pick<Pack, 'id' | 'title'>;

  /**
   * Открывает режим «Стикеры» и прокручивает ленту к разделу.
   */
  scrollToSection: (sectionId: string, motion: SectionMotion) => void;

  /**
   * Показывает итог импорта в статусе.
   */
  showStatus: (text: string) => void;
};

/**
 * Куда показать ошибку импорта: `field` — у поля ссылки на пак, `status` — в строке статуса.
 */
export type ImportErrorTarget = 'field' | 'status';
