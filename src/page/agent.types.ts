import type { BuildMessageFailure } from './buildMessage.types';
import type { InputEventClass, PendingSend } from './coreSend.types';
import type { AttachedReply } from './refersTo.types';
import type { CoreCatcher, CoreHost } from './workerCore.types';

/**
 * Узел DOM, как его читает агент: атрибут пометки и, у `<input>`, файлы.
 */
export type AgentNode = {
  /**
   * Значение атрибута; null — атрибута нет.
   */
  getAttribute: (name: string) => string | null;
};

/**
 * Срез `document`, который нужен агенту: события протокола и поиск помеченных узлов.
 */
export type AgentDocument = {
  /**
   * Подписка на команды ядра.
   */
  addEventListener: (type: string, listener: (event: Event) => void) => void;

  /**
   * Отправка ответа ядру.
   */
  dispatchEvent: (event: Event) => boolean;

  /**
   * Узлы с атрибутом пометки: `[<атрибут>]`.
   */
  querySelectorAll: (selector: string) => Iterable<AgentNode>;
};

/**
 * Что агент помнит между командами.
 */
export type AgentMemory = {
  /**
   * Ключи (`replyKey`) ответов, снятие которых агент запросил и ещё не дождался: стикер в это
   * окно уходит без цитаты, а не второй цитатой того же сообщения.
   */
  clearingReplies: Set<string>;

  /**
   * `seq` следующей команды ядру страницы Worker-версии: свой диапазон `[10⁹, 2³²)`, а не счётчик страницы с
   * единицы, — по нему агент узнаёт доклады о своих стикерах, а страница их не принимает за свои.
   */
  seq: number;

  /**
   * Отправки в ожидании доклада `sent` ядра по `seq`.
   */
  sending: Map<number, PendingSend>;
};

/**
 * `window` страницы, как его видит агент: флаг запуска, `Worker` для ловли ядра и `InputEvent` для возврата
 * черновика.
 */
export type AgentHost = Pick<Window, '__amoStickersPage'> &
  CoreHost & {
    /**
     * Конструктор `InputEvent` страницы; нет — черновик ядру не возвращается.
     */
    InputEvent?: InputEventClass;
  };

/**
 * Итог подготовки команды: сообщение с ответом из черновика или причина, по которой его не
 * собрать.
 */
export type PreparedMessage = AttachedReply | BuildMessageFailure;

/**
 * Что агент передаёт обработчику команды.
 */
export type AgentState = {
  /**
   * Память между командами.
   */
  memory: AgentMemory;

  /**
   * Пойманное ядро страницы Worker-версии.
   */
  catcher: CoreCatcher;

  /**
   * `window` страницы.
   */
  host: AgentHost;
};
