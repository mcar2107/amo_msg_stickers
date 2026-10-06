import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedFocusEvent } from 'preact';

import type { PanelPhase } from '../../hoverPopup.types';
import { t } from '../../i18n/translate';

import { AddView } from './AddView/AddView';
import { Footer } from './Footer/Footer';
import { GifView } from './GifView/GifView';
import { isTextField } from './isTextField/isTextField';
import { ModePanel } from './ModePanel/ModePanel';
import { usePicker } from './PickerProvider/usePicker';
import { PreviewOverlay } from './Preview/PreviewOverlay/PreviewOverlay';
import { PreviewProvider } from './Preview/PreviewProvider';
import { SettingsView } from './SettingsView/SettingsView';
import { StatusBar } from './StatusBar/StatusBar';
import { StickersMode } from './StickersMode/StickersMode';
import { useOpenLoad } from './useOpenLoad/useOpenLoad';
import { usePickerView } from './usePickerView/usePickerView';
import type { PickerScreen } from './usePickerView/usePickerView.types';
import type { PickerProps } from './Picker.types';

/**
 * Геометрия, тень и радиус повторяют попап эмодзи amo: панель встаёт на его место над
 * правым краем поля ввода.
 *
 * `bottom-12`, а не `bottom-9.5` контейнера эмодзи: тот на 10px выше своей панели (410px
 * против 400px), панель прижата к его верху, и между ней и полем ввода остаётся зазор.
 * На `bottom-9.5` наша панель заходила бы на поле ввода.
 *
 * `left-auto m-0 p-0` снимают стили `<dialog>` браузера: без них панель встала бы по
 * центру между `left: 0` и `right`.
 *
 * Шрифт и межстрочный интервал задаются здесь: preflight Tailwind ставит их на `:host`,
 * но `:host { all: initial }` в `picker.css` идёт позже и отменяет и их, и наследование
 * от страницы.
 */
const PANEL_CLASS = [
  'fixed bottom-12 right-7.5 z-[2] h-[400px] w-[352px] flex-col overflow-hidden rounded-lgx',
  'left-auto m-0 p-0',
  'font-primary text-xsm leading-[1.3]',
  'bg-white-0 text-gray-30 dark:bg-gray-10 dark:text-gray-40',
  'shadow-[0_3px_7px] shadow-black-0/10 ring-1 ring-cadetGray-30/[.28] dark:ring-white-0/10',
];

/**
 * Анимация открытия — переход из `@starting-style`: панель не размонтируется при
 * закрытии, а переход срабатывает на каждое появление после `display: none`.
 */
const OPEN_ANIMATION_CLASS =
  'transition-[opacity,transform] duration-lg ease-linear [@starting-style]:translate-y-[5px] [@starting-style]:opacity-0';

/**
 * `flex` — только у видимой панели: скрытая остаётся смонтированной и скрыта
 * `display: none`, чтобы вкладка и запрос поиска пережили повторное открытие.
 *
 * Уходящая панель проигрывает переход открытия в обратную сторону тем же переходом и не
 * принимает курсор: клик по ней в эти 200 мс ушёл бы в невидимую ячейку.
 */
const panelVariants = cva([...PANEL_CLASS, OPEN_ANIMATION_CLASS], {
  variants: {
    phase: {
      open: 'flex',
      closing: 'pointer-events-none flex translate-y-[5px] opacity-0',
      closed: 'hidden',
    } satisfies Record<PanelPhase, string>,
    isDark: {
      true: 'dark',
    },
  },
});

/**
 * Область над футером. Экран и строка статуса лежат в ней слоями поверх режима, а не в
 * потоке: лента не меняет высоту, и её прокрутка не сдвигается.
 */
const BODY_CLASS = 'relative flex min-h-0 flex-1 flex-col';

const renderScreen = (screen: PickerScreen) => {
  switch (screen) {
    case 'add': {
      return <AddView />;
    }

    case 'settings': {
      return <SettingsView />;
    }

    default: {
      const unknownScreen: never = screen;

      throw new Error(`Unknown picker screen: ${String(unknownScreen)}`);
    }
  }
};

export const Picker: FC<PickerProps> = (props) => {
  const { phase, isDark, previewRoot, onClose } = props;
  const { setHold } = usePicker();
  const { mode, screen } = usePickerView();
  /**
   * Уходящая панель ещё видна: содержимое живёт как у открытой, и возврат курсора во время
   * ухода ничего в нём не перезагружает.
   */
  const isOpen = phase !== 'closed';
  const isCovered = screen !== null;

  useOpenLoad(isOpen);

  /**
   * Нажатия не всплывают из попапа: иначе ввод в поиске запускал бы хоткеи amo.
   */
  const handlePanelKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    event.stopPropagation();
  };

  /**
   * Фокус переходит между полями панели парой `focusout` → `focusin`, поэтому удержание
   * между ними не прерывается.
   */
  const handlePanelFocusIn = (event: TargetedFocusEvent<HTMLDialogElement>) => {
    if (isTextField(event.target)) setHold('field', true);
  };

  const handlePanelFocusOut = (event: TargetedFocusEvent<HTMLDialogElement>) => {
    if (isTextField(event.target)) setHold('field', false);
  };

  return (
    <dialog
      open={isOpen}
      aria-label={t('picker.title')}
      className={panelVariants({ phase, isDark })}
      onKeyDown={handlePanelKeyDown}
      onFocusIn={handlePanelFocusIn}
      onFocusOut={handlePanelFocusOut}
    >
      <PreviewProvider phase={phase}>
        <div className={BODY_CLASS}>
          <ModePanel mode="stickers" isActive={mode === 'stickers'} isInert={isCovered}>
            <StickersMode isOpen={isOpen} />
          </ModePanel>

          <ModePanel mode="gifs" isActive={mode === 'gifs'} isInert={isCovered}>
            <GifView isOpen={isOpen} />
          </ModePanel>

          {/*
           * Экраны — разные компоненты: смена экрана на экран монтирует новый, и его появление
           * проигрывается снова.
           */}
          {screen && renderScreen(screen)}

          <StatusBar isRaised={isCovered} />
        </div>

        <Footer />

        <PreviewOverlay container={previewRoot} isDark={isDark} />
      </PreviewProvider>
    </dialog>
  );
};
