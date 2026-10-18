import { afterEach, describe, expect, it } from 'vitest';

import type { FavoriteRec, RecentRec, RemoteGif } from '../src/core/db.types';
import { setLocale } from '../src/core/i18n/translate';
import {
  gifSections,
  recentGifs,
} from '../src/core/ui/Picker/GifView/gifSections/gifSections';

/**
 * GIF из выдачи с номером.
 *
 * @param id — номер GIF у провайдера
 * @returns GIF
 */
const gif = (id: string): RemoteGif => {
  return {
    id,
    provider: 'giphy',
    url: `https://media.giphy.com/${id}.gif`,
    previewUrl: `https://media.giphy.com/${id}-preview.gif`,
    width: 200,
    height: 100,
  };
};

const RECENT: [RemoteGif, RemoteGif] = [gif('r1'), gif('r2')];
const FAVORITE: [RemoteGif, RemoteGif] = [gif('f1'), gif('f2')];

/**
 * Запись избранного GIF.
 *
 * @param favorite — GIF записи
 * @param ts — время добавления
 * @returns запись избранного
 */
const favoriteRec = (favorite: RemoteGif, ts: number): FavoriteRec => {
  return {
    key: `r:${favorite.provider}:${favorite.id}`,
    ts,
    item: { kind: 'remote', gif: favorite },
  };
};

const FAVORITES = [favoriteRec(FAVORITE[0], 2), favoriteRec(FAVORITE[1], 1)];
const TRENDS = [gif('t1'), gif('t2'), gif('t3')];

afterEach(() => {
  setLocale('ru');
});

