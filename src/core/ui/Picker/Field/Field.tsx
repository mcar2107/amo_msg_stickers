import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC } from 'preact';
import { useState } from 'preact/hooks';

import { TextInput } from '../TextInput/TextInput';

import {
  fieldDescribedBy,
  fieldDescriptionIds,
} from './fieldDescription/fieldDescription';
import { RevealButton } from './RevealButton/RevealButton';
import type { FieldProps } from './Field.types';

const DESCRIPTION_CLASS = 'm-0 text-xs leading-[1.4]';

/**
 * Цвет результата проверки — по тону: принятое значение зелёное, отклонённое — цвета ошибки.
 */
const resultVariants = cva(DESCRIPTION_CLASS, {
  variants: {
    tone: {
      valid: 'text-green-10',
      invalid: 'text-red-30',
      none: '',
    },
  },
});

/**
 * Поле формы экрана: подпись, поле и его описание — ошибка, результат проверки, подсказка.
 *
 * Описание стоит рядом с `<label>`, а не внутри: в `<label>` допустим только строчный
 * контент, и текст подсказки со ссылкой попал бы в имя поля. К полю оно привязано
 * `aria-describedby`. По той же причине кнопка у подписи (`labelAside`) стоит в строке
 * подписи рядом с `<label>`, а не в нём.
 *
 * `autocomplete="off"`: в поля экранов вводят ключи, токены, ссылки и подписи, и сохранённый
 * пароль сайта или прошлый ввод браузера в них только мешали бы. Показ скрытого значения
 * живёт в поле и сбрасывается вместе с экраном.
 */
export const Field: FC<FieldProps> = (props) => {
  const {
    id,
    label,
    labelAside,
    value,
    placeholder,
    isSecret,
    error,
    result,
    tone,
    hint,
    describedBy,
    onInput,
  } = props;
  const [isRevealed, setIsRevealed] = useState(false);
  const ids = fieldDescriptionIds(id);
  const hasError = Boolean(error);
  const isInvalid = hasError || tone === 'invalid';
  const hasResult = Boolean(result);
  const hasHint = Boolean(hint);
  const isHidden = isSecret && !isRevealed;

  const handleFieldInput = (nextValue: string) => {
    onInput(nextValue);
  };

  const handleRevealToggle = () => {
    setIsRevealed(!isRevealed);
  };

  return (
    <div className="flex flex-col gap-1 text-xs text-cadetGray-30 dark:text-gray-70">
      <div className="flex items-center gap-1">
        <label htmlFor={id}>{label}</label>

        {labelAside}
      </div>

      <div className="relative">
        <TextInput
          id={id}
          type={isHidden ? 'password' : 'text'}
          value={value}
          placeholder={placeholder || ''}
          autoComplete="off"
          describedBy={fieldDescribedBy(id, {
            hasError,
            hasResult,
            hasHint,
            describedBy: describedBy || '',
          })}
          isInvalid={isInvalid}
          isValid={tone === 'valid'}
          hasTrailingAction={Boolean(isSecret)}
          onInput={handleFieldInput}
        />

        {isSecret && (
          <RevealButton
            fieldId={id}
            isRevealed={isRevealed}
            onToggle={handleRevealToggle}
          />
        )}
      </div>

      {hasError && (
        <p id={ids.error} className={`${DESCRIPTION_CLASS} text-red-30`}>
          {error}
        </p>
      )}

      {hasResult && (
        <p id={ids.result} className={resultVariants({ tone: tone || 'none' })}>
          {result}
        </p>
      )}

      {hasHint && (
        <p id={ids.hint} className={DESCRIPTION_CLASS}>
          {hint}
        </p>
      )}
    </div>
  );
};
