import type { FunctionComponent as FC } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import type { FavoriteRec, RemoteGif } from '../../../db.types';
import { getLocale, t } from '../../../i18n/translate';
import type { GifFeed } from '../../../sources/gifs.types';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../userDocs';
import { EmptyState } from '../EmptyState/EmptyState';
import { ExternalLink } from '../ExternalLink/ExternalLink';
import { gifKey } from '../MasonryGrid/gifCellId';
import { MasonryGrid } from '../MasonryGrid/MasonryGrid';
import type { FavoriteToggle } from '../PickerProvider/useFavorites/useFavorites.types';
import { useFavoritesContext } from '../PickerProvider/useFavorites/useFavoritesContext';
import { usePicker } from '../PickerProvider/usePicker';
import { TextInput } from '../TextInput/TextInput';
import { useGifFeed } from '../useGifFeed/useGifFeed';
import { usePickerView } from '../usePickerView/usePickerView';
import { ViewHeader } from '../ViewHeader/ViewHeader';

import { FeedAttribution } from './FeedAttribution/FeedAttribution';
import { FeedChips } from './FeedChips/FeedChips';
import { gifSections, RECENT_GIF_SECTION_ID } from './gifSections/gifSections';
import { useFeedChoice } from './useFeedChoice/useFeedChoice';
import { useGifRemovalFocus } from './useGifRemovalFocus/useGifRemovalFocus';
import { useRecentGifs } from './useRecentGifs/useRecentGifs';
import { useSearchFocus } from './useSearchFocus/useSearchFocus';
import type { GifViewProps } from './GifView.types';

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

  const { settingsRef, expectCellChange, expectRecentClear, cancelExpected } =
    useGifRemovalFocus(sections, isOpen, searchRef);

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
   * Неудачная правка ленту не меняет, и цели снимаются: иначе фокус ушёл бы по ним на следующей,
   * чужой перерисовке ленты — подгрузке страницы выдачи.
   */
  const handleFavoriteToggle = async (toggle: FavoriteToggle) => {
    const { sectionId, cellKey, item } = toggle;

    expectCellChange(sectionId, cellKey);

    const isApplied = await toggleFavorite(item);

    if (!isApplied) cancelExpected();
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
