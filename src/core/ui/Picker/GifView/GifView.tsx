import type { FunctionComponent as FC } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import type { RemoteGif } from '../../../db.types';
import { getLocale, t } from '../../../i18n/translate';
import type { GifFeed } from '../../../sources/gifs.types';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../userDocs';
import { EmptyState } from '../EmptyState/EmptyState';
import { ExternalLink } from '../ExternalLink/ExternalLink';
import { MasonryGrid } from '../MasonryGrid/MasonryGrid';
import { usePicker } from '../PickerProvider/usePicker';
import { TextInput } from '../TextInput/TextInput';
import { useGifFeed } from '../useGifFeed/useGifFeed';
import { usePickerView } from '../usePickerView/usePickerView';
import { ViewHeader } from '../ViewHeader/ViewHeader';

import { FeedAttribution } from './FeedAttribution/FeedAttribution';
import { FeedChips } from './FeedChips/FeedChips';
import { gifSections } from './gifSections/gifSections';
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
 * Поиск GIF и трендовая выдача выбранного источника, при пустом запросе над ней — недавние GIF.
 * Без ключей — недавние и подсказка с переходом в настройки.
 */
export const GifView: FC<GifViewProps> = (props) => {
  const { isOpen } = props;
  const { settings } = usePicker();
  const { openScreen } = usePickerView();
  const { feeds, feed, selectFeed } = useFeedChoice(settings);
  const [query, setQuery] = useState('');
  const { gifs, term, loading, isNothingFound, failure, resetId, checkScroll } =
    useGifFeed(feed, query, isOpen);
  const { recent, remove, clear } = useRecentGifs(isOpen);
  const searchRef = useSearchFocus(isOpen);
  const { settingsRef, expectGifRemoval, expectRecentClear } = useGifRemovalFocus(
    recent,
    isOpen,
    searchRef
  );
  const hasFeed = Boolean(feed);

  const sections = useMemo(() => {
    return gifSections({ recent, gifs, term, hasFeed, loading });
  }, [recent, gifs, term, hasFeed, loading]);

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
    expectGifRemoval(gif);
    void remove(gif);
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
