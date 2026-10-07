import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC } from 'preact';

import type { ButtonClickEvent, ButtonProps } from './Button.types';

/**
 * Шрифт задаётся явно, а не наследуется: preflight Tailwind сбрасывает у кнопки
 * `font` в `inherit`, а подпись кнопки — всегда 13px или 12px независимо от
 * контейнера, например от подписи поля.
 *
 * Размер входит в вариант целиком: у опасной кнопки своя высота, отступы и шрифт, а
 * конфликтующих утилит на одном элементе быть не должно (`tailwind-merge` не берём).
 *
 * Наведение — под `enabled:`, а не `hover:` с перебивкой в `disabled:`: недоступная кнопка
 * стиль наведения просто не получает, и порядок утилит в CSS не важен. Основная кнопка
 * темнеет фильтром, а не соседним цветом палитры: соседний синий читался бы другим
 * цветом, а `brightness` одинаково работает для синей и бежевой тёмной темы.
 *
 * Второстепенная кнопка — нейтральная заливка того же размера, что у основной: она встаёт на
 * место основной в футере и не спорит с ней цветом.
 *
 * Длительность — под `motion-safe:`, как и переход: длительность по умолчанию из
 * `motion-safe:transition-*` перебила бы простую `duration-base`.
 */
export const buttonVariants = cva(
  [
    'shrink-0 cursor-pointer rounded-lg font-primary leading-[normal] disabled:cursor-default disabled:opacity-50',
    'motion-safe:transition-[color,background-color,border-color,filter] motion-safe:duration-base',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'h-8 px-3.5 text-xsm font-semibold bg-blue-50 text-white-0 dark:bg-beige-70 dark:text-gray-10',
          'enabled:hover:brightness-[.92] dark:enabled:hover:brightness-[1.08]',
        ].join(' '),
        secondary: [
          'h-8 px-3.5 text-xsm font-semibold bg-cadetGray-30/[.12] text-cadetGray-10',
          'enabled:hover:bg-cadetGray-30/[.2] dark:bg-white-0/[.08] dark:text-gray-90',
          'dark:enabled:hover:bg-white-0/[.14]',
        ].join(' '),
        danger:
          'h-5.5 px-1.5 text-xs font-normal bg-transparent text-red-30 enabled:hover:bg-red-30/10',
      },
    },
  }
);

export const Button: FC<ButtonProps> = (props) => {
  const { variant, type = 'button', form, isDisabled, onClick, children } = props;

  const handleButtonClick = (event: ButtonClickEvent) => {
    onClick?.(event);
  };

  return (
    <button
      type={type}
      form={form}
      disabled={isDisabled}
      className={buttonVariants({ variant })}
      onClick={handleButtonClick}
    >
      {children}
    </button>
  );
};
