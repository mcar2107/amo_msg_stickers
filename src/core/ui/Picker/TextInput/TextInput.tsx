import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedEvent } from 'preact';

import type { TextInputProps } from './TextInput.types';

/**
 * Размер шрифта задан явно, а не наследуется: поля обоих экранов и поиска — одного размера,
 * в какой бы подписи они ни стояли.
 *
 * Недействительное поле обведено цветом ошибки по `aria-invalid` — тот же признак, что
 * читает скринридер, без отдельного класса состояния.
 */
const fieldVariants = cva(
  [
    'h-8 w-full rounded-lg border-0 pl-2.5 font-primary text-xsm outline-none',
    'aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-inset aria-[invalid=true]:ring-red-30',
    'bg-cadetGray-30/[.12] text-gray-30 placeholder:text-cadetGray-30',
    'dark:bg-white-0/[.06] dark:text-gray-40 dark:placeholder:text-gray-70',
  ].join(' '),
  {
    variants: {
      /**
       * Кнопка внутри поля справа: текст не заходит под неё.
       */
      hasTrailingAction: {
        true: 'pr-9',
        false: 'pr-2.5',
      },
      /**
       * Принятое значение — обводка цветом успеха amo (`green-10`, один в обеих темах, как у
       * кнопки успеха и галочки подтверждения); недействительное обводится по `aria-invalid`
       * в базовых классах.
       */
      isValid: {
        true: 'ring-1 ring-inset ring-green-10',
        false: '',
      },
    },
  }
);

export const TextInput: FC<TextInputProps> = (props) => {
  const {
    id,
    type,
    value,
    placeholder,
    autoComplete,
    describedBy,
    isInvalid,
    isValid,
    hasTrailingAction,
    inputRef,
    onInput,
  } = props;

  const handleFieldInput = (event: TargetedEvent<HTMLInputElement>) => {
    onInput(event.currentTarget.value);
  };

  return (
    <input
      ref={inputRef || null}
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-describedby={describedBy || undefined}
      aria-invalid={isInvalid || undefined}
      className={fieldVariants({
        hasTrailingAction: Boolean(hasTrailingAction),
        isValid: Boolean(isValid) && !isInvalid,
      })}
      onInput={handleFieldInput}
    />
  );
};
