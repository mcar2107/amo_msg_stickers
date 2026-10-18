import type { FunctionComponent as FC } from 'preact';

import { copyText } from '@core/clipboard';
import { t } from '@core/i18n';
import { MenuItem } from '@ui/Menu/MenuItem';
import { useMenuClose } from '@ui/Menu/useMenuClose';
import { usePicker } from '@ui/PickerProvider';

import type { CopyPackLinkItemProps } from './CopyPackLinkItem.types';

/**
 * Пункт «Копировать ссылку» меню пака. Меню закрывается первым, как у пункта предпросмотра:
 * оно возвращает фокус на кнопку «…», а статус копирования приходит позже, когда запись
 * в буфер закончилась. Удалось — статус «Ссылка на пак скопирована», не удалось — ошибка.
 */
export const CopyPackLinkItem: FC<CopyPackLinkItemProps> = (props) => {
  const { link } = props;
  const closeMenu = useMenuClose();
  const { showStatus, showError } = usePicker();

  const handleItemSelect = async () => {
    closeMenu();

    if (await copyText(link)) {
      showStatus(t('status.packLinkCopied'));
    } else {
      showError(t('error.copyLink'));
    }
  };

  return <MenuItem onSelect={handleItemSelect}>{t('pack.copyLink')}</MenuItem>;
};
