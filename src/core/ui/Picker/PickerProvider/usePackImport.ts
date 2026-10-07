import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { BUILTIN_TELEGRAM_TOKEN } from '../../../builtinToken';
import { t } from '../../../i18n/translate';
import {
  importTelegramSet,
  parseSetName,
  previewOutcome,
  resolveTelegramSet,
  TG_ID_PREFIX,
} from '../../../sources/telegram';
import type { ImportProgress } from '../../../sources/telegram.types';

import { finishImport, importErrorTarget } from './finishImport/finishImport';
import type { ImportErrorTarget } from './finishImport/finishImport.types';
import { packCard, previewView, shouldRequestPreview } from './packCardView/packCardView';
import type {
  PackSummary,
  PreviewEntry,
  PreviewResult,
} from './packCardView/packCardView.types';
import { createPackPreview } from './packPreview/packPreview';
import { runPackImport } from './runPackImport/runPackImport';
import { errorMessage } from './errorMessage';
import type {
  ImportCount,
  PackImportOptions,
  PackImportState,
} from './PickerProvider.types';

/**
 * Пауза после последней правки ссылки до запроса превью: вставка показывает карточку почти
 * сразу, а ввод руками не шлёт запрос на каждую букву.
 */
const PREVIEW_DELAY_MS = 300;

/**
 * Ответ превью по ошибке запроса набора: «пак не найден» несёт текст, который показал бы импорт.
 *
 * @param error — ошибка запроса набора
 * @returns ответ превью
 */
const failedPreview = (error: unknown): PreviewResult => {
  const outcome = previewOutcome(error);

  switch (outcome) {
    case 'notFound': {
      return { status: 'notFound', message: errorMessage(error) };
    }

    case 'noPreview': {
      return { status: 'none' };
    }

    default: {
      const unknownOutcome: never = outcome;

      throw new Error(`Unknown preview outcome: ${String(unknownOutcome)}`);
    }
  }
};

/**
 * Импорт пака из Telegram на уровне провайдера. Провайдер живёт всё время страницы, а
 * форма импорта размонтируется при закрытии экрана «Добавить стикеры»: ход импорта, введённая
 * ссылка и ошибка поля переживают уход и возврат, и второй импорт поверх идущего не
 * запускается.
 *
 * Статус ««название»: N/M» виден на любом экране, вкладка пака появляется после первого
 * готового стикера. По завершении лента прокручивается к паку, только если экран «Добавить
 * стикеры» всё ещё открыт. Ошибка — у поля ссылки, если поле на виду, иначе в статусе.
 *
 * Превью пака запрашивается по смене имени в поле после паузы ввода, а состав пака кэшируется до
 * перезагрузки страницы: импорт берёт уже полученный или идущий запрос, и `getStickerSet` уходит
 * один раз на имя. Ответ по имени, которого в поле уже нет, отбрасывается.
 *
 * Отмена откатывает библиотеку и показывает «Импорт отменён» статусом, а не ошибкой: ссылка,
 * карточка и ошибка поля остаются, лента не прокручивается.
 *
 * @param options — окружение, настройки, вид и методы провайдера
 * @returns ссылка, ошибка поля, ход импорта и его запуск
 */
