import { render } from 'preact';

import type { Host } from '@core/host.types';
import type { OpenedBy } from '@core/hoverPopup.types';
import { createPopupHolds } from '@core/hoverPopupHolds';
import { createPanelPhase } from '@core/hoverPopupPhase';
import { Picker } from '@ui';
import { PickerProvider } from '@ui/PickerProvider';

import css from './picker.css';

import type { PanelAnchor, PickerCallbacks, PickerHandle } from './createPicker.types';

/**
 * Длительность ухода панели, мс — как у перехода `duration-lg` панели и у попапа эмодзи.
 *
 * Пара токену `transitionDuration.lg` в `tailwind.config.ts`: конфиг Tailwind в код пикера не
 * импортируется, поэтому значения меняются вместе. Таймер короче перехода скрыл бы панель до
 * конца анимации, длиннее — держал бы невидимую панель в документе.
 */
const CLOSE_ANIMATION_MS = 200;

/**
 * Стиль хоста слоя предпросмотра: во всё окно, над любым слоем страницы. `all: initial` идёт
 * первым — остальные свойства его переопределяют.
 */
const PREVIEW_HOST_STYLE =
  'all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;';

/**
 * Пикер в shadow root за императивным фасадом: `app.ts` живёт в DOM amo без Preact и
 * управляет попапом вызовами методов.
 *
 * Дерево перерисовывается `render()` на каждое изменение фазы панели и темы: закрытый
 * пикер остаётся смонтированным, поэтому состояние компонентов (вкладка, запрос поиска)
 * переживает повторное открытие.
 *
 * Закрытие проходит фазу `closing`: панель уходит анимацией и только потом скрывается.
 * Содержимое на это время считается открытым — повторное открытие во время ухода не
 * перезагружает его и не пересоздаёт картинки.
 *
 * @param env — окружение: сеть и настройки
 * @param callbacks — отправка стикера, реакция на закрытие и на снятие удержания
 * @returns управление пикером
 */
export const createPicker = (env: Host, callbacks: PickerCallbacks): PickerHandle => {
  const { onSend, onClose, onHoldRelease } = callbacks;
  const element = document.createElement('div');

  element.setAttribute('data-amo-stickers-picker', '');
  /**
   * `closed`: во вкладке «Настройки» лежат ключи GIF и токен бота, а у открытого
   * shadow root их прочитал бы любой скрипт страницы через `element.shadowRoot`.
   * Ссылка на корень нужна только фасаду — она остаётся в замыкании.
   */
  const shadowRoot = element.attachShadow({ mode: 'closed' });

  /**
   * Слой предпросмотра: отдельный хост на всю страницу. `position: fixed` внутри пикера
   * считается от предка с transform — контейнера поля ввода или обёртки кнопки, поэтому накрыть окно оверлеем из дерева
   * панели нельзя. Хост лежит в `documentElement`, а не в `body`: слежение ядра и amo за
   * `body` он не будит. Курсор хост не принимает — его включает только закреплённый слой.
   */
  const previewElement = document.createElement('div');

  previewElement.setAttribute('data-amo-stickers-preview', '');
  previewElement.style.cssText = PREVIEW_HOST_STYLE;

  const previewRoot = previewElement.attachShadow({ mode: 'closed' });

  document.documentElement.append(previewElement);

  /**
   * До первого открытия — наведение: оно ничего не делает с фокусом.
   */
  let openedBy: OpenedBy = 'hover';
  let isDark = false;
  let anchor: PanelAnchor = { by: 'composer', maxHeight: null };

  const holds = createPopupHolds(onHoldRelease);
  const panel = createPanelPhase({
    closeDuration: CLOSE_ANIMATION_MS,
    onChange: () => {
      update();
    },
  });

  const close = () => {
    if (panel.phase !== 'open') return;
    holds.releasePanel();
    panel.hide();
    onClose();
  };

  const handlePickerClose = () => {
    close();
  };

  /**
   * `<style>` рендерится в том же дереве, а не вставляется в shadow root заранее:
   * первый `render()` Preact удаляет из контейнера узлы, которых нет в дереве.
   */
  const update = () => {
    const { phase } = panel;

    render(
      <>
        <style>{css}</style>

        <PickerProvider
          env={env}
          onSend={onSend}
          onClose={handlePickerClose}
          isOpen={phase !== 'closed'}
          openedBy={openedBy}
          holds={holds}
        >
          <Picker
            phase={phase}
            isDark={isDark}
            anchor={anchor}
            previewRoot={previewRoot}
            onClose={handlePickerClose}
          />
        </PickerProvider>
      </>,
      shadowRoot
    );
  };

  const open = (nextOpenedBy: OpenedBy, nextAnchor: PanelAnchor) => {
    if (panel.phase === 'open') return;
    openedBy = nextOpenedBy;
    anchor = nextAnchor;
    panel.show();
  };

  const setTheme = (nextIsDark: boolean) => {
    if (nextIsDark === isDark) return;
    isDark = nextIsDark;
    update();
  };

  update();

  return {
    element,
    previewElement,
    get isOpen() {
      return panel.phase === 'open';
    },
    get isClosing() {
      return panel.phase === 'closing';
    },
    isHeld: holds.isHeld,
    open,
    close,
    setTheme,
  };
};
