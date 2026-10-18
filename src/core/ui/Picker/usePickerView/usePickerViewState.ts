import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

import { countFavoriteStickers, countStickers } from '@core/db';
import { PAGE_STORAGE } from '@core/pageStorage';
import { writeMode } from '@core/pickerMode';
import type { PickerMode } from '@core/pickerMode.types';

import { DEFAULT_ADD_SEGMENT, resolveAddSegment } from './addSegment';
import { startMode } from './startMode';
import type {
  AddSegment,
  OpenScreenOptions,
  PickerScreen,
  PickerViewValue,
  ScreenFocus,
  SectionAnchor,
  SectionMotion,
  SectionScrollOptions,
} from './usePickerView.types';

/**
 * Состояние вида: режим, экран поверх него, сегмент «Добавить стикеры» и якорь ленты
 * стикеров. Методы стабильны между
 * рендерами и сбрасывают статус: он держится до следующего действия пользователя.
 *
 * Режим первого открытия на странице — сохранённый, без него — по библиотеке и избранному. Выбор,
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
  const [screenFocus, setScreenFocus] = useState<ScreenFocus | null>(null);
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
      const nextMode = await startMode(
        PAGE_STORAGE,
        countStickers,
        countFavoriteStickers
      );

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
    (nextScreen: PickerScreen, options: OpenScreenOptions = {}) => {
      const { segment, focus } = options;

      setAddSegment((current) => {
        return resolveAddSegment(current, segment);
      });
      setScreenFocus(focus || null);
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
    (sectionId: string, motion: SectionMotion, options: SectionScrollOptions = {}) => {
      const { shouldFocusTab = false } = options;

      anchorSeqRef.current += 1;
      chooseMode('stickers');
      setScreen(null);
      setAnchor({ sectionId, seq: anchorSeqRef.current, motion, shouldFocusTab });
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
      screenFocus,
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
    screenFocus,
    setMode,
    openScreen,
    chooseSegment,
    closeScreen,
    scrollToSection,
  ]);
};
