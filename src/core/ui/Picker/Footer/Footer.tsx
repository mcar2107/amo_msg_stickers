import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { usePickerView } from '@ui/usePickerView';

import { ModeTab } from './ModeTab';
import { SettingsIcon } from './SettingsIcon';

const FOOTER_CLASS = [
  'flex shrink-0 items-center gap-0.5 px-1.5 py-1',
  'border-t border-cadetGray-30/[.28] dark:border-white-0/10',
].join(' ');

/**
 * Открытый экран настроек отмечен, как выбранный режим: подложкой и акцентным цветом иконки.
 */
const SETTINGS_BUTTON_CLASS = [
  'ml-auto flex size-8.5 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-transparent p-1',
  'text-cadetGray-30 hover:bg-cadetGray-30/[.14] dark:text-gray-70 dark:hover:bg-white-0/[.07]',
  'aria-pressed:bg-cadetGray-30/[.14] aria-pressed:text-blue-50',
  'dark:aria-pressed:bg-white-0/[.07] dark:aria-pressed:text-beige-70',
  'motion-safe:transition-colors motion-safe:duration-base',
].join(' ');

/**
 * Низ панели: переключатель режимов «Стикеры» / «GIF» и кнопка «Настройки». Кнопка лежит
 * вне `tablist`: она открывает экран, а не режим, и в список вкладок не входит.
 *
 * «Настройки» — кнопка-переключатель (`aria-pressed`): нажата, пока открыт экран настроек, и
 * повторное нажатие закрывает его — как «Назад».
 */
export const Footer: FC = () => {
  const { screen, openScreen, closeScreen } = usePickerView();
  const isSettingsOpen = screen === 'settings';
  const settingsLabel = t('footer.settings');

  const handleSettingsClick = () => {
    if (isSettingsOpen) {
      closeScreen();

      return;
    }

    openScreen('settings');
  };

  return (
    <div className={FOOTER_CLASS}>
      <div
        role="tablist"
        aria-label={t('footer.modes')}
        className="flex items-center gap-0.5"
      >
        <ModeTab mode="stickers" title={t('footer.stickers')} />

        <ModeTab mode="gifs" title={t('footer.gifs')} />
      </div>

      <button
        type="button"
        title={settingsLabel}
        aria-label={settingsLabel}
        aria-pressed={isSettingsOpen}
        className={SETTINGS_BUTTON_CLASS}
        onClick={handleSettingsClick}
      >
        <SettingsIcon />
      </button>
    </div>
  );
};
