import type { PageRejectReason } from '../shared/pageBridge.types';
import { ATTACHMENTS_SELECTOR, CAPSULE_TOP_SELECTOR } from '../shared/workerCompose';

import type { AgentMemory, AgentNode } from './agent.types';
import type {
  ComposeProps,
  CoreSendContext,
  CoreSendRequest,
  FeedButtonsProps,
  PageElement,
  PendingSend,
} from './coreSend.types';
import { propsUp } from './fiber';
import { fieldOf } from './field';

/**
 * Отправка стикера ядром страницы Worker-версии amo web: команда `sendFiles` отдельным сообщением в открытый чат,
 * возврат текста поля в черновик ядра и лента к низу по докладу `sent` (design.md, решение 6).
 */

/**
 * Свой диапазон `seq` — `[10⁹, 2³²)`: `seq` ядра — 32-битное без знака, а страница считает свои с единицы.
 */
export const SEQ_MIN = 1_000_000_000;
const SEQ_LIMIT = 2 ** 32;

/**
 * Сколько отправок ждут доклада `sent` одновременно. Доклад о каждой обычно приходит, а запись без него — ядро
 * сменилось или доклад потерялся — держала бы поле ввода до перезагрузки. Граница — числом, а не временем: когда
 * приходит доклад о загруженном файле, зависит от сети, и запись по таймауту пропала бы у медленной загрузки. Столько
 * стикеров без единого доклада подряд не отправить, и вытесняется самая старая запись — та, доклада о которой уже не
 * будет.
 */
export const SENDING_MAX = 32;

/**
 * Пропсы компонента поля в живой Worker-версии — в 5 шагах fiber от поля; предел — с запасом.
 */
const COMPOSE_MAX_STEPS = 12;

/**
 * Пропсы кнопок ленты в живой Worker-версии — в 4 шагах fiber от кнопки.
 */
const FEED_BUTTONS_MAX_STEPS = 8;

const FEED_ROLE = 'log';

/**
 * @param seq — текущий `seq`
 * @returns следующий `seq` своего диапазона, после `2³² − 1` — снова `10⁹`
 */
export const nextSeq = (seq: number) => {
  return seq + 1 < SEQ_LIMIT ? seq + 1 : SEQ_MIN;
};

/**
 * Помеченный узел — элемент DOM, а не что-то с атрибутами: путь Worker-версии ходит по дереву и шлёт событие.
 *
 * @param node — помеченное поле ввода
 * @returns true — узел умеет всё, что нужно пути Worker-версии
 */
export const isPageElement = (node: AgentNode): node is PageElement => {
  return (
    'parentElement' in node &&
    'children' in node &&
    'querySelector' in node &&
    'dispatchEvent' in node
  );
};

const isComposeProps = (props: unknown): props is ComposeProps => {
  const chat = fieldOf(props, 'chat');

  return (
    typeof chat === 'string' &&
    chat !== '' &&
    typeof fieldOf(props, 'onFilesPick') === 'function'
  );
};

const isFeedButtonsProps = (props: unknown): props is FeedButtonsProps => {
  const down = fieldOf(props, 'down');

  return (
    typeof fieldOf(down, 'onClick') === 'function' &&
    typeof fieldOf(down, 'shown') === 'boolean'
  );
};

/**
 * @param field — поле ввода
 * @returns пропсы компонента поля Worker-версии; null — поле не Worker-версии
 */
export const composePropsOf = (field: PageElement) => {
  return propsUp(field, COMPOSE_MAX_STEPS, isComposeProps);
};

/**
 * @param node — узел, с которого начинается подъём
 * @param isMatch — что ищем у предка
 * @returns ближайший предок узла, подходящий под условие; null — нет
 */
const ancestorOf = (node: PageElement, isMatch: (element: PageElement) => boolean) => {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (isMatch(element)) return element;
  }

  return null;
};

/**
 * Полоса вложений появляется в капсуле раньше, чем страница отметит вложения в пропсах поля: файлы ещё готовятся.
 *
 * @param field — поле ввода
 * @param compose — пропсы компонента поля
 * @returns true — в черновике правка или вложения, и ядро после отправки сняло бы их вместе с черновиком
 */
const isDraftBusy = (field: PageElement, compose: ComposeProps) => {
  if (compose.edit || compose.attached) return true;

  const capsule = ancestorOf(field, (element) => {
    return element.querySelector(CAPSULE_TOP_SELECTOR) !== null;
  });

  return Boolean(capsule?.querySelector(ATTACHMENTS_SELECTOR));
};

