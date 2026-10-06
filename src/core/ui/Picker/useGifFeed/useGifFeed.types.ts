import type { RemoteGif } from '../../../db.types';
import type { PickerScreen } from '../usePickerView/usePickerView.types';

/**
 * Какая страница выдачи грузится: первая по запросу или следующая при прокрутке.
 */
export type FeedLoading = 'first' | 'more';

export type GifFeedState = {
  /**
   * Загруженная выдача в порядке источника: все подгруженные страницы подряд.
   */
  gifs: RemoteGif[];

  /**
   * Запрос после debounce без пробелов по краям — по нему загружается выдача; пустая строка —
   * тренды.
   */
  term: string;

  /**
   * Какая страница грузится сейчас; `null` — ничего не грузится.
   */
  loading: FeedLoading | null;

  /**
   * Первая страница по текущему запросу пришла пустой — показывается «Ничего не нашлось».
   */
  isNothingFound: boolean;

  /**
   * Текст ошибки последней загрузки для показа на месте пустой выдачи; `null` — показывать
   * нечего (`shouldShowFeedFailure`).
   */
  failure: string | null;

  /**
   * Номер сброса выдачи: растёт на каждую перезагрузку с первой страницы — открытие пикера, смену
   * источника, запроса или ключей.
   */
  resetId: number;

  /**
   * Подгружает следующую страницу, если ленту прокрутили ближе чем на 200 px к концу и
   * источник сообщил о продолжении.
   */
  checkScroll: (element: HTMLElement) => void;
};

export type ShouldShowFeedErrorOptions = {
  /**
   * Ошибка пришла на последний запрос ленты, а не на устаревший.
   */
  isLatest: boolean;

  /**
   * Экран поверх режима на старте загрузки; `null` — экрана не было.
   */
  startScreen: PickerScreen | null;

  /**
   * Экран поверх режима в момент ошибки; `null` — экрана нет.
   */
  screen: PickerScreen | null;
};

export type ShouldShowFeedFailureOptions = {
  /**
   * Текст ошибки последней загрузки; `null` — она прошла или ещё идёт.
   */
  failure: string | null;

  /**
   * Сколько GIF в выдаче.
   */
  gifCount: number;

  /**
   * Идёт ли загрузка.
   */
  isLoading: boolean;
};
