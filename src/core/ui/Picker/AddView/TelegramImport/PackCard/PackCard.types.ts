import type { PackCard } from '@ui/PickerProvider/packCardView';

export type PackCardProps = {
  /**
   * id карточки: на него ссылается `aria-describedby` поля ссылки.
   */
  id: string;

  /**
   * Что показать: заглушку загрузки, превью пака до импорта или ход импорта.
   */
  card: PackCard;
};
