import type { FunctionComponent as FC } from 'preact';

import { t } from '@core/i18n';
import {
  filePackCount,
  filePackTitle,
} from '@ui/AddView/FileTransfer/ImportCard/fileCardText';

import type { PackListProps } from './PackList.types';
import { useScrollTabStop } from './useScrollTabStop';

/**
 * Кольцо то же, что у кнопок панели. Оно рисуется внутри границы, поэтому у области свой отступ, снятый отрицательным
 * полем: кольцо ложится вокруг строк, а не по буквам. Что строк больше, чем видно, показывает затухание края
 * `scroll-fade` из `picker.css`: полоса прокрутки видна только под курсором и под фокусом с клавиатуры.
 */
const SCROLL_CLASS = [
  'feed-scroll scroll-fade -m-1 flex min-h-0 flex-col overflow-y-auto p-1',
  'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-50',
  'dark:focus-visible:outline-beige-70',
].join(' ');

const LIST_CLASS = 'm-0 flex shrink-0 list-none flex-col gap-0.5 p-0';

const TITLE_CLASS =
  'min-w-0 truncate text-xs leading-[1.4] text-cadetGray-10 dark:text-gray-90';

const COUNT_CLASS =
  'm-0 shrink-0 text-xs leading-[1.4] tabular-nums text-cadetGray-30 dark:text-gray-70';

/**
 * Паки файла с тем, что импорт с каждым сделает. Область списка прокручивается сама и сжимается первой, когда зона
 * упёрлась в свободное место тела экрана: итог или ход под ней остаются на виду. Названия обрезаются многоточием:
 * длинное название не должно сдвигать счётчик.
 *
 * Фокус с клавиатуры у области свой — `role="region"` с именем списка и `tabIndex`, пока есть что прокручивать:
 * прокручиваемую область без фокусируемых потомков браузер сам ставит в порядок Tab только с Chrome 130, а сборка
 * поддерживает и Chrome 120, где до скрытых строк с клавиатуры иначе не добраться. Короткий список в порядок Tab не
 * встаёт: прокручивать в нём нечего, — но область в фокусе `tabIndex` не теряет, пока фокус на ней.
 */
export const PackList: FC<PackListProps> = (props) => {
  const { packs } = props;
  const [scrollRef, isTabStop] = useScrollTabStop();

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label={t('add.file.packs')}
      tabIndex={isTabStop ? 0 : undefined}
      className={SCROLL_CLASS}
    >
      <ul className={LIST_CLASS}>
        {packs.map((cardPack) => {
          return (
            <li
              key={cardPack.pack.id}
              className="flex shrink-0 items-baseline justify-between gap-2"
            >
              <span className={TITLE_CLASS}>{filePackTitle(cardPack.pack)}</span>

              <span className={COUNT_CLASS}>{filePackCount(cardPack)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
