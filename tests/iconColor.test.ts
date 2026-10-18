import { describe, expect, it } from 'vitest';

import { COMPOSER_BUTTON } from '@core/amoDomStable';
import { workerMarkup } from '@core/amoDomWorker';
import { iconColorClasses } from '@core/iconColor';

describe('iconColorClasses', () => {
  it('покой — классы покоя, открытого и редактирования сняты', () => {
    expect(
      iconColorClasses(COMPOSER_BUTTON, { isOpen: false, isEditing: false })
    ).toEqual({
      add: ['fill-cadetGray-30', 'dark:fill-gray-70'],
      remove: ['fill-blue-50', 'dark:fill-beige-70', 'dark:fill-gray-40'],
    });
  });

  it('редактирование — светлый цвет покоя остаётся, тёмный заменяется', () => {
    expect(iconColorClasses(COMPOSER_BUTTON, { isOpen: false, isEditing: true })).toEqual(
      {
        add: ['fill-cadetGray-30', 'dark:fill-gray-40'],
        remove: ['dark:fill-gray-70', 'fill-blue-50', 'dark:fill-beige-70'],
      }
    );
  });

  it.each([false, true])(
    'открытый попап — акцент при редактировании: %s',
    (isEditing) => {
      expect(iconColorClasses(COMPOSER_BUTTON, { isOpen: true, isEditing })).toEqual({
        add: ['fill-blue-50', 'dark:fill-beige-70'],
        remove: ['fill-cadetGray-30', 'dark:fill-gray-70', 'dark:fill-gray-40'],
      });
    }
  );

  it('разметка без классов редактирования — в редактировании цвет покоя', () => {
    expect(
      iconColorClasses(workerMarkup.button, { isOpen: false, isEditing: true })
    ).toEqual({
      add: ['text-fg-muted'],
      remove: ['text-accent'],
    });
  });
});
