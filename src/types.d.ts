declare module 'gifenc' {
  export type Palette = number[][];
  export type ColorFormat = 'rgb565' | 'rgb444' | 'rgba4444';
  export type WriteFrameOptions = {
    /**
     * Палитра кадра. Обязательна для первого кадра, дальше — локальная палитра.
     */
    palette?: Palette;

    /**
     * Длительность показа кадра в мс.
     */
    delay?: number;

    /**
     * Включить прозрачность: цвет `transparentIndex` не рисуется.
     */
    transparent?: boolean;

    /**
     * Индекс прозрачного цвета в палитре.
     */
    transparentIndex?: number;

    /**
     * Повторы анимации: 0 — бесконечно, -1 — без повтора.
     */
    repeat?: number;

    /**
     * Метод disposal GIF — что делать с кадром перед следующим; -1 — по умолчанию.
     */
    dispose?: number;
  };
  export type QuantizeOptions = {
    /**
     * Цветовой формат, в котором строится палитра.
     */
    format?: ColorFormat;

    /**
     * 1-битная альфа: true или порог прозрачности (0–255).
     */
    oneBitAlpha?: boolean | number;
  };
  export type Encoder = {
    /**
     * Дописывает кадр: индексы пикселей в палитре кадра.
     */
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: WriteFrameOptions
    ): void;

    /**
     * Закрывает поток GIF; после него `bytes()` отдаёт готовый файл.
     */
    finish(): void;

    /**
     * Байты GIF, записанные на текущий момент.
     */
    bytes(): Uint8Array<ArrayBuffer>;

    /**
     * Вид на записанные байты без копирования; действителен до следующей записи.
     */
    bytesView(): Uint8Array<ArrayBuffer>;
  };
  export function GIFEncoder(): Encoder;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: QuantizeOptions
  ): Palette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: ColorFormat
  ): Uint8Array;
}

/**
 * CSS собирается плагином в `build.mjs` и приходит в бандл строкой: её вставляют
 * `<style>` в shadow root пикера. Экспорт по умолчанию — форма, которую даёт loader
 * `text` esbuild.
 */
declare module '*.css' {
  const css: string;
  export default css;
}

/**
 * Текст файла строкой — импорт с суффиксом `?raw`, который понимает vitest. Нужен тестам,
 * сверяющим исходник сборки: типов Node (`node:fs`) в проекте нет. Экспорт по умолчанию —
 * форма, которую отдаёт vite.
 */
declare module '*?raw' {
  const text: string;
  export default text;
}

/**
 * `import.meta.glob` vite — список файлов по шаблону, который vitest разворачивает при сборке
 * теста в объект «путь → загрузчик». Нужен тестам, сверяющим наборы файлов: типов Node и
 * `vite/client` в проекте нет, описан только используемый срез. Слияние с глобальным
 * `ImportMeta` возможно только через `interface`.
 */
interface ImportMeta {
  /**
   * Шаблон — только литерал: vitest разбирает вызов статически.
   *
   * @param patterns — шаблоны путей относительно файла; `!` в начале исключает совпадения
   * @returns загрузчики модулей по путям найденных файлов
   */
  glob: (patterns: string | readonly string[]) => Record<string, () => Promise<unknown>>;
}

/**
 * Код Worker-а кодирования GIF (`src/core/gifWorkerEntry.ts`) одним IIFE-бандлом:
 * модуль собирает плагин в `build.mjs`, ядро запускает Worker из blob URL с этим
 * кодом. Vitest плагина не знает — модуль, который его импортирует, юнит-тесты не
 * грузят.
 */
declare module 'gif-worker:code' {
  export const GIF_WORKER_CODE: string;
}

/**
 * Код агента в мире страницы (`src/page/index.ts`) строкой — из esbuild-плагина
 * `page-agent` в `build.mjs`: userscript вставляет его элементом `<script>`.
 */
declare module 'page-agent:code' {
  export const PAGE_AGENT_CODE: string;
}

/**
 * Токен встроенного Telegram-бота — `define` сборки (`build.mjs`) из переменной
 * `TELEGRAM_BOT_TOKEN`; пустая строка — сборка без него. Читает константу только
 * `src/core/builtinToken.ts`.
 */
declare const __TELEGRAM_BOT_TOKEN__: string;

/**
 * Расширение глобального `Window` возможно только через `interface`: у `type` нет
 * слияния объявлений.
 */
interface Window {
  /**
   * Флаг запуска ядра: content script и userscript могут оказаться на одной странице,
   * а стартовать нужно один раз.
   */
  __amoStickers?: boolean;

  /**
   * Флаг запуска агента в мире страницы (`src/page/agent.ts`): расширение и userscript
   * могут подключить его оба, а слушать команды должен один.
   */
  __amoStickersPage?: boolean;
}
