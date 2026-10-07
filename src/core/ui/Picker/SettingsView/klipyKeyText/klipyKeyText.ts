import type { KlipyKeyText } from './klipyKeyText.types';

/**
 * Ключи подписи и подсказки поля KLIPY и пояснения группы «GIF». Со встроенным ключом сборки
 * свой необязателен — поиск KLIPY работает и без него, а ключ GIPHY лишь добавляет источники;
 * без встроенного для поиска нужен один из двух своих ключей. Ключи, а не текст: текст берётся
 * `t` в рендере, на языке интерфейса.
 *
 * @param hasBuiltinKey — в сборке есть встроенный ключ KLIPY
 * @returns ключи словаря для поля KLIPY и группы «GIF»
 */
export const klipyKeyText = (hasBuiltinKey: boolean): KlipyKeyText => {
  if (hasBuiltinKey) {
    return {
      label: 'settings.klipy.labelOptional',
      hint: 'settings.klipy.whereOptional',
      note: 'settings.gif.builtinNote',
    };
  }

  return { label: null, hint: 'settings.klipy.where', note: 'settings.gif.oneKey' };
};
