import { t } from '@core/i18n';
import { packTitle } from '@core/packTitle';
import type { AddSegment, PickerScreen } from '@ui/usePickerView';

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
 * Переход закрывает экран вместе с кнопкой футера, на которой стоял фокус, — поэтому фокус встаёт на вкладку раздела,
 * а не падает в `body`.
 *
 * @param options — экран, пак и колбэки провайдера
 */
export const finishImport = (options: FinishImportOptions): void => {
  const { screen, pack, scrollToSection, showStatus } = options;

  if (screen === 'add') scrollToSection(pack.id, 'instant', { shouldFocusTab: true });

  showStatus(t('status.packAdded', { title: packTitle(pack) }));
};

/**
 * Ошибка у формы импорта — у поля ссылки или зоны загрузки файла — только когда форма на виду: на экране «Добавить
 * стикеры» с сегментом этого импорта. Ушедший с сегмента или экрана за время импорта формы не видит, и ошибка у неё
 * прошла бы незамеченной — она уходит в статус.
 *
 * @param screen — экран поверх режима в момент ошибки; `null` — экрана нет
 * @param segment — выбранный сегмент экрана «Добавить стикеры»
 * @param importSegment — сегмент, на котором живёт форма импорта: `telegram` или `file`
 * @returns куда показать ошибку
 */
export const importErrorTarget = (
  screen: PickerScreen | null,
  segment: AddSegment,
  importSegment: AddSegment
): ImportErrorTarget => {
  return screen === 'add' && segment === importSegment ? 'field' : 'status';
};
