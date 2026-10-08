import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedFocusEvent } from 'preact';

import { t } from '../../../../i18n/translate';
import { CloseIcon } from '../CloseIcon/CloseIcon';
import { previewAttributes, shouldReturnFocus } from '../previewA11y/previewA11y';
import type { PreviewCloseReason } from '../previewA11y/previewA11y.types';
import { previewDirection } from '../previewDirection/previewDirection';
import { PreviewImage } from '../PreviewImage/PreviewImage';
import { usePreviewFlight } from '../usePreviewFlight/usePreviewFlight';

import type { PreviewLayerProps } from './PreviewLayer.types';

/**
 * Слой на всю страницу: `absolute inset-0` от хоста слоя, а тот — `fixed` во всё окно.
 *
 * `pointer-events` задаются явно, а не наследуются: хост слоя курсор не принимает, и без
 * `pointer-events-auto` закреплённый слой клика бы не получил. Предпросмотр удержания курсор не
 * принимает: отпускание ловит провайдер на `window`, а оверлей под курсором не должен
 * перехватывать его у ячейки.
 */
const overlayVariants = cva('absolute inset-0', {
  variants: {
    mode: {
      hold: 'pointer-events-none',
      pinned: 'pointer-events-auto',
    },
  },
});

/**
 * Подложка — лёгкая пелена без размытия: лента пикера под предпросмотром должна читаться — по ней
 * переключают стрелки, и видно, где стоит показанная ячейка, а размытие стёрло бы стикеры и GIF
 * ленты. Пелены хватает, чтобы картинка и эмодзи предпросмотра отделялись от страницы. Прозрачность
 * нарастает только у неё: картинка вылетает из ячейки сразу видимой (`previewMotion`), а не
 * проявляется вместе с подложкой.
 *
 * Появление — переход из `@starting-style`, уход — тот же переход в обратную сторону: слой
 * монтируется при открытии и снимается по концу ухода (`onLeaveEnd`). Переход и длительность — под `motion-safe:`, стартовое состояние —
 * без варианта, как у меню и экрана: при уменьшении движения подложка появляется сразу.
 */
const backdropVariants = cva(
  [
    'absolute inset-0',
    'bg-white-0/40 dark:bg-gray-10/40',
    'motion-safe:transition-opacity motion-safe:duration-base [@starting-style]:opacity-0',
  ],
  {
    variants: {
      /**
       * Уходящий слой гасит подложку тем же переходом прозрачности, которым она появилась.
       */
      isLeaving: {
        true: 'opacity-0',
      },
    },
  }
);

/**
 * Слой содержимого без роли: обработчики клавиши, клика и ухода фокуса висят на нём, а не на
 * корне с ролью диалога. `tabIndex={-1}` у закреплённого — нажатие на подложку или картинку
 * ставит фокус на сам слой, а не снимает его в `body`, и `focusout` не закрывает оверлей
 * раньше клика, который его закроет. Отступ в 48 px оставляет воздух и место эмодзи над
 * картинкой, а картинка стоит по центру в квадрате не больше 400 px (`CANVAS_CLASS`).
 */
const CONTENT_CLASS =
  'absolute inset-0 flex items-center justify-center p-12 outline-none';

/**
 * Квадрат картинки: крупнее 400 px стикер рассматривать незачем. `min(100%, 25rem)` — это
 * 400 px, а в окне меньше — само окно. `relative`: эмодзи стоит над квадратом и его не
 * сдвигает.
 */
const CANVAS_CLASS = 'relative size-[min(100%,25rem)]';

/**
 * Эмодзи над картинкой: `bottom-full` ставит его над верхней гранью квадрата, отступ в 48 px у
 * содержимого оставляет под него место даже в тесном окне.
 */
const EMOJI_CLASS =
  'pointer-events-none absolute inset-x-0 bottom-full mb-2 select-none text-center text-[36px] leading-none';

const CLOSE_BUTTON_CLASS = [
  'absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full',
  'bg-transparent p-0 text-cadetGray-30 dark:text-gray-70',
  'hover:bg-cadetGray-30/[.14] dark:hover:bg-white-0/[.07]',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Слой предпросмотра: один на панель, состояние получает пропсами — он рисуется в своём
 * shadow root вне дерева панели и контекста `PreviewProvider` не видит. Закреплённый — диалог
 * с фокусом на кнопке «Закрыть предпросмотр»: Escape закрывает только его (нажатие не
 * всплывает на страницу), клик закрывает и не доходит до страницы под ним, уход фокуса
 * наружу закрывает без возврата фокуса, стрелки переключают на соседнюю ячейку ленты.
 * Удержание фокус не трогает.
 */
export const PreviewLayer: FC<PreviewLayerProps> = (props) => {
  const { preview, onClose, onStep, onLeaveEnd } = props;
  const { flightRef, emojiRef, closeButtonRef } = usePreviewFlight({
    preview,
    onLeaveEnd,
  });
  const isPinned = preview?.mode === 'pinned';

  if (!preview) return null;

  const { target, source } = preview;

  /**
   * Уходящий предпросмотр объявляется и ведёт себя как предпросмотр удержания: курсор и
   * скринридер его уже не касаются, хотя слой ещё на экране.
   */
  const visibleMode = preview.isLeaving ? 'hold' : preview.mode;

  const closeWith = (reason: PreviewCloseReason) => {
    if (shouldReturnFocus(reason, source)) source.focus({ preventScroll: true });

    onClose();
  };

  /**
   * Стрелка гасит действие по умолчанию и на краю ленты: иначе она прокрутила бы страницу amo под
   * предпросмотром. Шаг фокус не трогает — он остаётся на кнопке «Закрыть предпросмотр» или на
   * слое.
   */
  const handleContentKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      closeWith('escape');

      return;
    }

    const direction = previewDirection(event.key);

    if (!direction) return;

    event.preventDefault();
    onStep(direction);
  };

  const handleContentClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    closeWith('click');
  };

  const handleContentFocusOut = (event: TargetedFocusEvent<HTMLDivElement>) => {
    const { relatedTarget, currentTarget } = event;

    if (relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;

    closeWith('focusout');
  };

  return (
    <div
      {...previewAttributes(visibleMode, target.name)}
      inert={preview.isLeaving}
      className={overlayVariants({ mode: visibleMode })}
    >
      <div
        aria-hidden="true"
        className={backdropVariants({ isLeaving: preview.isLeaving })}
      />

      <div
        role="presentation"
        tabIndex={isPinned ? -1 : undefined}
        className={CONTENT_CLASS}
        onKeyDown={handleContentKeyDown}
        onClick={handleContentClick}
        onFocusOut={handleContentFocusOut}
      >
        <div className={CANVAS_CLASS}>
          {target.emoji && (
            <div ref={emojiRef} aria-hidden="true" className={EMOJI_CLASS}>
              {target.emoji}
            </div>
          )}

          <div ref={flightRef} className="size-full">
            <PreviewImage key={target.url} target={target} />
          </div>
        </div>

        {/**
         * Смену имени диалога скринридеры не читают, поэтому имя показанной ячейки объявляет
         * live region — только после шага: при открытии диалог объявляется своим именем.
         */}
        <div aria-live="polite" className="sr-only">
          {preview.isStepped ? target.name : ''}
        </div>

        {isPinned && (
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t('preview.close')}
            className={CLOSE_BUTTON_CLASS}
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
};
