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
 * Поле формы экрана: подпись, поле и его описание — ошибка, результат проверки, подсказка.
 *
 * Описание стоит рядом с `<label>`, а не внутри: в `<label>` допустим только строчный
 * контент, и текст подсказки со ссылкой попал бы в имя поля. К полю оно привязано
 * `aria-describedby`.
 *
 * `autocomplete="off"`: в поля экранов вводят ключи, токены, ссылки и подписи, и сохранённый
 * пароль сайта или прошлый ввод браузера в них только мешали бы. Показ скрытого значения
 * живёт в поле и сбрасывается вместе с экраном.
 */
export const Field: FC<FieldProps> = (props) => {
  const {
    id,
    label,
    value,
    placeholder,
    isSecret,
    error,
    result,
    hint,
    describedBy,
    onInput,
  } = props;
  const [isRevealed, setIsRevealed] = useState(false);
  const ids = fieldDescriptionIds(id);
  const hasError = Boolean(error);
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
      <label htmlFor={id}>{label}</label>

      <div className="flex items-center gap-1">
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
          isInvalid={hasError}
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
        <p id={ids.result} className={DESCRIPTION_CLASS}>
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
