import type { RefObject } from 'preact';
import { useEffect } from 'preact/hooks';

import { isTextField } from '../../isTextField/isTextField';

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
 * Фокус в первое текстовое поле тела экрана — при монтировании, то есть при переходе на экран
 * внутри открытого попапа, когда проигрывается его появление. Закрытый попап экран не
 * размонтирует, поэтому повторное открытие попапа фокус не переносит, а смена сегмента внутри
 * экрана оставляет его на вкладке.
 *
 * Без текстового поля (сегмент «Файл») фокус встаёт на вкладку выбранного сегмента, а не на первую кнопку тела:
 * первой там была бы «Выбрать файл», и Enter по привычке открыл бы диалог файла.
 *
 * @param bodyRef — ref тела экрана
 */
export const useScreenFocus = (bodyRef: RefObject<HTMLElement>): void => {
  useEffect(() => {
    const body = bodyRef.current;

    if (!body) return;
    (findFirstTextField(body) || findSelectedTab(body))?.focus();
  }, [bodyRef]);
};
