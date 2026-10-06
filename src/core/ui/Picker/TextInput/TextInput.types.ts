import type { Ref } from 'preact';

export type TextInputProps = {
  /**
   * id поля — для связи с `<label htmlFor>`: jsx-a11y не считает `TextInput` внутри
   * `<label>` полем ввода.
   */
  id?: string;

  /**
   * Тип поля: поиск, обычный текст или скрытое значение — ключи и токены.
   */
  type: 'text' | 'search' | 'password';

  /**
   * Текущее значение.
   */
  value: string;

  /**
   * Подсказка в пустом поле.
   */
  placeholder?: string;

  /**
   * Значение атрибута `autocomplete`: `off` не даёт браузеру подставлять сохранённое.
   */
  autoComplete?: string;

  /**
   * id элементов с описанием поля через пробел — подсказка, ошибка, результат проверки;
   * пустая строка — описания нет.
   */
  describedBy?: string;

  /**
   * Значение поля недействительно: поле помечено `aria-invalid` и обведено цветом ошибки.
   */
  isInvalid?: boolean;

  /**
   * Ссылка на DOM-поле — чтобы поставить в него фокус.
   */
  inputRef?: Ref<HTMLInputElement>;

  /**
   * Колбэк на ввод: новое значение поля.
   */
  onInput: (value: string) => void;
};