/**
 * Кнопки ленты — у колонки чата, общей у ленты и поля ввода, вне самой ленты. Подпись и классы у них переведены и не
 * контракт, поэтому кнопки узнаются по пропсам `down`.
 *
 * @param field — поле ввода
 * @returns пропсы кнопок ленты чата этого поля; null — не нашлись
 */
const feedButtonsOf = (field: PageElement) => {
  const isFeed = (element: PageElement) => {
    return element.getAttribute('role') === FEED_ROLE;
  };

  const column = ancestorOf(field, (element) => {
    return [...element.children].some(isFeed);
  });

  for (const child of column?.children || []) {
    if (isFeed(child)) continue;

    for (const button of child.querySelectorAll('button')) {
      const props = propsUp(button, FEED_BUTTONS_MAX_STEPS, isFeedButtonsProps);

      if (props) return props;
    }
  }

  return null;
};

/**
 * Текст поля возвращается в черновик ядра событием ввода: обработчик страницы прочитает поле со всей разметкой и
 * пошлёт черновик следующей командой, после `sendFiles`. Без `inputType` обработчик страницы бросает, и черновик не
 * уходит.
 *
 * @param field — поле ввода
 * @param context — окружение отправки
 */
const restoreDraft = (field: PageElement, context: CoreSendContext) => {
  const { InputEvent } = context;

  if (!field.textContent || !InputEvent) return;

  try {
    field.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' })
    );
  } catch (error) {
    console.warn('[amo-stickers] draft restore failed:', error);
  }
};

/**
 * @param memory — память агента
 * @param seq — `seq` команды
 * @param pending — чат и поле отправки
 */
const rememberSending = (memory: AgentMemory, seq: number, pending: PendingSend) => {
  const { sending } = memory;

  sending.set(seq, pending);

  if (sending.size <= SENDING_MAX) return;

  const [oldest] = sending.keys();

  if (oldest !== undefined) sending.delete(oldest);
};

/**
 * Отправка синхронная: ответ агента уходит до возврата из `dispatchEvent` ядра amo stickers, исход — доклад `sent`
 * ядра страницы позже.
 *
 * @param request — поле, его пропсы, файл и стороны
 * @param context — ядро страницы, память агента и конструктор события ввода
 * @returns причина отказа; null — ядро страницы приняло команду
 */
export const sendToCore = (
  request: CoreSendRequest,
  context: CoreSendContext
): PageRejectReason | null => {
  const { field, compose, file, dims } = request;
  const { core, memory } = context;

  if (isDraftBusy(field, compose)) return 'draft-busy';
  if (!core) return 'no-core';

  const { seq } = memory;

  try {
    core.postMessage({
      kind: 'sendFiles',
      chat: compose.chat,
      text: '',
      seq,
      files: [
        {
          file: `amo-stickers-${crypto.randomUUID()}`,
          bytes: file,
          kind: 'photo',
          name: file.name,
          mime: 'image/gif',
          size: file.size,
          w: dims.w,
          h: dims.h,
          durationMs: 0,
        },
      ],
    });
  } catch (error) {
    console.warn('[amo-stickers] core command threw:', error);

    return 'send-threw';
  }

  memory.seq = nextSeq(seq);
  rememberSending(memory, seq, { chat: compose.chat, field });
  restoreDraft(field, context);

  return null;
};

/**
 * Страница после своей отправки ведёт ленту к низу по докладу со своим `seq`, а наш `seq` не узнаёт: агент зовёт
 * штатную кнопку ленты «вниз», если лента не у низа и в поле всё ещё открыт тот же чат.
 *
 * @param report — доклад ядра страницы
 * @param memory — память агента
 */
export const handleCoreReport = (report: unknown, memory: AgentMemory) => {
  const seq = fieldOf(report, 'seq');

  if (fieldOf(report, 'kind') !== 'sent' || typeof seq !== 'number') return;

  const sending = memory.sending.get(seq);

  if (!sending) return;

  memory.sending.delete(seq);

  const refused = fieldOf(report, 'refused');

  if (refused || !fieldOf(report, 'key')) {
    console.warn('[amo-stickers] amo core refused sticker:', refused);

    return;
  }

  const { chat, field } = sending;

  if (!field.isConnected || fieldOf(report, 'chat') !== chat) return;
  if (composePropsOf(field)?.chat !== chat) return;

  const buttons = feedButtonsOf(field);

  if (buttons?.down.shown) buttons.down.onClick();
};
