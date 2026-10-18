import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { elementById } from '../../../elementById/elementById';
import { isFocusLost } from '../../../isFocusLost/isFocusLost';
import { segmentTabId } from '../../segmentIds/segmentIds';

/**
 * Фокус после импорта файла, который оставил экран открытым: добавлять оказалось нечего, файл не прошёл проверку или
 * успешный импорт ничего не добавил в ленту. «Импорт» тогда становится недоступна, и фокус с неё упал бы в `body`, —
 * он встаёт на вкладку «Файл», как при открытии сегмента: «Выбрать файл» Enter по привычке открыл бы диалог файла.
 * Успешный импорт с переходом к ленте закрывает экран, и фокус ставит переход.
 *
 * Фокус переводится, только если он потерян и панель на виду: ушедший в поле ввода amo или на другой сегмент его не
 * теряет.
 *
 * @param panelRef — панель сегмента «Файл»
 * @param isImporting — идёт импорт из файла
 */
export const useImportEndFocus = (
  panelRef: RefObject<HTMLElement>,
  isImporting: boolean
): void => {
  const wasImportingRef = useRef(isImporting);

  useEffect(() => {
    const wasImporting = wasImportingRef.current;
    const panel = panelRef.current;

    wasImportingRef.current = isImporting;
    if (!wasImporting || isImporting || !panel?.checkVisibility()) return;

    const tab = elementById(panel, segmentTabId('file'));

    if (tab && isFocusLost(tab)) tab.focus({ preventScroll: true });
  }, [panelRef, isImporting]);
};
