import type { FunctionComponent as FC } from 'preact';

import { PackCover } from '../../PackCover/PackCover';
import { FAVORITE_SECTION_ID } from '../../usePickerView/sectionIds';
import { ClockIcon } from '../ClockIcon/ClockIcon';
import { StarIcon } from '../StarIcon/StarIcon';

import type { TabIconProps } from './TabIcon.types';

/**
 * Значок вкладки: обложка у раздела пака, у раздела без пака — по id раздела: звезда у
 * «Избранного», часы у «Недавних».
 */
export const TabIcon: FC<TabIconProps> = (props) => {
  const { section, bitmaps } = props;
  const { id, pack, items } = section;

  if (pack) return <PackCover pack={pack} items={items} bitmaps={bitmaps} />;

  return id === FAVORITE_SECTION_ID ? <StarIcon /> : <ClockIcon />;
};
