import { describe, expect, it } from 'vitest';

import type { Pack } from '../src/core/db.types';
import {
  packCard,
  previewView,
  shouldRequestPreview,
} from '../src/core/ui/Picker/PickerProvider/packCardView/packCardView';
import type { PreviewEntry } from '../src/core/ui/Picker/PickerProvider/packCardView/packCardView.types';

const READY: PreviewEntry = {
  name: 'cats',
  result: { status: 'ready', title: 'Котики', total: 45, packId: 'tg:cats' },
};

const CATS_PACK: Pack = {
  id: 'tg:cats',
  title: 'Котики',
  source: 'telegram',
  sourceRef: 'cats',
  createdAt: 0,
};

const READY_VIEW = { status: 'ready', title: 'Котики', total: 45, isInLibrary: false };

const NOT_FOUND: PreviewEntry = {
  name: 'nope',
  result: { status: 'notFound', message: 'Bad Request: STICKERSET_INVALID' },
};

describe('shouldRequestPreview', () => {
  it('новое имя и есть токен — запрос', () => {
    expect(shouldRequestPreview('cats', null, true)).toBe(true);
    expect(shouldRequestPreview('dogs', READY, true)).toBe(true);
  });

  it('имя то же, что у показанного ответа, — запроса нет', () => {
    expect(shouldRequestPreview('cats', READY, true)).toBe(false);
  });

  it('ссылка без имени — запроса нет', () => {
    expect(shouldRequestPreview(null, READY, true)).toBe(false);
  });

  it('нет ни своего, ни встроенного токена — запроса нет', () => {
    expect(shouldRequestPreview('cats', null, false)).toBe(false);
  });
});

describe('previewView', () => {
  it('ответ по имени в поле — он и показывается', () => {
    expect(previewView('cats', READY, true, [])).toEqual(READY_VIEW);
    expect(previewView('nope', NOT_FOUND, true, [])).toEqual(NOT_FOUND.result);
  });

  it('пак уже в библиотеке — импорт обновит его', () => {
    expect(previewView('cats', READY, true, [CATS_PACK])).toEqual({
      ...READY_VIEW,
      isInLibrary: true,
    });
  });

  it('то же имя после импорта — признак по библиотеке на момент показа, а не ответа', () => {
    expect(shouldRequestPreview('cats', READY, true)).toBe(false);
    expect(previewView('cats', READY, true, [])).toMatchObject({ isInLibrary: false });
    expect(previewView('cats', READY, true, [CATS_PACK])).toMatchObject({
      isInLibrary: true,
    });
  });

  it('ответ по другому имени — заглушка загрузки, пока не придёт ответ по имени в поле', () => {
    expect(previewView('dogs', READY, true, [])).toEqual({ status: 'loading' });
    expect(previewView('dogs', null, true, [])).toEqual({ status: 'loading' });
  });

  it('сбой без превью — карточки нет', () => {
    expect(
      previewView('cats', { name: 'cats', result: { status: 'none' } }, true, [])
    ).toBeNull();
  });

  it('ссылка без имени или нет токена — превью нет', () => {
    expect(previewView(null, READY, true, [])).toBeNull();
    expect(previewView('dogs', READY, false, [])).toBeNull();
  });
});

describe('packCard', () => {
  const ready = {
    status: 'ready',
    title: 'Котики',
    total: 45,
    isInLibrary: true,
  } as const;

  it('без импорта — превью поля', () => {
    expect(
      packCard({ isImporting: false, snapshot: null, progress: null, preview: ready })
    ).toEqual({ status: 'preview', title: 'Котики', total: 45, isInLibrary: true });
    expect(
      packCard({
        isImporting: false,
        snapshot: null,
        progress: null,
        preview: { status: 'loading' },
      })
    ).toEqual({ status: 'loading' });
  });

  it('без импорта: «пак не найден» и отсутствие превью — карточки нет', () => {
    expect(
      packCard({
        isImporting: false,
        snapshot: null,
        progress: null,
        preview: { status: 'notFound', message: 'нет' },
      })
    ).toBeNull();
    expect(
      packCard({ isImporting: false, snapshot: null, progress: null, preview: null })
    ).toBeNull();
  });

  it('во время импорта — снимок и ход, а не поле', () => {
    expect(
      packCard({
        isImporting: true,
        snapshot: { title: 'Котики', total: 45 },
        progress: { done: 3, total: 45 },
        preview: { status: 'ready', title: 'Собаки', total: 10, isInLibrary: false },
      })
    ).toEqual({ status: 'importing', title: 'Котики', total: 45, done: 3 });
  });

  it('во время импорта до ответа набора — заглушка загрузки', () => {
    expect(
      packCard({
        isImporting: true,
        snapshot: null,
        progress: { done: 0, total: 0 },
        preview: null,
      })
    ).toEqual({ status: 'loading' });
  });
});