export const usePackImport = (options: PackImportOptions): PackImportState => {
  const {
    env,
    settings,
    screen,
    addSegment,
    packs,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
  } = options;
  const [link, setLink] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportCount | null>(null);
  const [snapshot, setSnapshot] = useState<PackSummary | null>(null);
  const [entry, setEntry] = useState<PreviewEntry | null>(null);

  /**
   * Кэш состава паков живёт столько же, сколько провайдер, — до перезагрузки страницы.
   */
  const [packPreview] = useState(createPackPreview);
  const controllerRef = useRef<AbortController | null>(null);
  const { telegramToken } = settings;
  const name = parseSetName(link);
  const hasToken = Boolean(telegramToken || BUILTIN_TELEGRAM_TOKEN);

  /**
   * Последний ответ превью читается эффектом, но не перезапускает его: запрос зависит только от
   * имени в поле и токена.
   */
  const entryRef = useRef(entry);

  entryRef.current = entry;

  /**
   * Экран и сегмент на момент завершения, а не запуска: импорт идёт долго, и пользователь
   * успевает уйти с экрана «Добавить» или на другой сегмент.
   */
  const screenRef = useRef(screen);
  const segmentRef = useRef(addSegment);

  screenRef.current = screen;
  segmentRef.current = addSegment;

  const changeLink = useCallback((nextLink: string) => {
    setLink(nextLink);
    setFieldError(null);
  }, []);

  const resolveSet = useCallback(
    (setName: string) => {
      return resolveTelegramSet(env, telegramToken, setName);
    },
    [env, telegramToken]
  );

  useEffect(() => {
    /**
     * Новый номер — на каждую смену имени, даже без запроса: ответ по прежнему имени, ещё
     * идущий, уже не должен менять карточку.
     */
    const request = packPreview.begin();

    if (!name || !shouldRequestPreview(name, entryRef.current, hasToken)) return;

    const timer = setTimeout(async () => {
      let result: PreviewResult;

      try {
        const {
          name: setName,
          title,
          stickers,
        } = await packPreview.load(name, resolveSet);

        result = {
          status: 'ready',
          title,
          total: stickers.length,
          packId: `${TG_ID_PREFIX}${setName}`,
        };
      } catch (error) {
        result = failedPreview(error);
      }

      if (packPreview.isCurrent(request)) setEntry({ name, result });
    }, PREVIEW_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [name, hasToken, packPreview, resolveSet]);

  const preview = previewView(name, entry, hasToken, packs);
  const missingMessage = preview?.status === 'notFound' ? preview.message : null;

  const importPack = useCallback(async () => {
    if (isImporting || missingMessage) return;

    /**
     * Пока открыт сегмент «Telegram», ход импорта показывает счётчик под полосой, и строка
     * статуса его не дублирует; ушедший с экрана видит ход только в строке статуса.
     */
    const trackProgress = ({ done, total, title }: ImportProgress) => {
      setProgress({ done, total });
      setSnapshot((current) => {
        return current || { title, total };
      });

      if (importErrorTarget(screenRef.current, segmentRef.current) === 'field') {
        clearStatus();
      } else {
        showStatus(t('status.importProgress', { title, done, total }));
      }

      /**
       * Первый готовый стикер — сразу показываем вкладку пака, не дожидаясь импорта
       * целиком.
       */
      if (done === 1) void refreshPacks();
    };

    const showImportError = (message: string, target: ImportErrorTarget) => {
      switch (target) {
        case 'field': {
          /**
           * Строка статуса ошибку не дублирует, а ход импорта ««название»: N/M» в ней
           * устарел.
           */
          setFieldError(message);
          clearStatus();

          return;
        }

        case 'status': {
          showError(message);

          return;
        }

        default: {
          const unknownTarget: never = target;

          throw new Error(`Unknown import error target: ${String(unknownTarget)}`);
        }
      }
    };

    const controller = new AbortController();

    controllerRef.current = controller;

    await runPackImport({
      link,
      signal: controller.signal,
      importSet: async (setLink, signal) => {
        /**
         * Имя здесь есть: ссылку без имени `runPackImport` отклоняет до вызова. Набор — из кэша
         * превью: запрос, начатый карточкой, второй раз не уходит.
         */
        const set = await packPreview.load(parseSetName(setLink) || setLink, resolveSet);

        setSnapshot({ title: set.title, total: set.stickers.length });

        return importTelegramSet(env, telegramToken, set, trackProgress, signal);
      },
      refreshPacks,
      errorTarget: () => {
        return importErrorTarget(screenRef.current, segmentRef.current);
      },
      onStart: () => {
        setIsImporting(true);
        setProgress({ done: 0, total: 0 });
        setFieldError(null);
      },
      onSuccess: (pack) => {
        setLink('');
        setFieldError(null);
        finishImport({ screen: screenRef.current, pack, scrollToSection, showStatus });
      },
      onError: showImportError,
      onCancel: () => {
        showStatus(t('status.importCanceled'));
      },
      onFinish: () => {
        controllerRef.current = null;
        setIsImporting(false);
        setProgress(null);
        setSnapshot(null);
      },
    });
  }, [
    isImporting,
    missingMessage,
    link,
    env,
    telegramToken,
    packPreview,
    resolveSet,
    refreshPacks,
    showStatus,
    showError,
    clearStatus,
    scrollToSection,
  ]);

  const cancelImport = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return {
    link,
    fieldError: fieldError || missingMessage,
    isPackMissing: Boolean(missingMessage),
    card: packCard({ isImporting, snapshot, progress, preview }),
    changeLink,
    isImporting,
    importPack,
    cancelImport,
  };
};
