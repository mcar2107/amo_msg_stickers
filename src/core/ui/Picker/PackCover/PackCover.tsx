import type { FunctionComponent as FC } from 'preact';

import { CUSTOM_PACK_ID } from '@core/db';
import { packTitle } from '@core/packTitle';

import { CoverCanvas } from './CoverCanvas';
import { coverLetters } from './coverLetters';
import type { PackCoverProps } from './PackCover.types';
import { SmileIcon } from './SmileIcon';

/**
 * Обложка вкладки пака — статичный первый кадр стикера-обложки пака, а если её нет в паке —
 * первого стикера раздела. У пака без стикеров — смайл для «Моих стикеров» и первые буквы
 * названия для остальных.
 */
export const PackCover: FC<PackCoverProps> = (props) => {
  const { pack, items, bitmaps } = props;
  const { id, coverId } = pack;
  const cover =
    items.find(({ sticker }) => {
      return sticker.id === coverId;
    }) || items[0];

  if (cover) return <CoverCanvas sticker={cover.sticker} bitmaps={bitmaps} />;

  if (id === CUSTOM_PACK_ID) return <SmileIcon />;

  return <>{coverLetters(packTitle(pack))}</>;
};
