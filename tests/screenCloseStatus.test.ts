import { describe, expect, it } from 'vitest';

import { shouldClearStatusOnClose } from '../src/core/ui/Picker/usePickerView/screenCloseStatus';

describe('shouldClearStatusOnClose', () => {
  it('уход с «Настроек» оставляет «Сохранено» записи, начатой этим уходом', () => {
    expect(shouldClearStatusOnClose('settings')).toBe(false);
  });

  it('уход с «Добавить стикеры» снимает статус формы: сборку и размер черновика', () => {
    expect(shouldClearStatusOnClose('add')).toBe(true);
  });

  it('без экрана статус прошлого действия снимается', () => {
    expect(shouldClearStatusOnClose(null)).toBe(true);
  });
});
