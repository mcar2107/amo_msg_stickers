import type { FunctionComponent as FC } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import type { FavoriteRec, RemoteGif } from '@core/db.types';
import { getLocale, t } from '@core/i18n';
import type { GifFeed } from '@core/sources';
import { USER_DOCS_PAGE, userDocsUrl } from '@core/userDocs';
import { EmptyState } from '@ui/EmptyState';
import { ExternalLink } from '@ui/ExternalLink';
import { useKeptScrollMark } from '@ui/keptScrollTop/useKeptScrollMark';
import { MasonryGrid } from '@ui/MasonryGrid';
import { gifKey } from '@ui/MasonryGrid/gifCellId';
import { usePicker } from '@ui/PickerProvider';
import type { FavoriteToggle } from '@ui/PickerProvider/useFavorites';
import { useFavoritesContext } from '@ui/PickerProvider/useFavorites';
import { TextInput } from '@ui/TextInput';
import { useGifFeed } from '@ui/useGifFeed';
import { usePickerView } from '@ui/usePickerView';
import { ViewHeader } from '@ui/ViewHeader';

import { FeedAttribution } from './FeedAttribution';
import { FeedChips } from './FeedChips';
import { gifSections, RECENT_GIF_SECTION_ID } from './gifSections';
import type { GifViewProps } from './GifView.types';
import { useFeedChoice } from './useFeedChoice';
import { useGifRemovalFocus } from './useGifRemovalFocus';
import { useRecentGifs } from './useRecentGifs';
import { useSearchFocus } from './useSearchFocus';

/**
 * Кнопка в виде ссылки: `href="#"` у `<a>` запрещён jsx-a11y, а действие — открытие
 * экрана, а не навигация.
 */
const SETTINGS_LINK_CLASS = [
  'cursor-pointer border-0 bg-transparent p-0 text-blue-50 underline dark:text-beige-70',
  'enabled:hover:no-underline',
].join(' ');

/**
 * Избранное до первого чтения. Один объект на все рендеры: новый пустой список на каждый рендер
 * пересчитывал бы разделы, и ожидающий фокус после правки сработал бы на первой же перерисовке.
 */
const NO_FAVORITES: FavoriteRec[] = [];

/**
 * Поиск GIF и трендовая выдача выбранного источника, при пустом запросе над ней — избранные и
 * недавние GIF. Без ключей — избранное, недавние и подсказка с переходом в настройки.
 */
export const GifView: FC<GifViewProps> = (props) => {
  const { isOpen } = props;
  const { settings } = usePicker();
  const { favorites, toggleFavorite } = useFavoritesContext();
  const { openScreen } = usePickerView();
  const { feeds, feed, selectFeed } = useFeedChoice(settings);
  const [query, setQuery] = useState('');
  const { gifs, term, loading, isNothingFound, failure, resetId, checkScroll } =
    useGifFeed(feed, query, isOpen);
  const { recent, remove, clear } = useRecentGifs(isOpen);
  const searchRef = useSearchFocus(isOpen);
  const keptScroll = useKeptScrollMark(isOpen, favorites);
  const hasFeed = Boolean(feed);

  const sections = useMemo(() => {
    return gifSections({
      favorites: favorites || NO_FAVORITES,
      recent,
      gifs,
      term,
      hasFeed,
      loading,
    });
  }, [favorites, recent, gifs, term, hasFeed, loading]);

  /**
   * Данные, которые меняют правки из меню: цели фокуса ждут ленту из новых избранного или
   * недавних, а не подгрузку выдачи.
   */
  const revision = useMemo(() => {
    return [favorites, recent];
  }, [favorites, recent]);

  const { settingsRef, expectCellChange, expectRecentClear, cancelExpected } =
    useGifRemovalFocus(sections, isOpen, searchRef, revision);

  const handleSettingsClick = () => {
    openScreen('settings');
  };

  const handleSearchInput = (value: string) => {
    setQuery(value);
  };

  const handleFeedSelect = (nextFeed: GifFeed) => {
    selectFeed(nextFeed);
  };

  const handleGridScroll = (element: HTMLElement) => {
    checkScroll(element);
  };

  const handleRecentRemove = (gif: RemoteGif) => {
    expectCellChange(RECENT_GIF_SECTION_ID, gifKey(gif));
    void remove(gif);
  };

  /**
   * Цели и метка места ждут ленту из нового избранного: подгрузка страницы выдачи до ответа базы
   * их не тратит. Неудачная правка ленту не меняет, и цели и метка снимаются: иначе фокус ушёл бы
   * по ним на следующей правке, а лента сдвинулась бы по устаревшей прокрутке.
   */
  const handleFavoriteToggle = async (toggle: FavoriteToggle) => {
    const { sectionId, cellKey, item } = toggle;

    expectCellChange(sectionId, cellKey);
    keptScroll.keep();

    const isApplied = await toggleFavorite(item);

    if (isApplied) return;

    cancelExpected();
    keptScroll.drop();
  };

  const handleRecentClear = () => {
    expectRecentClear();
    void clear();
  };

  if (!feed) {
    return (
      <>
        <ViewHeader />

        <MasonryGrid
          sections={sections}
          resetKey={resetId}
          keptScroll={keptScroll}
          onScroll={handleGridScroll}
          onRecentRemove={handleRecentRemove}
          onFavoriteToggle={handleFavoriteToggle}
          onRecentClear={handleRecentClear}
        >
          <EmptyState>
            {t('gifs.noKeys')}
            <br />
            <button
              ref={settingsRef}
              type="button"
              className={SETTINGS_LINK_CLASS}
              onClick={handleSettingsClick}
            >
              {t('gifs.openSettings')}
            </button>

            <br />

            <ExternalLink href={userDocsUrl(USER_DOCS_PAGE.gifKeys, getLocale())}>
              {t('gifs.docs')}
            </ExternalLink>
          </EmptyState>
        </MasonryGrid>
      </>
    );
  }

  return (
    <>
      <ViewHeader>
        <TextInput
          type="search"
          value={query}
          placeholder={t('gifs.search')}
          inputRef={searchRef}
          onInput={handleSearchInput}
        />

        <FeedChips feeds={feeds} feed={feed} onSelect={handleFeedSelect} />
      </ViewHeader>

      <MasonryGrid
        sections={sections}
        resetKey={resetId}
        keptScroll={keptScroll}
        onScroll={handleGridScroll}
        onRecentRemove={handleRecentRemove}
        onFavoriteToggle={handleFavoriteToggle}
        onRecentClear={handleRecentClear}
      >
        {isNothingFound && <EmptyState>{t('gifs.nothingFound')}</EmptyState>}

        {failure && (
          <EmptyState role={failure.shouldAnnounce ? 'alert' : undefined}>
            {t('gifs.loadFailed', { message: failure.message })}
          </EmptyState>
        )}
      </MasonryGrid>

      <FeedAttribution feed={feed} />
    </>
  );
};
