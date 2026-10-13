/**
 * Worker, как его видит агент: события, команды и остановка. Методы — сигнатурой метода, а не свойством: подкласс
 * агента переопределяет `terminate`.
 */
export type CoreWorker = {
  /**
   * Команда Worker-у.
   */
  postMessage(message: unknown): void;

  /**
   * Остановка Worker-а.
   */
  terminate(): void;

  /**
   * Подписка на сообщения и ошибки Worker-а.
   */
  addEventListener(type: 'message' | 'error', listener: (event: Event) => void): void;

  /**
   * Отписка от сообщений и ошибок Worker-а.
   */
  removeEventListener(type: 'message' | 'error', listener: (event: Event) => void): void;
};

/**
 * Конструктор `Worker` страницы — аргументы те же, что у `window.Worker`.
 */
export type WorkerClass = new (
  scriptURL: string | URL,
  options?: WorkerOptions
) => CoreWorker;

/**
 * Срез `window`, в котором агент подменяет `Worker`. Нет `Worker` — ловить нечего.
 */
export type CoreHost = {
  /**
   * Конструктор `Worker` страницы; агент заменяет его подклассом.
   */
  Worker?: WorkerClass;
};

/**
 * Доклад ядра страницы — `data` его сообщения, форма не проверена.
 */
export type ReportListener = (report: unknown) => void;

export type CoreCatcher = {
  /**
   * Пойманное ядро страницы; null — ядра нет: страница его ещё не создала, создала до агента или остановила.
   */
  core: () => CoreWorker | null;

  /**
   * Сколько Worker-ов агент держит, пока не ясно, ядро ли это.
   */
  pendingCount: () => number;
};
