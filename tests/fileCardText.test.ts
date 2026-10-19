import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@core/i18n';
import type {
  FileCard,
  FileCardPack,
  ManifestPack,
  ManifestSticker,
} from '@core/libraryFile';
import {
  fileCardSummary,
  filePackCount,
  filePackTitle,
} from '@ui/AddView/FileTransfer/ImportCard/fileCardText';

const sticker = (id: string): ManifestSticker => {
  return { id, file: `stickers/${id}.gif` };
};

const stickers = (count: number, prefix: string) => {
  return Array.from({ length: count }, (_, index) => {
    return sticker(`${prefix}${index}`);
  });
};

const pack = (id: string, title: string, list: ManifestSticker[]): ManifestPack => {
  return { id, source: id === 'custom' ? 'custom' : 'telegram', title, stickers: list };
};

const cardPack = (
  manifestPack: ManifestPack,
  newCount: number,
  flags: Pick<FileCardPack, 'isInLibrary' | 'isNew'>
): FileCardPack => {
  return {
    pack: manifestPack,
    ...flags,
    newStickers: manifestPack.stickers.slice(0, newCount),
  };
};

describe('filePackCount', () => {
  afterEach(() => {
    setLocale('ru');
  });

  it('новый пак — все его стикеры', () => {
    const cats = pack('tg:Cats', 'Котики', stickers(45, 'c'));

    expect(filePackCount(cardPack(cats, 45, { isInLibrary: false, isNew: true }))).toBe(
      'Новый пак, стикеров: 45'
    );
  });

  it('новый пак, часть стикеров которого занята другими паками, — только новые, как в итоге', () => {
    const cats = pack('tg:Cats', 'Котики', stickers(3, 'c'));

    expect(filePackCount(cardPack(cats, 2, { isInLibrary: false, isNew: true }))).toBe(
      'Новый пак, стикеров: 2'
    );
  });

  it('«Мои стикеры» не новый пак — сколько добавится', () => {
    const custom = pack('custom', 'Мои стикеры', stickers(3, 'm'));

    expect(filePackCount(cardPack(custom, 3, { isInLibrary: false, isNew: false }))).toBe(
      'Добавится стикеров: 3 из\u00A03'
    );
  });

  it('пак уже в библиотеке — сколько добавится', () => {
    const cats = pack('tg:Cats', 'Котики', stickers(45, 'c'));

    expect(filePackCount(cardPack(cats, 5, { isInLibrary: true, isNew: false }))).toBe(
      'Добавится стикеров: 5 из\u00A045'
    );
  });

  it('добавлять нечего — уже в библиотеке', () => {
    const cats = pack('tg:Cats', 'Котики', stickers(45, 'c'));

    expect(filePackCount(cardPack(cats, 0, { isInLibrary: true, isNew: false }))).toBe(
      'Уже в\u00A0библиотеке'
    );
  });

  it('по-английски', () => {
    setLocale('en');
    const cats = pack('tg:Cats', 'Котики', stickers(45, 'c'));

    expect(filePackCount(cardPack(cats, 5, { isInLibrary: true, isNew: false }))).toBe(
      'Stickers to\u00A0add: 5 of\u00A045'
    );
  });
});

describe('filePackTitle', () => {
  afterEach(() => {
    setLocale('ru');
  });

  it('свой пак — на языке интерфейса, а не из файла', () => {
    setLocale('en');

    expect(filePackTitle(pack('custom', 'Мои стикеры', []))).toBe('My stickers');
  });

  it('пак Telegram — название из файла', () => {
    expect(filePackTitle(pack('tg:Cats', 'Котики', []))).toBe('Котики');
  });
});

describe('fileCardSummary', () => {
  /**
   * @param newPackCount — новых паков
   * @param newStickerCount — новых стикеров
   * @param newFavoriteCount — добавится в избранное
   * @param newRecentCount — добавится в недавние
   * @returns карточка
   */
  const card = (
    newPackCount: number,
    newStickerCount: number,
    newFavoriteCount = 0,
    newRecentCount = 0
  ): FileCard => {
    return {
      packs: [],
      stickerCount: 48,
      newStickerCount,
      newPackCount,
      newFavorites: [],
      recentAdds: [],
      newFavoriteCount,
      newRecentCount,
    };
  };

  it('итог: новых паков и стикеров', () => {
    expect(fileCardSummary(card(1, 48))).toEqual(['Новых паков: 1, стикеров: 48']);
  });

  it('всё уже в библиотеке — только при нуле стикеров, избранного и недавних', () => {
    expect(fileCardSummary(card(0, 0))).toEqual([
      'Всё из\u00A0этого файла уже в\u00A0библиотеке',
    ]);
  });

  it('стикеры и избранное с недавними — две строки', () => {
    expect(fileCardSummary(card(1, 3, 2, 5))).toEqual([
      'Новых паков: 1, стикеров: 3',
      'В\u00A0избранное: 2, в\u00A0недавние: 5',
    ]);
  });

  it('только избранное или недавние — без строки о паках', () => {
    expect(fileCardSummary(card(0, 0, 1))).toEqual([
      'В\u00A0избранное: 1, в\u00A0недавние: 0',
    ]);
    expect(fileCardSummary(card(0, 0, 0, 4))).toEqual([
      'В\u00A0избранное: 0, в\u00A0недавние: 4',
    ]);
  });

  it('на английском — английская строка избранного и недавних', () => {
    setLocale('en');

    expect(fileCardSummary(card(0, 0, 1, 2))).toEqual([
      'Adds to\u00A0favorites: 1, to\u00A0recent: 2',
    ]);
  });
});
