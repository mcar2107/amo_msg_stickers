import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC } from 'preact';

import css from '../../../picker.css';

import { PreviewLayer } from '../PreviewLayer/PreviewLayer';
import { PreviewPortal } from '../PreviewPortal/PreviewPortal';
import { usePreview } from '../usePreview';

import type { PreviewOverlayProps } from './PreviewOverlay.types';

/**
 * Обёртка темы: `dark:`-варианты Tailwind ищут класс `dark` у предка, поэтому он стоит на
 * ней, а не на самом слое. Вариант `isDark` — как у панели (`panelVariants` в `Picker.tsx`).
 */
const themeVariants = cva('', {
  variants: {
    isDark: {
      true: 'dark',
    },
  },
});

/**
 * Оверлей предпросмотра на всю страницу: один на панель, состояние берёт из
 * `PreviewProvider`, а рисует в отдельный корень вне панели — `position: fixed` внутри
 * панели считается от контейнера поля ввода, а не от окна.
 *
 * Корень слоя — свой shadow root, поэтому стили пикера кладутся в него заново. Класс `dark`
 * стоит на обёртке, а не на самом слое: `dark:`-варианты Tailwind ищут его у предка.
 */
export const PreviewOverlay: FC<PreviewOverlayProps> = (props) => {
  const { container, isDark } = props;
  const { preview, step, close, finishLeave } = usePreview();

  return (
    <PreviewPortal container={container}>
      <style>{css}</style>

      <div className={themeVariants({ isDark })}>
        <PreviewLayer
          preview={preview}
          onClose={close}
          onStep={step}
          onLeaveEnd={finishLeave}
        />
      </div>
    </PreviewPortal>
  );
};
