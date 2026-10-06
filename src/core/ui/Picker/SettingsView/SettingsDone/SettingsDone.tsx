import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../i18n/translate';
import { Button } from '../../Button/Button';
import { useScreenLeave } from '../../Screen/useScreenLeave/useScreenLeave';

import type { SettingsDoneProps } from './SettingsDone.types';

/**
 * «Готово» футера «Настроек» записывает несохранённое и уводит экран, как «Назад». Кнопка
 * не отправляет форму: Enter в поле фиксирует значение, а не закрывает экран.
 */
export const SettingsDone: FC<SettingsDoneProps> = (props) => {
  const { onCommit } = props;
  const leave = useScreenLeave();

  const handleDoneClick = () => {
    onCommit();
    leave();
  };

  return (
    <Button variant="primary" onClick={handleDoneClick}>
      {t('screen.done')}
    </Button>
  );
};
