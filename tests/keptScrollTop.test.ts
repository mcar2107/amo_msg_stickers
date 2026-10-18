import { describe, expect, it } from 'vitest';

import type { RemoteGif } from '@core/db.types';
import type { CellPosition } from '@ui/keptScrollTop';
import { cellTops, gifCells, keptScrollTop, stickerCells } from '@ui/keptScrollTop';
import { createKeptScroll } from '@ui/keptScrollTop/createKeptScroll';
import { gifCellId } from '@ui/MasonryGrid/gifCellId';
import type { MasonrySection } from '@ui/MasonryGrid/splitColumns';
import { splitColumns } from '@ui/MasonryGrid/splitColumns';
import { cellId } from '@ui/StickerFeed/cellId';
import type { StickerSection } from '@ui/stickerLayout';
import { buildStickerLayout } from '@ui/stickerLayout';

/**
 * Стикер ленты: раскладке нужен только ключ ячейки.
 */
type Sticker = {
  /**
   * Ключ ячейки в разделе.
   */
  key: string;
};

/**
 * Ширина ленты стикеров: сторона ячейки — 60 px.
 */
const FEED_WIDTH = 316;

const COLUMNS = { count: 2, width: 160, gap: 8 };

/**
 * Раздел стикеров с ключами `<префикс><номер>`.
 *
 * @param id — раздел
 * @param keys — ключи стикеров по порядку
 * @returns раздел раскладки
 */
const stickers = (id: string, keys: string[]): StickerSection<Sticker> => {
  return {
    id,
    items: keys.map((key) => {
      return { key };
    }),
    hasCreateTile: false,
  };
};

/**
 * Ключи `<префикс>0` … `<префикс><count − 1>`.
 *
 * @param prefix — префикс ключа
 * @param count — число ключей
 * @returns ключи
 */
const keys = (prefix: string, count: number): string[] => {
  return Array.from({ length: count }, (_, index) => {
    return `${prefix}${index}`;
  });
};

/**
 * Позиции ячеек ленты стикеров по настоящей раскладке.
 *
 * @param sections — разделы ленты
 * @returns позиции ячеек
 */
const stickerFeed = (sections: StickerSection<Sticker>[]): CellPosition[] => {
  return stickerCells(buildStickerLayout(sections, FEED_WIDTH).rows);
};

/**
 * GIF выдачи разной высоты: у соседних колонок разные верхи.
 *
 * @param prefix — префикс id
 * @param count — число GIF
 * @returns GIF
 */
const gifs = (prefix: string, count: number): RemoteGif[] => {
  return Array.from({ length: count }, (_, index) => {
    return {
      id: `${prefix}${index}`,
      provider: 'giphy',
      url: `https://media.giphy.com/${prefix}${index}.gif`,
      previewUrl: `https://media.giphy.com/${prefix}${index}-preview.gif`,
      width: 100,
      height: 60 + (index % 3) * 30,
    };
  });
};

/**
 * Позиции ячеек ленты GIF по настоящей раскладке.
 *
 * @param sections — разделы ленты
 * @returns позиции ячеек
 */
const gifFeed = (sections: MasonrySection<RemoteGif>[]): CellPosition[] => {
  return gifCells(splitColumns(sections, COLUMNS).tiles);
};

/**
 * Место ячейки на экране: верх ячейки относительно верха видимой области.
 *
 * @param cells — позиции ячеек
 * @param id — id ячейки
 * @param scrollTop — прокрутка ленты
 * @returns верх ячейки на экране
 */
const screenTop = (cells: CellPosition[], id: string, scrollTop: number): number => {
  const cell = cells.find((position) => {
    return position.id === id;
  });

  if (!cell) throw new Error(`Нет ячейки ${id}`);

  return cell.top - scrollTop;
};

