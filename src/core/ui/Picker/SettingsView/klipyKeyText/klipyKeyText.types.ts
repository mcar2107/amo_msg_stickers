export type KlipyKeyText = {
  /**
   * Подпись поля ключа KLIPY; `null` — литерал «KLIPY API key»: он одинаков на обоих языках
   * и в словарь не заводится.
   */
  label: 'settings.klipy.labelOptional' | null;

  /**
   * Подсказка под полем: ссылка на Partner Panel (`{link}`).
   */
  hint: 'settings.klipy.where' | 'settings.klipy.whereOptional';

  /**
   * Пояснение группы «GIF»: ссылка на доку (`{docs}`).
   */
  note: 'settings.gif.oneKey' | 'settings.gif.builtinNote';
};
