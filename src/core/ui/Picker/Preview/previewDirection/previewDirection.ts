import type { PreviewDirection } from './previewDirection.types';

/**
 * Направление по клавише. `event.key`, а не `event.code`: стрелки не зависят от раскладки, а
 * стрелки цифрового блока при выключенном Num Lock дают тот же `key`.
 *
 * @param key — `KeyboardEvent.key`
 * @returns направление шага; `null` — клавиша не стрелка
 */
export const previewDirection = (key: string): PreviewDirection | null => {
  switch (key) {
    case 'ArrowLeft': {
      return 'left';
    }

    case 'ArrowRight': {
      return 'right';
    }

    case 'ArrowUp': {
      return 'up';
    }

    case 'ArrowDown': {
      return 'down';
    }

    default: {
      return null;
    }
  }
};
