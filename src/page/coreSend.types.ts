import type { PageDims } from '@shared/pageBridge.types';

import type { AgentMemory, AgentNode } from './agent.types';
import type { CoreWorker } from './workerCore.types';

/**
 * Узел DOM Worker-версии amo web, как его читает агент: дерево, текст поля, поиск потомков и событие ввода.
 */
export type PageElement = AgentNode & {
  /**
   * Родитель; null — корень.
   */
  readonly parentElement: PageElement | null;

  /**
   * Дети по порядку.
   */
  readonly children: Iterable<PageElement>;

  /**
   * Узел ещё в документе.
   */
  readonly isConnected: boolean;

  /**
   * Текст узла со всеми потомками.
   */
  readonly textContent: string | null;

  /**
   * Первый потомок по селектору; null — нет.
   */
  querySelector: (selector: string) => PageElement | null;

  /**
   * Все потомки по селектору.
   */
  querySelectorAll: (selector: string) => Iterable<PageElement>;

  /**
   * Событие на узле.
   */
  dispatchEvent: (event: Event) => boolean;
};

/**
 * Пропсы компонента поля ввода Worker-версии, которые читает агент.
 */
export type ComposeProps = {
  /**
   * Id открытого чата.
   */
  chat: string;

  /**
   * Редактируемое сообщение; пусто — правки нет.
   */
  edit: unknown;

  /**
   * Есть вложения в черновике.
   */
  attached: unknown;
};

/**
 * Пропсы кнопок ленты, которые читает агент: кнопка «вниз».
 */
export type FeedButtonsProps = {
  /**
   * Кнопка «вниз»: `shown` — лента не у низа, `onClick` — штатная прокрутка к низу.
   */
  down: {
    /**
     * Кнопка показана: лента не у низа.
     */
    shown: boolean;

    /**
     * Прокрутка ленты к низу, как по клику на кнопку.
     */
    onClick: () => void;
  };
};

/**
 * Конструктор `InputEvent` страницы: агент получает его параметром — в тестах (`node`) его нет.
 */
export type InputEventClass = new (type: string, init?: InputEventInit) => Event;

/**
 * Отправленный стикер, доклада о котором агент ждёт.
 */
export type PendingSend = {
  /**
   * Чат, в который ушла команда.
   */
  chat: string;

  /**
   * Поле ввода, от которого шла отправка: от него ищутся кнопки ленты того же чата.
   */
  field: PageElement;
};

/**
 * Команда отправки стикера ядру страницы.
 */
export type CoreSendRequest = {
  /**
   * Помеченное поле ввода.
   */
  field: PageElement;

  /**
   * Пропсы компонента этого поля.
   */
  compose: ComposeProps;

  /**
   * Отправляемый GIF.
   */
  file: File;

  /**
   * Стороны GIF из команды ядра amo stickers.
   */
  dims: PageDims;
};

/**
 * Окружение отправки: ядро страницы, память агента и конструктор события ввода.
 */
export type CoreSendContext = {
  /**
   * Пойманное ядро страницы; null — не поймано.
   */
  core: CoreWorker | null;

  /**
   * Память агента: `seq` и отправки в ожидании доклада.
   */
  memory: AgentMemory;

  /**
   * Конструктор `InputEvent` страницы; нет — черновик ядру не возвращается.
   */
  InputEvent?: InputEventClass;
};
