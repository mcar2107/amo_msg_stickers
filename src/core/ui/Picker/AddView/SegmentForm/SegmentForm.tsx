import type { FunctionComponent as FC, TargetedSubmitEvent } from 'preact';

import { segmentFormId, segmentTabId } from '../segmentIds/segmentIds';

import type { SegmentFormProps } from './SegmentForm.types';

/**
 * Панель сегмента — сама форма: кнопка футера экрана лежит вне неё и связана атрибутом `form`,
 * поэтому Enter в поле отправляет форму, только пока эта кнопка доступна.
 *
 * Невыбранная панель скрыта `hidden`, а не размонтирована: введённая ссылка и черновик
 * стикера переживают смену сегмента. Раскладка полей — во вложенном блоке: класс `flex` на
 * самой форме перебил бы `display: none` атрибута `hidden`. Сегмент — одна группа полей, и
 * между ними 12 px, как между полями группы «Настроек» (D10).
 */
export const SegmentForm: FC<SegmentFormProps> = (props) => {
  const { segment, isActive, onSubmit, children } = props;

  const handleFormSubmit = (event: TargetedSubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      id={segmentFormId(segment)}
      role="tabpanel"
      aria-labelledby={segmentTabId(segment)}
      hidden={!isActive}
      noValidate
      onSubmit={handleFormSubmit}
    >
      <div className="flex flex-col gap-3 px-0.5">{children}</div>
    </form>
  );
};
