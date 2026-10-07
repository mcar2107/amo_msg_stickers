import type { HoldReason, PopupHolds } from './hoverPopup.types';

/**
 * Причины, которые пишет DOM панели: у скрытой панели их некому снять.
 *
 * Открытый экран (`screen`) — не из них: экран переживает закрытие попапа, а причину ставит
 * смена экрана, а не событие DOM. Снятая на закрытии, она не вернулась бы при повторном
 * открытии наведением, и попап с открытым экраном снова закрывался бы уходом курсора.
 */
const PANEL_REASONS: HoldReason[] = ['field', 'fileDialog', 'preview'];

const NO_RELEASE = () => {};

/**
 * Общий объект удержания попапа: фасад пикера отдаёт `isHeld` контроллеру наведения, а
 * провайдер и панель пишут в него причины. `isHeld` читается в момент срабатывания таймера
 * закрытия; `onRelease` сообщает о снятии последней причины — попап, из которого курсор уже
 * ушёл, иначе остался бы открытым до следующего входа и ухода курсора.
 *
 * @param onRelease — колбэк на снятие последней причины удержания
 * @returns запись причин и проверка удержания
 */
export const createPopupHolds = (onRelease: () => void = NO_RELEASE): PopupHolds => {
  const active = new Set<HoldReason>();

  const isHeld = () => {
    return active.size > 0;
  };

  /**
   * Колбэк зовётся только на переходе «удержан → свободен»: снятие причины, которой не было,
   * ничего не сообщает.
   *
   * @param remove — снимает причины из набора
   */
  const releaseWith = (remove: () => void) => {
    if (!isHeld()) return;
    remove();

    if (!isHeld()) onRelease();
  };

  const set = (reason: HoldReason, isActive: boolean) => {
    if (isActive) {
      active.add(reason);

      return;
    }

    releaseWith(() => {
      active.delete(reason);
    });
  };

  const releasePanel = () => {
    releaseWith(() => {
      for (const reason of PANEL_REASONS) active.delete(reason);
    });
  };

  return { set, isHeld, releasePanel };
};
