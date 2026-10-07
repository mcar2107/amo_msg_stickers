import type { ShouldShowFeedFailureOptions } from './useGifFeed.types';

/**
 * Показывать ли ошибку последней загрузки на месте выдачи. Пустая лента без объяснения
 * выглядела бы как «ничего нет», а строка статуса ошибку может не показать: при открытом
 * экране она держит его статус. Пока идёт новая загрузка, на месте выдачи — заглушки, а лента
 * с выдачей остаётся как есть: ошибка подгрузки страницы не прячет уже показанное.
 *
 * @param options — ошибка последней загрузки, число GIF в выдаче и идёт ли загрузка
 * @returns нужно ли показать ошибку на месте выдачи
 */
export const shouldShowFeedFailure = (options: ShouldShowFeedFailureOptions): boolean => {
  const { failure, gifCount, isLoading } = options;

  return Boolean(failure) && !gifCount && !isLoading;
};
