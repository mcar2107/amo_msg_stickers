import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { MenuItem } from '../../Menu/MenuItem/MenuItem';
import { useMenuClose } from '../../Menu/useMenuClose/useMenuClose';
import { usePicker } from '../../PickerProvider/usePicker';

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
