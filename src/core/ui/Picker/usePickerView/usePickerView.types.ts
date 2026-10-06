import type { PickerMode } from '../../../pickerMode.types';

/**
 * Экран с прокручиваемым телом: из него берётся метка тела `data-view`.
 */
export type View = {
  /**
   * Экран поверх режима.
   */
  kind: PickerScreen;
};

/**
 * Экран поверх режима.
 */
export type PickerScreen = 'add' | 'settings';

/**
 * Сегмент экрана «Добавить стикеры»: импорт пака из Telegram или свой стикер из файла.
 */
export type AddSegment = 'telegram' | 'custom';

/**
 * Способ перехода ленты к разделу. `'smooth'` — лента на виду и едет плавно (клик по вкладке);
 * `'instant'` — лента была под экраном, и раздел ставится сразу, без проезда под исчезающим
 * экраном.
 */
export type SectionMotion = 'smooth' | 'instant';

/**
 * Запрос прокрутки ленты стикеров к разделу.
 */
export type SectionAnchor = {
  /**
   * Раздел: id пака (`custom`, `tg:<имя>`) или `recent` — недавние стикеры.
   */
  sectionId: string;

  /**
   * Номер запроса, растёт на каждый: повторный запрос того же раздела снова прокручивает к
   * нему.
   */
  seq: number;

  /**
   * Способ перехода: плавно — только если в системе не включено уменьшение движения.
   */
  motion: SectionMotion;
};

export type PickerViewValue = {
  /**
   * Режим попапа: его выбирает нижний переключатель, а переход к разделу (`scrollToSection`)
   * переключает в «Стикеры».
   */
  mode: PickerMode;

  /**
   * Открытый экран поверх режима; `null` — экрана нет.
   */
  screen: PickerScreen | null;

  /**
   * Последний запрос прокрутки ленты стикеров; `null` — запросов не было.
   */
  anchor: SectionAnchor | null;

  /**
   * Переключает режим, закрывает экран и сохраняет режим для следующих открытий.
   */
  setMode: (mode: PickerMode) => void;

  /**
   * Открывает экран поверх режима.
   */
  openScreen: (screen: PickerScreen) => void;

  /**
   * Закрывает экран: под ним тот же режим с той же прокруткой.
   */
  closeScreen: () => void;

  /**
   * Открывает режим «Стикеры» без экрана и прокручивает ленту к разделу.
   */
  scrollToSection: (sectionId: string, motion: SectionMotion) => void;
};
