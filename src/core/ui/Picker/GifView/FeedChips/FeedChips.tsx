import type { FunctionComponent as FC } from 'preact';

import { FeedChip } from './FeedChip';
import type { FeedChipsProps } from './FeedChips.types';

/**
 * Переключатель источников GIF. При одном источнике не рендерится: переключать нечего.
 */
export const FeedChips: FC<FeedChipsProps> = (props) => {
  const { feeds, feed, onSelect } = props;

  if (feeds.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {feeds.map((item) => {
        return (
          <FeedChip
            key={item}
            feed={item}
            isSelected={item === feed}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
};
