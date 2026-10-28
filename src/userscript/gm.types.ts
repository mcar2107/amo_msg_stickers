/**
 * Минимальный срез GM API, которым пользуется userscript: общий для Tampermonkey,
 * Violentmonkey и ScriptCat. Глобальных объявлений `GM_*` здесь нет — только типы, которые
 * точка входа подставляет адаптерам.
 */

/**
 * Формат тела ответа, который просим у менеджера.
 */
export type GmResponseType = 'text' | 'arraybuffer';

/**
 * Состояние ответа, которое менеджер передаёт в колбэки запроса.
 */
export type GmResponse = {
  /**
   * HTTP-статус ответа. 0 — ответа от сервера нет (сетевая ошибка, обрыв).
   */
  status: number;

  /**
   * Итоговый адрес после редиректов. Нет — менеджер его не сообщает, итоговым считается
   * адрес запроса.
   */
  finalUrl?: string;

  /**
   * Стадия запроса, как у `XMLHttpRequest.readyState`: 2 — заголовки получены, 4 — готово.
   */
  readyState: number;

  /**
   * Заголовки ответа одной строкой: `имя: значение`, по строке на заголовок. Регистр имён —
   * как прислал сервер.
   */
  responseHeaders: string;

  /**
   * Тело в формате `responseType` запроса: строка или `ArrayBuffer`. До окончания
   * загрузки может отсутствовать.
   */
  response: unknown;

  /**
   * Тело текстом. Надёжно есть только при `responseType: 'text'`.
   */
  responseText?: string;

  /**
   * Сколько байт тела уже получено — приходит в `onprogress`.
   */
  loaded?: number;
};

/**
 * Параметры запроса `GM_xmlhttpRequest`.
 */
export type GmRequestDetails = {
  /**
   * HTTP-метод.
   */
  method: 'GET';

  /**
   * Адрес запроса.
   */
  url: string;

  /**
   * Формат тела ответа в `response`.
   */
  responseType: GmResponseType;

  /**
   * true — запрос уходит без cookie целевого сайта.
   */
  anonymous: boolean;

  /**
   * Колбэк на завершение загрузки ответа с любым HTTP-статусом.
   */
  onload: (response: GmResponse) => void;

  /**
   * Колбэк на сетевую ошибку: ответа от сервера нет.
   */
  onerror: (response: GmResponse) => void;

  /**
   * Колбэк на истечение времени ожидания ответа.
   */
  ontimeout: (response: GmResponse) => void;

  /**
   * Колбэк на прерывание запроса — в том числе вызовом `abort()`.
   */
  onabort: (response: GmResponse) => void;

  /**
   * Колбэк на очередную порцию тела: сколько байт уже получено — в `loaded`.
   */
  onprogress: (response: GmResponse) => void;

  /**
   * Колбэк на смену `readyState`: на стадии 2 уже известны статус и заголовки.
   */
  onreadystatechange: (response: GmResponse) => void;
};

/**
 * Управление запущенным запросом.
 */
type GmRequestHandle = {
  /**
   * Обрывает запрос: остаток тела не скачивается.
   */
  abort: () => void;
};

/**
 * Сигнатура `GM_xmlhttpRequest`: запрос в обход CORS страницы, ответ приходит в колбэки.
 */
export type GmXmlhttpRequest = (details: GmRequestDetails) => GmRequestHandle;

/**
 * Сигнатура `GM_getValue`: значение из хранилища менеджера, `defaultValue` — если ключа нет.
 */
export type GmGetValue = (key: string, defaultValue?: unknown) => unknown;

/**
 * Сигнатура `GM_setValue`: запись значения в хранилище менеджера.
 */
export type GmSetValue = (key: string, value: unknown) => void;

/**
 * Тело `arraybuffer`-ответа может прийти `ArrayBuffer`-ом другого realm-а (мир менеджера),
 * и `instanceof ArrayBuffer` на нём ложен — поэтому проверка по форме.
 *
 * @param value — тело ответа
 * @returns true, если значение — буфер байтов
 */
export const isArrayBuffer = (value: unknown): value is ArrayBuffer => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'byteLength' in value &&
    typeof value.byteLength === 'number' &&
    !ArrayBuffer.isView(value)
  );
};
