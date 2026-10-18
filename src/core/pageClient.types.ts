import type { PageDims, PageRejectReason } from '@shared/pageBridge.types';

/**
 * Итог команды агенту: amo принял стикер в очередь или агент недоступен.
 */
export type PageSendResult =
  | {
      /**
       * amo принял сообщение: запасной путь для этого стикера закрыт.
       */
      status: 'accepted';
    }
  | {
      /**
       * Сообщение amo не передано — стикер можно отправить запасным путём.
       */
      status: 'unavailable';

      /**
       * Причина для консоли: отказ агента, `no-agent` — агент не ответил, `no-dims` — стороны
       * GIF не прочитались, и команда агенту не уходила.
       */
      reason: PageRejectReason | 'no-agent' | 'no-dims';
    };

/**
 * Узел, который клиент помечает атрибутом команды: поле ввода или `<input>` с файлом.
 */
export type MarkableNode = {
  /**
   * Ставит пометку.
   */
  setAttribute: (name: string, value: string) => void;

  /**
   * Снимает пометку.
   */
  removeAttribute: (name: string) => void;
};

/**
 * Скрытый `<input type="file">` с отправляемым файлом.
 */
export type FileNode = MarkableNode & {
  /**
   * Убирает узел из документа.
   */
  remove: () => void;
};

/**
 * Срез `document`, который нужен клиенту; `N` — тип узла с файлом: `<input>` в DOM, двойник в
 * тестах. Параметр типа нужен `append`: `FileNode` и `Node` друг с другом не совместимы, и
 * без него в клиент не пройдёт ни настоящий `document`, ни двойник.
 */
export type ClientDocument<N extends FileNode> = {
  /**
   * Подписка на ответ агента.
   */
  addEventListener: (type: string, listener: (event: Event) => void) => void;

  /**
   * Отписка от ответа агента.
   */
  removeEventListener: (type: string, listener: (event: Event) => void) => void;

  /**
   * Отправка команды агенту.
   */
  dispatchEvent: (event: Event) => boolean;

  /**
   * Куда кладётся `<input>` с файлом.
   */
  documentElement: {
    /**
     * Добавляет узел в документ.
     */
    append: (node: N) => void;
  };
};

/**
 * Клиент агента в мире страницы.
 */
export type PageClient = {
  /**
   * Отправляет файл через очередь amo от имени поля ввода; стороны GIF уходят в команде.
   */
  send: (editable: MarkableNode, file: File, dims: PageDims) => PageSendResult;
};
