import { cva } from 'class-variance-authority';
import type { FunctionComponent as FC, TargetedSubmitEvent } from 'preact';

import { segmentFormId, segmentTabId } from '../segmentIds/segmentIds';

import type { SegmentFormProps } from './SegmentForm.types';

/**
 * Колонка flex у самой формы — только у выбранной: класс `flex` на скрытой перебил бы `display: none` атрибута
 * `hidden`.
 */
const formVariants = cva('', {
  variants: {
    isActive: {
      true: 'flex grow flex-col',
      false: '',
    },
  },
});

/**
 * Панель сегмента — сама форма: кнопка футера экрана лежит вне неё и связана атрибутом `form`,
 * поэтому Enter в поле отправляет форму, только пока эта кнопка доступна.
 *
 * Невыбранная панель скрыта `hidden`, а не размонтирована: введённая ссылка и черновик
 * стикера переживают смену сегмента. Раскладка полей — во вложенном блоке.
 *
 * Колонка и `grow` на обоих уровнях отдают полям свободную высоту тела экрана, которое её делит
 * (`shouldFitBody` экрана), а минимум по содержимому не даёт форме стать ниже полей: что не
 * поместилось, прокручивает тело, а не прячется под строку статуса. В обычном теле форма
 * высотой по содержимому. Сегмент — одна группа полей, и между ними 12 px, как между полями
 * группы «Настроек».
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
      className={formVariants({ isActive })}
      onSubmit={handleFormSubmit}
    >
      <div className="flex grow flex-col gap-3 px-0.5">{children}</div>
    </form>
  );
};
