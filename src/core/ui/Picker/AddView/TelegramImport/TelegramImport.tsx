import type { FunctionComponent as FC } from 'preact';

import { getLocale, t } from '../../../../i18n/translate';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../../userDocs';
import { renderMessage } from '../../../renderMessage/renderMessage';
import { ExternalLink } from '../../ExternalLink/ExternalLink';
import { Field } from '../../Field/Field';

import { HintToggle } from './HintToggle/HintToggle';
import { PackCard } from './PackCard/PackCard';
import { useImportHint } from './useImportHint/useImportHint';
import type { TelegramImportProps } from './TelegramImport.types';

const LINK_FIELD_ID = 'picker-add-telegram-link';
const HOW_TO_ID = 'picker-add-telegram-how-to';
const CARD_ID = 'picker-add-telegram-card';

/**
 * Панель сегмента «Telegram»: поле «Ссылка на пак», инструкция и карточка пака. Фрагмент, а не
 * обёртка: строки ложатся в форму сегмента с её отступами. Ссылку, ошибку поля и карточку
 * держит провайдер, а раздаёт `AddView` — «Импорт» стоит в футере экрана, вне панели.
 *
 * Свёрнутая инструкция остаётся в документе скрытой: на неё указывает `aria-controls` кнопки
 * «?». Описанием поля она служит, только пока раскрыта; карточка — всегда, пока она есть.
 */
export const TelegramImport: FC<TelegramImportProps> = (props) => {
  const { link, fieldError, card, isActive, onLinkChange } = props;
  const { isHintOpen, toggleHint } = useImportHint(isActive);
  const describedBy = [isHintOpen && HOW_TO_ID, card && CARD_ID]
    .filter(Boolean)
    .join(' ');

  const handleLinkInput = (value: string) => {
    onLinkChange(value);
  };

  const handleHintToggle = () => {
    toggleHint();
  };

  return (
    <>
      <h3 className="mt-1.5 text-xsm font-bold">{t('add.telegram.title')}</h3>

      {/*
       * Инструкция — описание поля ссылки: от него 4 px, как внутри поля (D10).
       */}
      <div className="flex flex-col gap-1">
        <Field
          id={LINK_FIELD_ID}
          label={t('add.telegram.linkLabel')}
          labelAside={
            <HintToggle
              hintId={HOW_TO_ID}
              isExpanded={isHintOpen}
              onToggle={handleHintToggle}
            />
          }
          value={link}
          placeholder="t.me/addstickers/…"
          error={fieldError}
          describedBy={describedBy}
          onInput={handleLinkInput}
        />

        <p
          id={HOW_TO_ID}
          hidden={!isHintOpen}
          className="m-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70"
        >
          {renderMessage('add.telegram.howTo', {
            docs: (
              <ExternalLink href={userDocsUrl(USER_DOCS_PAGE.telegram, getLocale())}>
                {t('add.telegram.docs')}
              </ExternalLink>
            ),
          })}
        </p>
      </div>

      {card && <PackCard id={CARD_ID} card={card} />}
    </>
  );
};
