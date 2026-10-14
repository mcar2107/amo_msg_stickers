import type { Locale, LocaleDocument, StoredLocale } from './i18n.types';

/**
 * Ключ, под которым amo web хранит применённый язык: мы идём за языком страницы, а не браузера, и выбор
 * языка в amo, если он появится, подхватится без правок.
 */
export const AMO_LOCALE_KEY = 'i18nextLng';

/**
 * Разделители основного тега и региона: `en-US` у браузера, `en_GB` встречается в сохранённых значениях.
 */
const TAG_SEPARATOR = /[-_]/;

/**
 * Правило amo: английский — только при основном теге `en`, любой другой язык и отсутствие языка дают русский —
 * запасной язык amo.
 *
 * Язык документа стоит между сохранённым языком и языками браузера: версия amo без сохранённого языка пишет в
 * `<html lang>` язык своего интерфейса, и пикер говорит на нём же — при неподдержанном первом языке браузера
 * страница на английском, а по языкам браузера пикер был бы на русском.
 *
 * @param stored — язык, сохранённый amo; `null` или пустая строка — не сохранён
 * @param documentLang — `lang` у `<html>`; пустая строка — не задан или не годится как источник
 * @param languages — языки браузера по приоритету
 * @returns язык интерфейса
 */
export const resolveLocale = (
  stored: string | null,
  documentLang: string,
  languages: readonly string[]
): Locale => {
  const [primary] = (stored || documentLang || languages[0] || '').split(TAG_SEPARATOR);

  if (primary?.toLowerCase() === 'en') return 'en';

  return 'ru';
};

/**
 * `localStorage` бросает при запрете хранилища сайта и в части приватных режимов — пикер при этом работает.
 *
 * @returns сохранённое значение; `null` — хранилище недоступно
 */
const readStoredLocale = (): StoredLocale | null => {
  try {
    return { value: localStorage.getItem(AMO_LOCALE_KEY) };
  } catch {
    return null;
  }
};

/**
 * При недоступном хранилище `<html lang>` не читается, и язык берётся сразу из языков браузера: прежняя amo держит
 * в документе статичный `lang="ru"` при любом языке интерфейса, а её выбор языка без хранилища — по браузеру.
 *
 * Пустой список `navigator.languages` не ломает выбор: тогда язык берётся из `navigator.language`.
 *
 * @param page — документ страницы amo: из него читается `lang` корня
 * @returns язык интерфейса по языку amo
 */
export const readAmoLocale = (page: LocaleDocument = document): Locale => {
  const { languages, language } = navigator;
  const stored = readStoredLocale();

  return resolveLocale(
    stored && stored.value,
    stored ? page.documentElement.lang : '',
    languages.length > 0 ? languages : [language]
  );
};
