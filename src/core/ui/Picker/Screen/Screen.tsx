import type { FunctionComponent as FC } from 'preact';
import { useRef } from 'preact/hooks';

import { t } from '../../../i18n/translate';

import { BackIcon } from './BackIcon/BackIcon';
import { useScreenFocus } from './useScreenFocus/useScreenFocus';
import { useScreenMotion } from './useScreenMotion/useScreenMotion';
import type { ScreenProps } from './Screen.types';
import { ScreenContext } from './ScreenContext';
import { SCREEN_FOOTER_HEIGHT_PX } from './screenFooter';

/**
 * `z-10` — над содержимым режима: позиционированные элементы ленты идут в DOM раньше
 * экрана, но с `z-index` перекрыли бы его.
 */
const SCREEN_CLASS = 'absolute inset-0 z-10 flex flex-col bg-white-0 dark:bg-gray-10';

const BACK_BUTTON_CLASS = [
  'flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-transparent py-0 pl-0.5 pr-2',
  'font-primary text-xsm leading-[normal] text-cadetGray-30',
  'hover:bg-cadetGray-30/[.14] dark:text-gray-70 dark:hover:bg-white-0/[.07]',
].join(' ');

/**
 * Заголовок — на ступень крупнее заголовков групп (`text-xsm`): уровни видны и глазу, а не
 * только скринридеру.
 */
const TITLE_CLASS =
  'm-0 shrink-0 truncate px-2.5 pb-1.5 pt-1 font-primary text-sm font-semibold';

/**
 * Нижний отступ тела растёт на высоту строки статуса (`--status-inset` панели): строка лежит
 * слоем поверх низа тела, и без отступа конец содержимого под ней не долистывался бы.
 */
const BODY_CLASS = [
  'min-h-0 flex-1 overflow-y-auto px-2.5 pt-1 [scrollbar-width:thin]',
  'pb-[calc(theme(spacing.3)_+_var(--status-inset,0px))]',
].join(' ');

/**
 * Футер — постоянной высоты `SCREEN_FOOTER_HEIGHT_PX` и вне прокрутки: главная кнопка видна
 * при любой длине тела, а строка статуса встаёт над ним на ту же высоту без замера.
 */
const FOOTER_CLASS = [
  'flex shrink-0 items-center justify-end gap-2 px-2.5',
  'border-t border-cadetGray-30/[.28] dark:border-white-0/10',
].join(' ');

const FOOTER_STYLE = { height: SCREEN_FOOTER_HEIGHT_PX };

/**
 * id заголовка — постоянный: экран на панели один, а id в закрытом shadow root пикера
 * уникальны в его дереве.
 */
const TITLE_ID = 'picker-screen-title';

/**
 * Экран поверх режима. Режим под ним остаётся в раскладке, поэтому прокрутка ленты и
 * запрос поиска переживают «Назад» как есть, без восстановления.
 *
 * Экран появляется при монтировании, а «Назад» проигрывает появление в обратную сторону и
 * закрывает экран по концу ухода (`useScreenMotion`). Тот же уход получают кнопки экрана
 * через `useScreenLeave`.
 */
export const Screen: FC<ScreenProps> = (props) => {
  const { title, footer, children } = props;
  const { screenRef, leave } = useScreenMotion();
  const bodyRef = useRef<HTMLDivElement>(null);

  useScreenFocus(bodyRef);

  const handleBackClick = () => {
    leave();
  };

  return (
    <ScreenContext.Provider value={leave}>
      <section ref={screenRef} aria-labelledby={TITLE_ID} className={SCREEN_CLASS}>
        <div className="flex shrink-0 px-1.5 pt-1.5">
          <button type="button" className={BACK_BUTTON_CLASS} onClick={handleBackClick}>
            <BackIcon />
            {t('screen.back')}
          </button>
        </div>

        <h2 id={TITLE_ID} className={TITLE_CLASS}>
          {title}
        </h2>

        <div ref={bodyRef} className={BODY_CLASS}>
          {children}
        </div>

        <div className={FOOTER_CLASS} style={FOOTER_STYLE}>
          {footer}
        </div>
      </section>
    </ScreenContext.Provider>
  );
};