describe('gifSections', () => {
  it('при пустом запросе ставит недавние с заголовком над трендами', () => {
    const sections = gifSections({
      favorites: [],
      recent: RECENT,
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      { id: 'recent', title: 'Недавние', items: RECENT, skeletons: 0, kind: 'recent' },
      { id: 'feed', title: 'Тренды', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('без недавних показывает тренды без заголовка', () => {
    const sections = gifSections({
      favorites: [],
      recent: [],
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      { id: 'feed', title: '', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('при непустом запросе раздела недавних нет', () => {
    const sections = gifSections({
      favorites: [],
      recent: RECENT,
      gifs: TRENDS,
      term: 'кот',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      { id: 'feed', title: '', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('без ключей оставляет только недавние', () => {
    const sections = gifSections({
      favorites: [],
      recent: RECENT,
      gifs: [],
      term: '',
      hasFeed: false,
      loading: null,
    });

    expect(sections).toEqual([
      { id: 'recent', title: 'Недавние', items: RECENT, skeletons: 0, kind: 'recent' },
    ]);
  });

  it('при первой загрузке выдачи ставит восемь заглушек — поровну в каждую колонку', () => {
    const sections = gifSections({
      favorites: [],
      recent: RECENT,
      gifs: [],
      term: '',
      hasFeed: true,
      loading: 'first',
    });

    expect(sections).toEqual([
      { id: 'recent', title: 'Недавние', items: RECENT, skeletons: 0, kind: 'recent' },
      { id: 'feed', title: 'Тренды', items: [], skeletons: 4, kind: 'feed' },
    ]);
  });

  it('при подгрузке страницы ставит по заглушке в конец каждой колонки', () => {
    const sections = gifSections({
      favorites: [],
      recent: [],
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: 'more',
    });

    expect(sections).toEqual([
      { id: 'feed', title: '', items: TRENDS, skeletons: 1, kind: 'feed' },
    ]);
  });

  it('в английском интерфейсе заголовки недавних и трендов английские', () => {
    setLocale('en');

    const sections = gifSections({
      favorites: [],
      recent: RECENT,
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      { id: 'recent', title: 'Recent', items: RECENT, skeletons: 0, kind: 'recent' },
      { id: 'feed', title: 'Trending', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('ставит избранное над недавними, а недавние — над трендами с заголовком', () => {
    const sections = gifSections({
      favorites: FAVORITES,
      recent: RECENT,
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      {
        id: 'favorite',
        title: 'Избранное',
        items: FAVORITE,
        skeletons: 0,
        kind: 'favorite',
      },
      { id: 'recent', title: 'Недавние', items: RECENT, skeletons: 0, kind: 'recent' },
      { id: 'feed', title: 'Тренды', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('при непустом запросе раздела избранного нет', () => {
    const sections = gifSections({
      favorites: FAVORITES,
      recent: RECENT,
      gifs: TRENDS,
      term: 'кот',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      { id: 'feed', title: '', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('не показывает в недавних GIF из избранного', () => {
    const sections = gifSections({
      favorites: FAVORITES,
      recent: [RECENT[0], FAVORITE[1], RECENT[1]],
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(sections[1]).toEqual({
      id: 'recent',
      title: 'Недавние',
      items: RECENT,
      skeletons: 0,
      kind: 'recent',
    });
  });

  it('без недавних вне избранного раздела недавних нет', () => {
    const sections = gifSections({
      favorites: FAVORITES,
      recent: [FAVORITE[0]],
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(
      sections.map(({ id }) => {
        return id;
      })
    ).toEqual(['favorite', 'feed']);
  });

  it('ставит заголовок трендов и под одним избранным', () => {
    const sections = gifSections({
      favorites: [favoriteRec(FAVORITE[0], 1)],
      recent: [],
      gifs: TRENDS,
      term: '',
      hasFeed: true,
      loading: null,
    });

    expect(sections).toEqual([
      {
        id: 'favorite',
        title: 'Избранное',
        items: [FAVORITE[0]],
        skeletons: 0,
        kind: 'favorite',
      },
      { id: 'feed', title: 'Тренды', items: TRENDS, skeletons: 0, kind: 'feed' },
    ]);
  });

  it('без ключей оставляет избранное и недавние', () => {
    const sections = gifSections({
      favorites: FAVORITES,
      recent: RECENT,
      gifs: [],
      term: '',
      hasFeed: false,
      loading: null,
    });

    expect(sections).toEqual([
      {
        id: 'favorite',
        title: 'Избранное',
        items: FAVORITE,
        skeletons: 0,
        kind: 'favorite',
      },
      { id: 'recent', title: 'Недавние', items: RECENT, skeletons: 0, kind: 'recent' },
    ]);
  });

  it('пропускает в избранном записи стикеров', () => {
    const sections = gifSections({
      favorites: [
        favoriteRec(FAVORITE[0], 3),
        {
          key: 'l:s1',
          ts: 2,
          item: { kind: 'local', stickerId: 's1' },
          sticker: {
            id: 's1',
            packId: 'custom',
            blob: new Blob(),
            width: 1,
            height: 1,
            createdAt: 1,
          },
        },
      ],
      recent: [],
      gifs: [],
      term: '',
      hasFeed: false,
      loading: null,
    });

    expect(sections).toEqual([
      {
        id: 'favorite',
        title: 'Избранное',
        items: [FAVORITE[0]],
        skeletons: 0,
        kind: 'favorite',
      },
    ]);
  });

  it('без ключей и без недавних разделов нет', () => {
    expect(
      gifSections({
        favorites: [],
        recent: [],
        gifs: [],
        term: '',
        hasFeed: false,
        loading: null,
      })
    ).toEqual([]);
  });
});

describe('recentGifs', () => {
  it('берёт GIF из записей недавних в их порядке и пропускает стикеры', () => {
    const records: RecentRec[] = [
      { key: 'r:giphy:r2', ts: 3, item: { kind: 'remote', gif: RECENT[1] } },
      { key: 'l:s1', ts: 2, item: { kind: 'local', stickerId: 's1' } },
      { key: 'r:giphy:r1', ts: 1, item: { kind: 'remote', gif: RECENT[0] } },
    ];

    expect(recentGifs(records)).toEqual([RECENT[1], RECENT[0]]);
  });
});