describe('keptScrollTop', () => {
  it('прокрутка 0 остаётся 0: появившийся раздел виден сверху', () => {
    const prev = stickerFeed([
      stickers('recent', keys('r', 7)),
      stickers('custom', keys('c', 3)),
    ]);
    const next = stickerFeed([
      stickers('favorite', ['r0']),
      stickers('recent', keys('r', 7).slice(1)),
      stickers('custom', keys('c', 3)),
    ]);

    expect(keptScrollTop({ prev, next: cellTops(next), scrollTop: 0 })).toBe(0);
  });

  it('ячейка ниже появившегося раздела остаётся на месте экрана', () => {
    const before = [stickers('recent', keys('r', 14)), stickers('tg:a', keys('a', 30))];
    const after = [stickers('favorite', ['a12']), ...before];
    const prev = stickerFeed(before);
    const next = stickerFeed(after);
    const anchor = cellId('tg:a', 'a10');
    const scrollTop = screenTop(prev, anchor, 0) + 20;
    const kept = keptScrollTop({ prev, next: cellTops(next), scrollTop });

    expect(kept).toBeGreaterThan(scrollTop);
    expect(screenTop(next, anchor, kept)).toBe(screenTop(prev, anchor, scrollTop));
    expect(screenTop(next, cellId('tg:a', 'a12'), kept)).toBe(
      screenTop(prev, cellId('tg:a', 'a12'), scrollTop)
    );
  });

  it('удалённая первая видимая ячейка — якорь следующая', () => {
    const prev = stickerFeed([
      stickers('favorite', keys('f', 6)),
      stickers('recent', keys('r', 5)),
    ]);
    const next = stickerFeed([
      stickers('favorite', keys('f', 5)),
      stickers('recent', keys('r', 5)),
    ]);
    const scrollTop = screenTop(prev, cellId('favorite', 'f5'), 0) + 10;
    const kept = keptScrollTop({ prev, next: cellTops(next), scrollTop });
    const anchor = cellId('recent', 'r0');

    expect(kept).toBeLessThan(scrollTop);
    expect(screenTop(next, anchor, kept)).toBe(screenTop(prev, anchor, scrollTop));
  });

  it('стикеры выше убранного в «Избранном» остаются на месте', () => {
    const prev = stickerFeed([
      stickers('favorite', keys('f', 12)),
      stickers('recent', keys('r', 5)),
    ]);
    const next = stickerFeed([
      stickers(
        'favorite',
        keys('f', 12).filter((key) => {
          return key !== 'f7';
        })
      ),
      stickers('recent', keys('r', 5)),
    ]);
    const scrollTop = screenTop(prev, cellId('favorite', 'f5'), 0) + 10;
    const kept = keptScrollTop({ prev, next: cellTops(next), scrollTop });

    expect(kept).toBe(scrollTop);
    expect(screenTop(next, cellId('favorite', 'f8'), kept)).toBe(
      screenTop(prev, cellId('favorite', 'f7'), scrollTop)
    );
  });

  it('заголовок трендов, появившийся внутри раздела выдачи, не сдвигает видимые GIF', () => {
    const trends = gifs('t', 30);
    const [favorite] = trends.slice(16, 17);

    if (!favorite) throw new Error('Нет GIF');

    const prev = gifFeed([{ id: 'feed', items: trends, hasHeader: false }]);
    const next = gifFeed([
      { id: 'favorite', items: [favorite], hasHeader: true },
      { id: 'feed', items: trends, hasHeader: true },
    ]);
    const scrollTop = screenTop(prev, gifCellId('feed', 'giphy:t14'), 0) + 5;
    const kept = keptScrollTop({ prev, next: cellTops(next), scrollTop });

    expect(kept).toBeGreaterThan(scrollTop);

    for (const id of ['t14', 't15', 't16', 't17', 't18']) {
      const gifId = gifCellId('feed', `giphy:${id}`);

      expect(screenTop(next, gifId, kept)).toBe(screenTop(prev, gifId, scrollTop));
    }
  });

  it('нет общих ячеек — прокрутка прежняя', () => {
    const prev = stickerFeed([stickers('recent', keys('r', 10))]);
    const next = stickerFeed([stickers('custom', keys('c', 10))]);

    expect(keptScrollTop({ prev, next: cellTops(next), scrollTop: 70 })).toBe(70);
  });

  it('ячейка выше видимой области якорем не служит', () => {
    const prev = stickerFeed([
      stickers('recent', keys('r', 10)),
      stickers('custom', keys('c', 10)),
    ]);
    const next = stickerFeed([
      stickers('recent', keys('r', 5)),
      stickers('custom', keys('c', 10)),
    ]);
    const scrollTop = screenTop(prev, cellId('custom', 'c0'), 0);
    const kept = keptScrollTop({ prev, next: cellTops(next), scrollTop });

    expect(screenTop(next, cellId('custom', 'c0'), kept)).toBe(0);
  });
});

