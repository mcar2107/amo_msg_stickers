import type { FunctionComponent as FC } from 'preact';

import { t } from '../../../../../i18n/translate';

import {
  fileCardSummary,
  filePackCount,
  filePackTitle,
} from './fileCardText/fileCardText';
import type { ImportCardProps } from './ImportCard.types';

/**
 * Список паков прокручивается сам и сжимается первым, когда зона упёрлась в свободное место тела экрана: итог или ход
 * под ним остаются на виду.
 * Фокус с клавиатуры прокручиваемому списку даёт браузер — область прокрутки без фокусируемых потомков встаёт в
 * порядок Tab, только пока её есть куда прокручивать, — а кольцо то же, что у кнопок панели. Кольцо рисуется внутри
 * границы, поэтому у списка свой отступ, снятый отрицательным полем: кольцо ложится вокруг строк, а не по буквам.
 * Что строк больше, чем видно, показывает затухание края `scroll-fade` из `picker.css`: полоса прокрутки видна только
 * под курсором и под фокусом с клавиатуры.
 */
const LIST_CLASS = [
  'feed-scroll scroll-fade -m-1 flex min-h-0 list-none flex-col gap-0.5 overflow-y-auto p-1',
  'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-50',
  'dark:focus-visible:outline-beige-70',
].join(' ');

const SECONDARY_TEXT_CLASS =
  'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';

const PRIMARY_TEXT_CLASS = 'text-cadetGray-10 dark:text-gray-90';

const TRACK_CLASS =
  'h-1 overflow-hidden rounded-[2px] bg-cadetGray-30/[.12] dark:bg-white-0/[.06]';

const BAR_CLASS = [
  'h-full bg-blue-50 dark:bg-beige-70',
  'motion-safe:transition-[width] motion-safe:duration-lg motion-safe:ease-[ease]',
].join(' ');

/**
 * Карточка «что добавится» в зоне загрузки, под именем файла: паки файла с тем, что импорт с каждым сделает, и итог;
 * во время импорта на месте итога — его ход.
 *
 * Названия паков обрезаются многоточием: длинное название не должно сдвигать счётчик. Паки показаны все: пока есть
 * место, зона растёт под список, а не поместившийся в неё список прокручивается внутри карточки, тело экрана — нет.
 *
 * Счётчик «N/M» проверки скринридер читает значением полосы (`aria-valuetext`), а сам текст от него скрыт — иначе
 * прочитал бы его дважды. Ширина полосы — единственное inline-свойство: она меняется на каждый стикер. Запись хода
 * не сообщает — она идёт одной транзакцией, — поэтому на её время только «Запись…».
 */
export const ImportCard: FC<ImportCardProps> = (props) => {
  const { card, stage, progress } = props;

  const renderFooter = () => {
    if (!card) return null;

    switch (stage) {
      case null: {
        return (
          <p className={`${SECONDARY_TEXT_CLASS} shrink-0 font-semibold`}>
            {fileCardSummary(card)}
          </p>
        );
      }

      case 'checking': {
        const total = progress?.total || card.newStickerCount;
        const done = progress?.done || 0;
        const count = t('add.file.progress', { done, total });
        const percent = total ? (done / total) * 100 : 0;

        return (
          <>
            <div className="flex shrink-0 items-baseline justify-between gap-2">
              <p className={SECONDARY_TEXT_CLASS}>{t('add.file.checking')}</p>

              <p
                aria-hidden="true"
                className={`${SECONDARY_TEXT_CLASS} shrink-0 tabular-nums`}
              >
                {count}
              </p>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              aria-valuetext={count}
              className={`${TRACK_CLASS} shrink-0`}
            >
              <div className={BAR_CLASS} style={{ width: `${percent}%` }} />
            </div>
          </>
        );
      }

      case 'writing': {
        return (
          <p className={`${SECONDARY_TEXT_CLASS} shrink-0`}>{t('add.file.writing')}</p>
        );
      }

      default: {
        const unknownStage: never = stage;

        throw new Error(`Unknown file import stage: ${String(unknownStage)}`);
      }
    }
  };

  return (
    <div
      aria-busy={card ? undefined : 'true'}
      className="flex min-h-0 flex-1 flex-col gap-1"
    >
      {card ? (
        <ul aria-label={t('add.file.packs')} className={LIST_CLASS}>
          {card.packs.map((cardPack) => {
            return (
              <li
                key={cardPack.pack.id}
                className="flex shrink-0 items-baseline justify-between gap-2"
              >
                <span
                  className={`min-w-0 truncate text-xs leading-[1.4] ${PRIMARY_TEXT_CLASS}`}
                >
                  {filePackTitle(cardPack.pack)}
                </span>

                <span className={`${SECONDARY_TEXT_CLASS} shrink-0 tabular-nums`}>
                  {filePackCount(cardPack)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={SECONDARY_TEXT_CLASS}>{t('add.file.reading')}</p>
      )}

      {renderFooter()}
    </div>
  );
};
