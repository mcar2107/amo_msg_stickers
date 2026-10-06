import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

import { countStickers } from '../../../db';
import { writeMode } from '../../../pickerMode';
import type { ModeStorage, PickerMode } from '../../../pickerMode.types';

import { DEFAULT_ADD_SEGMENT, resolveAddSegment } from './addSegment';
import { startMode } from './startMode';
import type {
  AddSegment,
  PickerScreen,
  PickerViewValue,
  SectionAnchor,
  SectionMotion,
} from './usePickerView.types';

/**
 * `localStorage` страницы, к которому обращаются только внутри методов: сам геттер
 * `window.localStorage` бросает под запретом хранилища сайта, а исключения методов ловит
 * модуль режима.
 */
const PAGE_STORAGE: ModeStorage = {
  getItem: (key) => {
    return localStorage.getItem(key);
  },
  setItem: (key, value) => {
    localStorage.setItem(key, value);
  },
};

/**
 * Состояние вида: режим, экран поверх него, сегмент «Добавить стикеры» и якорь ленты
 * стикеров. Методы стабильны между
 * рендерами и сбрасывают статус: он держится до следующего действия пользователя.
 *
 * Режим первого открытия на странице — сохранённый, без него — по библиотеке. Выбор,
 * сделанный пользователем до ответа библиотеки, не перебивается.
 *
 * @param isOpen — виден ли пикер
 * @param clearStatus — сброс строки статуса
 * @returns значение контекста `usePickerView`
 */
export const usePickerViewState = (
  isOpen: boolean,
  clearStatus: () => void
): PickerViewValue => {
  const [mode, setModeState] = useState<PickerMode>('stickers');
  const [screen, setScreen] = useState<PickerScreen | null>(null);
  const [anchor, setAnchor] = useState<SectionAnchor | null>(null);
  const [addSegment, setAddSegment] = useState<AddSegment>(DEFAULT_ADD_SEGMENT);
  const anchorSeqRef = useRef(0);
  const hasStartedRef = useRef(false);
  const hasChosenRef = useRef(false);

  const closeScreen = useCallback(() => {
    setScreen(null);
    clearStatus();
  }, [setScreen, clearStatus]);

  /**
   * Layout-эффект, а не обычный: сохранённый режим встаёт до первой отрисовки открытого
   * попапа, и он не мелькает режимом по умолчанию.
   */
  useLayoutEffect(() => {
    if (!isOpen || hasStartedRef.current) return;

    hasStartedRef.current = true;

    const start = async () => {
      const nextMode = await startMode(PAGE_STORAGE, countStickers);

      if (!hasChosenRef.current) setModeState(nextMode);
    };

    void start();
  }, [isOpen]);

  const chooseMode = useCallback((nextMode: PickerMode) => {
    hasChosenRef.current = true;
    setModeState(nextMode);
    writeMode(PAGE_STORAGE, nextMode);
  }, []);

  const setMode = useCallback(
    (nextMode: PickerMode) => {
      chooseMode(nextMode);
      closeScreen();
    },
    [chooseMode, closeScreen]
  );

  const openScreen = useCallback(
    (nextScreen: PickerScreen, segment?: AddSegment) => {
      setAddSegment((current) => {
        return resolveAddSegment(current, segment);
      });
      setScreen(nextScreen);
      clearStatus();
    },
    [setScreen, clearStatus]
  );

  const chooseSegment = useCallback(
    (segment: AddSegment) => {
      setAddSegment(segment);
      clearStatus();
    },
    [clearStatus]
  );

  const scrollToSection = useCallback(
    (sectionId: string, motion: SectionMotion) => {
      anchorSeqRef.current += 1;
      chooseMode('stickers');
      setScreen(null);
      setAnchor({ sectionId, seq: anchorSeqRef.current, motion });
      clearStatus();
    },
    [chooseMode, setScreen, clearStatus]
  );

  return useMemo(() => {
    return {
      mode,
      screen,
      anchor,
      addSegment,
      setMode,
      openScreen,
      chooseSegment,
      closeScreen,
      scrollToSection,
    };
  }, [
    mode,
    screen,
    anchor,
    addSegment,
    setMode,
    openScreen,
    chooseSegment,
    closeScreen,
    scrollToSection,
  ]);
};
