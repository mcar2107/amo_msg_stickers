import type { RU } from './messages.ru';

/**
 * Язык интерфейса: русский — запасной язык amo, английский — единственный перевод.
 */
export type Locale = 'ru' | 'en';

export type MessageKey = keyof typeof RU;

/**
 * Словарь языка: ровно ключи русского эталона.
 */
export type Messages = Record<MessageKey, string>;

/**
 * Имена подстановок `{name}` строки.
 */
type Placeholders<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

/**
 * Значение подстановки: число выводится как есть, без форматирования под язык.
 */
export type MessageParam = string | number;

/**
 * Подстановки строки `key` — по её русскому тексту: без обязательной подстановки вызов не компилируется.
 */
export type MessageParams<K extends MessageKey> = Readonly<
  Record<Placeholders<(typeof RU)[K]>, MessageParam>
>;

/**
 * Аргументы после ключа: параметры обязательны, только если в строке есть подстановки. Условие
 * распределяется по объединению ключей — у каждого ключа свой кортеж.
 */
export type MessageArgs<K extends MessageKey> = K extends MessageKey
  ? [Placeholders<(typeof RU)[K]>] extends [never]
    ? [params?: undefined]
    : [params: MessageParams<K>]
  : never;

/**
 * Срез документа страницы, из которого читается язык: тесты подставляют его без DOM.
 */
export type LocaleDocument = {
  /**
   * Корень документа: его `lang` — язык, на котором страница показана.
   */
  documentElement: Pick<HTMLElement, 'lang'>;
};

/**
 * Чтение сохранённого языка, когда хранилище страницы доступно.
 */
export type StoredLocale = {
  /**
   * Сохранённое значение; `null` — значения нет.
   */
  value: string | null;
};
