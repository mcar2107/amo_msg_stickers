import type { ComponentChildren } from 'preact';

import type { Pack, SendItem } from '../../../db.types';
import type { Host, Settings } from '../../../host.types';
import type { HoldReason, OpenedBy, PopupHolds } from '../../../hoverPopup.types';
import type {
  PickerScreen,
  PickerViewValue,
  SectionMotion,
} from '../usePickerView/usePickerView.types';

export type PickerStatus = {
  /**
   * Текст строки статуса.
   */
  text: string;

  /**
   * Статус — ошибка: показывается цветом ошибки.
   */
  isError: boolean;
};

export type PickerContextValue = {
  /**
   * Окружение: сеть и настройки расширения или userscript.
   */
  env: Host;

  /**
   * Настройки на момент последней загрузки.
   */
  settings: Settings;

  /**
   * Перечитывает настройки из окружения при открытии пикера.
   */
  refreshSettings: () => Promise<void>;

  /**
   * Записывает изменённые поля настроек в окружение, применяет их без перезагрузки страницы и
   * показывает статус «Сохранено». Записи идут по одной в порядке вызова, а перечитывание
   * настроек ждёт начатую запись. Промис не отклоняется: ошибка уходит в статус.
   *
   * @returns `true` — поля записаны
   */
  saveSettings: (next: Partial<Settings>) => Promise<boolean>;

  /**
   * Паки стикеров в порядке вкладок.
   */
  packs: Pack[];

  /**
   * Перечитывает паки из базы — после импорта, создания или удаления.
   */
  refreshPacks: () => Promise<void>;

  /**
   * Текущий статус; `null` — строка статуса скрыта.
   */
  status: PickerStatus | null;

  /**
   * Показывает информационный статус.
   */
  showStatus: (text: string) => void;

  /**
   * Показывает статус ошибки.
   */
  showError: (text: string) => void;

  /**
   * Скрывает строку статуса.
   */
  clearStatus: () => void;

  /**
   * Отправляет стикер или GIF: статус «Отправляю…», при успехе — закрытие пикера, при
   * ошибке — её текст в статусе. Промис не отклоняется и завершается вместе с отправкой.
   */
  send: (item: SendItem) => Promise<void>;

  /**
   * Object URL блоба стикера: для одного id один и тот же URL, пока пикер открыт. При
   * закрытии URL отзываются, после открытия `urlOf` создаёт новые.
   */
  urlOf: (id: string, blob: Blob) => string;

  /**
   * Отзывает URL удалённого стикера.
   */
  dropUrl: (id: string) => void;

  /**
   * Импорт пака из Telegram: его ход переживает уход с вкладки «Добавить стикеры».
   */
  packImport: PackImportState;

  /**
   * Чем открыт пикер последний раз: наведением фокус из поля сообщения не уводится.
   */
  openedBy: OpenedBy;

  /**
   * Включает или снимает причину удержания пикера: удержанный пикер не закрывается уходом
   * курсора. Ссылка стабильна между рендерами.
   */
  setHold: (reason: HoldReason, isActive: boolean) => void;
};

export type PackImportState = {
  /**
   * Идёт импорт: повторный запуск недоступен, в том числе после возврата на вкладку.
   */
  isImporting: boolean;

  /**
   * Доля обработанных стикеров в процентах; `null` — импорт не идёт, полоса прогресса
   * скрыта: после успеха и после ошибки её нет.
   */
  percent: number | null;

  /**
   * Импортирует пак по ссылке или имени; пока идёт импорт, вызов ничего не делает.
   * Промис не отклоняется: ошибка уходит в статус, по успеху открывается вкладка пака.
   */
  importPack: (link: string) => Promise<void>;
};

export type PackImportOptions = {
  /**
   * Окружение: сеть для Bot API и загрузки файлов.
   */
  env: Host;

  /**
   * Настройки с токеном Telegram-бота.
   */
  settings: Settings;

  /**
   * Открытый экран поверх режима: к паку лента прокручивается, только если по завершении
   * открыт экран «Добавить стикеры».
   */
  screen: PickerScreen | null;

  /**
   * Перечитывает паки: вкладка пака появляется после первого стикера и по завершении.
   */
  refreshPacks: () => Promise<void>;

  /**
   * Показывает ход импорта и итог в статусе.
   */
  showStatus: (text: string) => void;

  /**
   * Показывает ошибку импорта в статусе.
   */
  showError: (text: string) => void;

  /**
   * Открывает раздел импортированного пака в ленте стикеров.
   */
  scrollToSection: (sectionId: string, motion: SectionMotion) => void;
};

export type PickerProviderProps = {
  /**
   * Окружение: сеть и настройки расширения или userscript.
   */
  env: Host;

  /**
   * Колбэк на выбор стикера или GIF. Отклонённый промис — отправка не удалась.
   */
  onSend: (item: SendItem) => Promise<void>;

  /**
   * Колбэк на закрытие пикера после успешной отправки.
   */
  onClose: () => void;

  /**
   * Виден ли пикер, в том числе пока уходит анимацией закрытия: при скрытии отзываются
   * object URL стикеров.
   */
  isOpen: boolean;

  /**
   * Чем открыт пикер последний раз: наведением или кликом.
   */
  openedBy: OpenedBy;

  /**
   * Общий объект удержания фасада: провайдер и панель пишут в него причины.
   */
  holds: PopupHolds;

  /**
   * Дерево пикера.
   */
  children: ComponentChildren;
};

export type PickerStateOptions = {
  /**
   * Окружение: сеть и настройки расширения или userscript.
   */
  env: Host;

  /**
   * Колбэк на выбор стикера или GIF. Отклонённый промис — отправка не удалась.
   */
  onSend: (item: SendItem) => Promise<void>;

  /**
   * Колбэк на закрытие пикера после успешной отправки.
   */
  onClose: () => void;

  /**
   * Виден ли пикер, в том числе пока уходит анимацией закрытия: при скрытии отзываются
   * object URL стикеров.
   */
  isOpen: boolean;

  /**
   * Чем открыт пикер последний раз: наведением или кликом.
   */
  openedBy: OpenedBy;

  /**
   * Общий объект удержания фасада: провайдер и панель пишут в него причины.
   */
  holds: PopupHolds;
};

export type PickerStateValue = {
  /**
   * Значение `PickerContext`.
   */
  picker: PickerContextValue;

  /**
   * Значение `PickerViewContext`.
   */
  view: PickerViewValue;
};
