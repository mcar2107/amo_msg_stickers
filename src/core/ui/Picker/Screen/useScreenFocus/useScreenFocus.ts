import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { isTextField } from '@ui/isTextField';
import type { ScreenFocus } from '@ui/usePickerView';
import { SCREEN_FOCUS_ID, usePickerView } from '@ui/usePickerView';

import { focusScrollTop } from './focusScrollTop';

/**
 * Первое поле, в которое можно печатать сейчас: недоступное и скрытое (неактивная панель
 * сегмента — `hidden`) пропускаются.
 */
const findFirstTextField = (root: HTMLElement) => {
  return Array.from(root.querySelectorAll('input, textarea')).find(
    (element): element is HTMLInputElement | HTMLTextAreaElement => {
      return isTextField(element) && !element.disabled && element.checkVisibility();
    }
  );
};

/**
 * Выбранная вкладка в теле экрана — у «Добавить стикеры» это вкладка открытого сегмента.
 */
const findSelectedTab = (root: HTMLElement) => {
  return root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
};

/**
 * Отрезок элемента в координатах содержимого тела.
 */
const spanIn = (body: HTMLElement, element: HTMLElement) => {
  const { top, height } = element.getBoundingClientRect();

  return { top: top - body.getBoundingClientRect().top + body.scrollTop, height };
};

/**
 * Фокус на цель, которую попросила точка входа, и тело — к ней. Группа цели — ближайшая `section` внутри тела, без
 * неё — сама цель.
 *
 * @param body — тело экрана
 * @param focus — цель фокуса
 * @returns `false` — цели в теле нет, и фокус встаёт как обычно
 */
const focusTarget = (body: HTMLElement, focus: ScreenFocus) => {
  const target = body.querySelector<HTMLElement>(`#${SCREEN_FOCUS_ID[focus]}`);

  if (!target) return false;

  const section = target.closest('section');
  const group = section && body.contains(section) ? section : target;

  /**
   * Видимая высота — без нижнего отступа тела: в нём лежит строка статуса, и группа, прижатая к самому низу, ушла бы
   * под неё или легла вплотную к краю панели.
   */
  const viewport = body.clientHeight - parseFloat(getComputedStyle(body).paddingBottom);

  target.focus({ preventScroll: true });
  body.scrollTop = focusScrollTop({
    group: spanIn(body, group),
    target: spanIn(body, target),
    scrollTop: body.scrollTop,
    viewport,
  });

  return true;
};

/**
 * Фокус в первое текстовое поле тела экрана — при монтировании, то есть при переходе на экран
 * внутри открытого попапа, когда проигрывается его появление. Закрытый попап экран не
 * размонтирует, поэтому повторное открытие попапа фокус не переносит, а смена сегмента внутри
 * экрана оставляет его на вкладке.
 *
 * Без текстового поля (сегмент «Файл») фокус встаёт на вкладку выбранного сегмента, а не на первую кнопку тела:
 * первой там была бы «Выбрать файл», и Enter по привычке открыл бы диалог файла.
 *
 * Если точка входа ведёт к конкретному действию (`screenFocus` из `openScreen`), фокус встаёт на него, а тело
 * прокручивается к его группе. Цель берётся та, что была при монтировании: экран открывается вместе с ней.
 *
 * @param bodyRef — ref тела экрана
 */
export const useScreenFocus = (bodyRef: RefObject<HTMLElement>): void => {
  const { screenFocus } = usePickerView();
  const focusRef = useRef(screenFocus);

  useEffect(() => {
    const body = bodyRef.current;
    const focus = focusRef.current;

    if (!body) return;
    if (focus && focusTarget(body, focus)) return;
    (findFirstTextField(body) || findSelectedTab(body))?.focus();
  }, [bodyRef]);
};
