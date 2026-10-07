import { t } from '../../../../i18n/translate';
import { packTitle } from '../../packTitle/packTitle';
import type { AddSegment, PickerScreen } from '../../usePickerView/usePickerView.types';

import type { FinishImportOptions, ImportErrorTarget } from './finishImport.types';

/**
 * Итог импорта. Пользователь, который дождался импорта на экране «Добавить стикеры», попадает к
 * разделу пака в ленте. Ушедший с экрана за время импорта уже смотрит что-то своё — лента и режим
 * не двигаются, итог виден только в статусе.
 *
 * Переход мгновенный: лента была под экраном, и плавный проезд под исчезающим экраном только
 * тормозил бы появление раздела. Статус — после перехода: `scrollToSection` сбрасывает статус
 * прошлого действия.
 *
 * @param options — экран, пак и колбэки провайдера
 */
export const finishImport = (options: FinishImportOptions): void => {
  const { screen, pack, scrollToSection, showStatus } = options;

  if (screen === 'add') scrollToSection(pack.id, 'instant');

  showStatus(t('status.packAdded', { title: packTitle(pack) }));
};

/**
 * Ошибка у поля ссылки — только когда поле на виду: на экране «Добавить стикеры» с сегментом
 * «Telegram». Ушедший с сегмента или экрана за время импорта поля не видит, и ошибка у него
 * прошла бы незамеченной — она уходит в статус.
 *
 * @param screen — экран поверх режима в момент ошибки; `null` — экрана нет
 * @param segment — выбранный сегмент экрана «Добавить стикеры»
 * @returns куда показать ошибку
 */
export const importErrorTarget = (
  screen: PickerScreen | null,
  segment: AddSegment
): ImportErrorTarget => {
  return screen === 'add' && segment === 'telegram' ? 'field' : 'status';
};
