import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedEvent } from 'preact';

import { modePanelId, modeTabId } from './modeIds';
import type { ModePanelProps } from './ModePanel.types';
import { useScrollRestore } from './useScrollRestore';

/**
 * Появление — переход из `@starting-style`: панель не размонтируется, а переход срабатывает
 * на каждый показ после `display: none`. Переход только под `motion-safe:` — без него
 * стартовая прозрачность сменяется мгновенно, и уменьшение движения выключает его одним
 * вариантом. Длительность под тем же вариантом, что и переход: иначе её перебила бы
 * длительность по умолчанию из `motion-safe:transition-opacity`.
 */
const APPEAR_CLASS =
  'motion-safe:transition-opacity motion-safe:duration-base [@starting-style]:opacity-0';

const panelVariants = cva('', {
  variants: {
    isActive: {
      true: ['flex min-h-0 flex-1 flex-col', APPEAR_CLASS],
      false: 'hidden',
    },
  },
});

/**
 * Панель режима: смонтирована всегда, чтобы запрос поиска и загруженная выдача пережили
 * переключение. Скрытая панель — `display: none`: её нет ни в раскладке, ни в порядке Tab,
 * а GIF в ней не отрисовываются. Прокрутку, которую сбрасывает скрытие, панель возвращает
 * при показе.
 *
 * Под экраном панель не скрывается, а получает `inert`: так её прокрутка не сбрасывается,
 * а Tab и скринридер не уходят в режим за экраном.
 */
export const ModePanel: FC<ModePanelProps> = (props) => {
  const { mode, isActive, isInert, children } = props;
  const rememberScroll = useScrollRestore(isActive);

  /**
   * `scroll` не всплывает, поэтому слушается на погружении: так панель видит прокрутку любого
   * элемента режима, не зная его вёрстки.
   */
  const handlePanelScroll = (event: TargetedEvent<HTMLDivElement>) => {
    if (event.target instanceof Element) rememberScroll(event.target);
  };

  return (
    <div
      role="tabpanel"
      id={modePanelId(mode)}
      aria-labelledby={modeTabId(mode)}
      className={panelVariants({ isActive })}
      inert={isInert}
      onScrollCapture={handlePanelScroll}
    >
      {children}
    </div>
  );
};
