import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import { MenuItem } from '@ui/Menu/MenuItem';
import { useMenuClose } from '@ui/Menu/useMenuClose';
import { usePicker } from '@ui/PickerProvider';

import type { ExportPackItemProps } from './ExportPackItem.types';

/**
 * Пункт «Выгрузить пак» меню пака. Меню закрывается первым, как у «Копировать ссылку»: ход и итог выгрузки идут в
 * статус, и выгрузка доходит до конца после закрытия меню. Пока идёт любая выгрузка — пака или библиотеки, — пункт
 * недоступен: второй файл поверх первого не собирается.
 */
export const ExportPackItem: FC<ExportPackItemProps> = (props) => {
  const { packId, title } = props;
  const closeMenu = useMenuClose();
  const {
    libraryExport: { isExporting, exportPack },
  } = usePicker();

  const handleItemSelect = async () => {
    closeMenu();
    await exportPack(packId, title);
  };

  return (
    <MenuItem isDisabled={isExporting} onSelect={handleItemSelect}>
      {t('pack.export')}
    </MenuItem>
  );
};
