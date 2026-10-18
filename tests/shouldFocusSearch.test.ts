import { describe, expect, it } from 'vitest';

import { shouldFocusSearch } from '@ui/GifView/useSearchFocus';

describe('shouldFocusSearch', () => {
  it('при открытии кликом ставит фокус в поиск', () => {
    expect(shouldFocusSearch('click', false)).toBe(true);
  });

  it('при открытии наведением оставляет фокус в поле сообщения', () => {
    expect(shouldFocusSearch('hover', false)).toBe(false);
  });

  it('при переключении в режим «GIF» кликом внутри попапа, открытого наведением, ставит фокус в поиск', () => {
    expect(shouldFocusSearch('hover', true)).toBe(true);
  });
});
