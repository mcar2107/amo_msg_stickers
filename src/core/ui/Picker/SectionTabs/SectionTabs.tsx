import type { FunctionComponent as FC, VNode } from 'preact';

import { t } from '../../../i18n/translate';
import { PackCover } from '../PackCover/PackCover';
import type { FeedSection } from '../StickersMode/feedSections/feedSections.types';
import { FAVORITE_SECTION_ID } from '../usePickerView/sectionIds';
import { usePickerView } from '../usePickerView/usePickerView';

import { AddButton } from './AddButton/AddButton';
import { ClockIcon } from './ClockIcon/ClockIcon';
import { SectionTab } from './SectionTab/SectionTab';
import { StarIcon } from './StarIcon/StarIcon';
import { useCenterTab } from './useCenterTab/useCenterTab';
import { FEED_PANEL_ID, sectionTabId } from './sectionTabIds';
import type { SectionTabsProps } from './SectionTabs.types';

/**
 * Перевода строки нет ни в id пака (`custom`, `tg:<имя пака Telegram>`), ни в id недавних и
 * избранного.
 */
const TABS_KEY_SEPARATOR = '\n';

/**
 * Граница снизу — у строки, а не у полосы: под кнопкой «+» она тоже нужна.
 */
const ROW_CLASS = [
  'flex shrink-0 items-center gap-0.5 pr-1.5',
  'border-b border-cadetGray-30/[.28] dark:border-white-0/10',
].join(' ');

/**
 * Полоса прокручивается вбок, когда паков больше, чем влезает, — без видимого скроллбара: он
 * съел бы высоту вкладок. `min-w-0` даёт полосе сжаться меньше содержимого и обрезать вкладки
 * своим краем, `relative` — от полосы считается `offsetLeft` вкладок.
 */
const STRIP_CLASS =
  'relative flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1.5 py-1 [scrollbar-width:none]';

/**
 * Подложка и черта выбранной вкладки — один элемент на полосу: он лежит в прокручиваемом
 * содержимом и едет вместе с вкладками, а при смене вкладки переезжает к новой. Место и ширину
 * ставит `useCenterTab`. Черта — в нижнем отступе полосы, под вкладкой: обложку пака она не
 * перекрывает.
 */
const INDICATOR_CLASS = [
  'pointer-events-none absolute left-0 top-1 h-8.5 rounded-lg',
  'bg-cadetGray-30/[.14] dark:bg-white-0/[.07]',
  'after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:rounded-full',
  'after:bg-blue-50 dark:after:bg-beige-70',
  'motion-safe:transition-[transform,width] motion-safe:duration-lg',
].join(' ');

/**
 * Значок вкладки: обложка у раздела пака, у раздела без пака — по id раздела: звезда у
 * «Избранного», часы у «Недавних».
 *
 * @param section — раздел вкладки
 * @param bitmaps — кэш битмапов обложек
 * @returns содержимое вкладки
 */
const tabIcon = (section: FeedSection, bitmaps: SectionTabsProps['bitmaps']): VNode => {
  const { id, pack, items } = section;

  if (pack) return <PackCover pack={pack} items={items} bitmaps={bitmaps} />;

  return id === FAVORITE_SECTION_ID ? <StarIcon /> : <ClockIcon />;
};

/**
 * Строка над лентой стикеров: полоса вкладок разделов («Избранное», «Недавние», паки в порядке
 * ленты) и справа
 * от неё кнопка «Добавить стикеры». Вкладка раздела прокручивает ленту к его заголовку, выбранная —
 * раздел в верху видимой области. Пока выбранной нет, в порядке Tab стоит первая вкладка.
 */
export const SectionTabs: FC<SectionTabsProps> = (props) => {
  const { sections, activeId, bitmaps } = props;
  const { scrollToSection } = usePickerView();
  const { stripRef, indicatorRef } = useCenterTab(
    activeId,
    sections
      .map(({ id }) => {
        return id;
      })
      .join(TABS_KEY_SEPARATOR)
  );
  const hasActive = sections.some(({ id }) => {
    return id === activeId;
  });

  return (
    <div className={ROW_CLASS}>
      <div
        ref={stripRef}
        role="tablist"
        aria-label={t('picker.sections')}
        className={STRIP_CLASS}
      >
        <div ref={indicatorRef} aria-hidden="true" className={INDICATOR_CLASS} />

        {sections.map((section, index) => {
          const { id, title } = section;
          const isSelected = id === activeId;

          const handleSectionSelect = () => {
            scrollToSection(id, 'smooth');
          };

          return (
            <SectionTab
              key={id}
              id={sectionTabId(id)}
              title={title}
              controlsId={FEED_PANEL_ID}
              isSelected={isSelected}
              isFocusable={hasActive ? isSelected : index === 0}
              onSelect={handleSectionSelect}
            >
              {tabIcon(section, bitmaps)}
            </SectionTab>
          );
        })}
      </div>

      <AddButton />
    </div>
  );
};
