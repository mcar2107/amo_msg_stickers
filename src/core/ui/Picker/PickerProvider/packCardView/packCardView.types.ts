import type { ImportCount } from '../PickerProvider.types';

/**
 * Название и размер пака для карточки.
 */
export type PackSummary = {
  /**
   * Название пака из Telegram — данные пользователя, не переводится.
   */
  title: string;

  /**
   * Всего стикеров в наборе.
   */
  total: number;
};

/**
 * Сбой превью, кроме «пак не найден»: карточки нет, импорт работает как без неё.
 */
export type NoPreview = {
  /**
   * Превью нет.
   */
  status: 'none';
};

/**
 * Telegram ответил, что пака нет: ошибка у поля, «Импорт» недоступна.
 */
export type NotFoundPreview = {
  /**
   * Пака нет.
   */
  status: 'notFound';

  /**
   * Текст ошибки, который показал бы импорт.
   */
  message: string;
};

/**
 * Ответ превью по имени пака: набор, «пак не найден» или сбой без превью.
 */
export type PreviewResult =
  | ({
      /**
       * Набор получен.
       */
      status: 'ready';

      /**
       * id, под которым пак лежал бы в библиотеке: есть ли он там, решается при показе, а не по
       * ответу — импорт и удаление меняют библиотеку, пока ответ в кэше.
       */
      packId: string;
    } & PackSummary)
  | NotFoundPreview
  | NoPreview;

/**
 * Последний принятый ответ превью и имя, к которому он относится.
 */
export type PreviewEntry = {
  /**
   * Имя пака, по которому пришёл ответ.
   */
  name: string;

  /**
   * Ответ превью.
   */
  result: PreviewResult;
};

/**
 * Превью набора с признаком библиотеки на момент показа.
 */
export type ReadyPreview = {
  /**
   * Набор получен.
   */
  status: 'ready';

  /**
   * Пак уже есть в библиотеке: импорт обновит его.
   */
  isInLibrary: boolean;
} & PackSummary;

/**
 * Превью для имени в поле: `loading` — запрос ещё не ответил или ждёт паузы ввода; `null` —
 * превью нет (пустое имя, нет токена, сбой без превью).
 */
export type PreviewView =
  | {
      /**
       * Запрос ещё не ответил или ждёт паузы ввода.
       */
      status: 'loading';
    }
  | ReadyPreview
  | NotFoundPreview
  | null;

/**
 * Что показывает карточка пака: заглушка загрузки, превью до импорта или пак, который
 * импортируется.
 */
export type PackCard =
  | {
      /**
       * Состав пака загружается.
       */
      status: 'loading';
    }
  | ({
      /**
       * Превью пака из поля до импорта.
       */
      status: 'preview';

      /**
       * Пак уже есть в библиотеке: импорт обновит его.
       */
      isInLibrary: boolean;
    } & PackSummary)
  | ({
      /**
       * Пак, который импортируется сейчас, с ходом импорта.
       */
      status: 'importing';

      /**
       * Сколько стикеров обработано.
       */
      done: number;
    } & PackSummary);

export type PackCardInput = {
  /**
   * Идёт импорт: карточка показывает его снимок, а не поле.
   */
  isImporting: boolean;

  /**
   * Название и размер импортируемого пака; `null` — набор ещё не получен.
   */
  snapshot: PackSummary | null;

  /**
   * Ход импорта; `null` — импорт не идёт.
   */
  progress: ImportCount | null;

  /**
   * Превью для имени в поле.
   */
  preview: PreviewView;
};