describe('createKeptScroll', () => {
  const before = [stickers('recent', keys('r', 14)), stickers('tg:a', keys('a', 30))];
  const prev = stickerFeed(before);
  const next = stickerFeed([stickers('favorite', ['a12']), ...before]);
  const scrollTop = screenTop(prev, cellId('tg:a', 'a10'), 0);
  /**
   * Избранное до правки и после: метка ждёт раскладку из нового избранного.
   */
  const ASKED = 'favorites-before';
  const ANSWERED = 'favorites-after';

  it('раскладка правки получает прокрутку, метка расходуется', () => {
    const kept = createKeptScroll<string>();
    const element = { scrollTop };

    kept.settle(prev, element, ASKED);
    kept.keep(ASKED);

    expect(kept.settle(prev, element, ASKED)).toBeNull();
    expect(kept.settle(next, element, ANSWERED)).toBe(
      keptScrollTop({ prev, next: cellTops(next), scrollTop })
    );
    expect(kept.settle(stickerFeed(before), element, 'favorites-later')).toBeNull();
  });

  it('прокрутка берётся в момент метки, а не при раскладке правки', () => {
    const kept = createKeptScroll<string>();
    const element = { scrollTop };

    kept.settle(prev, element, ASKED);
    kept.keep(ASKED);
    element.scrollTop = 0;

    expect(kept.settle(next, element, ANSWERED)).toBe(
      keptScrollTop({ prev, next: cellTops(next), scrollTop })
    );
  });

  it('чужая перестройка до ответа базы метку не тратит, правка встаёт от неё', () => {
    const kept = createKeptScroll<string>();
    const element = { scrollTop };
    const imported = [stickers('custom', keys('c', 12)), ...before];
    const foreign = stickerFeed(imported);
    const edited = stickerFeed([stickers('favorite', ['a12']), ...imported]);

    kept.settle(prev, element, ASKED);
    kept.keep(ASKED);

    expect(kept.settle(foreign, element, ASKED)).toBeNull();

    const top = kept.settle(edited, element, ANSWERED);

    expect(top).toBe(keptScrollTop({ prev: foreign, next: cellTops(edited), scrollTop }));
    expect(top).not.toBe(keptScrollTop({ prev, next: cellTops(edited), scrollTop }));
  });

  it('прокрутка после чужой перестройки — показанная при ней', () => {
    const kept = createKeptScroll<string>();
    const element = { scrollTop };
    const foreign = stickerFeed([...before, stickers('tg:b', keys('b', 10))]);
    const edited = stickerFeed([stickers('favorite', ['a12']), ...before]);
    const clamped = scrollTop - 30;

    kept.settle(prev, element, ASKED);
    kept.keep(ASKED);
    element.scrollTop = clamped;
    kept.settle(foreign, element, ASKED);
    element.scrollTop = 0;

    expect(kept.settle(edited, element, ANSWERED)).toBe(
      keptScrollTop({ prev: foreign, next: cellTops(edited), scrollTop: clamped })
    );
  });

  it('снятая метка ленту не двигает', () => {
    const kept = createKeptScroll<string>();
    const element = { scrollTop };

    kept.settle(prev, element, ASKED);
    kept.keep(ASKED);
    kept.drop();

    expect(kept.settle(next, element, ANSWERED)).toBeNull();
  });

  it('без показанной раскладки метки нет', () => {
    const kept = createKeptScroll<string>();

    kept.keep(ASKED);

    expect(kept.settle(next, { scrollTop }, ANSWERED)).toBeNull();
  });
});
