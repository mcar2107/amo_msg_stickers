import type { FunctionComponent as FC } from 'preact';

import type { LinkButtonProps } from './LinkButton.types';

/**
 * Вид — как у ссылок подсказок (`ExternalLink`): переход выглядит ссылкой, а не ещё одной кнопкой действия рядом с
 * главной. Высота — строка текста, поэтому ссылка встаёт в строку заголовка группы, не добавляя ей высоты.
 */
const LINK_BUTTON_CLASS = [
  'shrink-0 cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 font-primary text-xs leading-[1.4]',
  'text-blue-50 underline hover:no-underline dark:text-beige-70',
].join(' ');

/**
 * Кнопка в виде ссылки для перехода между экранами пикера: `<a href="#">` запрещён jsx-a11y, а действие — открытие
 * экрана, а не навигация.
 */
export const LinkButton: FC<LinkButtonProps> = (props) => {
  const { onClick, children } = props;

  const handleButtonClick = () => {
    onClick();
  };

  return (
    <button type="button" className={LINK_BUTTON_CLASS} onClick={handleButtonClick}>
      {children}
    </button>
  );
};
