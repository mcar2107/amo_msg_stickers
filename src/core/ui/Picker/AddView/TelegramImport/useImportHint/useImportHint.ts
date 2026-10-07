import { useCallback, useEffect, useState } from 'preact/hooks';

import { readHintSeen, writeHintSeen } from '../../../../../importHint';
import { PAGE_STORAGE } from '../../../../../pageStorage';

import type { ImportHintState } from './useImportHint.types';

/**
 * Раскрытие инструкции импорта. Признак «видел» читается один раз при монтировании — панель
 * монтируется вместе с экраном «Добавить стикеры», — а пишется при показе сегмента «Telegram».
 * Поэтому первый показ раскрыт, а следующий после закрытия экрана или перезагрузки — свёрнут.
 * Признак пишется по показу сегмента, а не по успешному импорту: инструкцию видел и тот, кто
 * импорт не довёл.
 *
 * @param isActive — сегмент «Telegram» выбран и панель видна
 * @returns раскрыта ли инструкция и её переключение
 */
export const useImportHint = (isActive: boolean): ImportHintState => {
  const [isHintOpen, setIsHintOpen] = useState(() => {
    return !readHintSeen(PAGE_STORAGE);
  });

  useEffect(() => {
    if (isActive) writeHintSeen(PAGE_STORAGE);
  }, [isActive]);

  const toggleHint = useCallback(() => {
    setIsHintOpen((isOpen) => {
      return !isOpen;
    });
  }, []);

  return { isHintOpen, toggleHint };
};
