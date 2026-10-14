import { fieldOf } from './field';
import type {
  CoreCatcher,
  CoreHost,
  CoreWorker,
  ReportListener,
  WorkerClass,
} from './workerCore.types';

/**
 * Ядро страницы Worker-версии amo web — Web Worker, ссылку на который страница наружу не отдаёт. Поймать его можно
 * только при создании: агент до скриптов страницы подменяет `window.Worker` подклассом, который ничего не меняет в
 * поведении и смотрит на первое сообщение каждого экземпляра.
 */

/**
 * Доклады ядра, по которым его узнаёт агент. Первым в живой Worker-версии приходит запись журнала `call`, остальные —
 * запас на случай, если журнал перестанут слать первым. Имя Worker-а не проверяется: оно не контракт.
 */
const KNOWN_REPORTS = new Set([
  'loaded',
  'authorizationState',
  'connectionState',
  'accounts',
  'tabs',
  'dialogs',
  'chat',
  'history',
  'sent',
]);

const CALL_REPORT = 'call';

const CALL_DIRS = new Set(['in', 'out']);

/**
 * Запись журнала `call` узнаётся строже прочих докладов — по направлению и имени: `kind: 'call'` встречается и в
 * данных страницы (строка звонка).
 *
 * @param data — первое сообщение Worker-а
 * @returns true — сообщение формы доклада ядра
 */
const isCoreReport = (data: unknown) => {
  const kind = fieldOf(data, 'kind');

  if (typeof kind !== 'string') return false;

  if (kind === CALL_REPORT) {
    const dir = fieldOf(data, 'dir');

    return (
      typeof dir === 'string' &&
      CALL_DIRS.has(dir) &&
      typeof fieldOf(data, 'name') === 'string'
    );
  }

  return KNOWN_REPORTS.has(kind);
};

const dataOf = (event: Event) => {
  return fieldOf(event, 'data');
};

/**
 * Подменяет `host.Worker` подклассом. Экземпляр держится, пока не пришло первое сообщение: доклад ядра делает его
 * ядром, а сообщение другой формы, `error` или `terminate` — забывают, и Worker-ы подготовки фото не держатся до
 * перезагрузки. Новое ядро (страница создаёт его после очистки кеша) сменяет прежнее.
 *
 * @param host — `window` страницы
 * @param onReport — получает каждый доклад пойманного ядра, начиная с первого
 * @returns доступ к пойманному ядру
 */
export const catchCore = (host: CoreHost, onReport: ReportListener): CoreCatcher => {
  const Base = host.Worker;

  /**
   * Worker → отписка агента от него.
   */
  const pending = new Map<CoreWorker, () => void>();
  let core: CoreWorker | null = null;

  const catcher: CoreCatcher = {
    core: () => {
      return core;
    },
    pendingCount: () => {
      return pending.size;
    },
  };

  if (!Base) return catcher;

  /**
   * Сбой агента не должен стать сбоем обработки сообщения страницы.
   *
   * @param event — сообщение ядра
   */
  const handleReport = (event: Event) => {
    try {
      onReport(dataOf(event));
    } catch (error) {
      console.warn('[amo-stickers] core report handling failed:', error);
    }
  };

  const forget = (worker: CoreWorker) => {
    pending.get(worker)?.();
    pending.delete(worker);

    if (core === worker) core = null;
  };

  const watch = (worker: CoreWorker) => {
    const handleFirstMessage = (event: Event) => {
      forget(worker);

      if (!isCoreReport(dataOf(event))) return;

      core = worker;
      worker.addEventListener('message', handleReport);
      handleReport(event);
    };

    const handleError = () => {
      forget(worker);
    };

    pending.set(worker, () => {
      worker.removeEventListener('message', handleFirstMessage);
      worker.removeEventListener('error', handleError);
    });
    worker.addEventListener('message', handleFirstMessage);
    worker.addEventListener('error', handleError);
  };

  /**
   * Имя класса — `Worker`, как у подменяемого: `Worker.name` страница видит прежним.
   */
  host.Worker = class Worker extends Base {
    constructor(...args: ConstructorParameters<WorkerClass>) {
      super(...args);
      watch(this);
    }

    terminate() {
      forget(this);
      super.terminate();
    }
  };

  return catcher;
};
