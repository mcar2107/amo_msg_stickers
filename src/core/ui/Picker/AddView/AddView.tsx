import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../i18n/translate';
import { Screen } from '../Screen/Screen';

import { CreateSticker } from './CreateSticker/CreateSticker';
import { TelegramImport } from './TelegramImport/TelegramImport';

/**
 * Добавление стикеров: импорт пака из Telegram и свой стикер из файла.
 */
export const AddView: FC = () => {
  return (
    <Screen title={t('add.title')} footer={null}>
      <div className="flex flex-col gap-2 px-0.5">
        <TelegramImport />

        <CreateSticker />
      </div>
    </Screen>
  );
};
