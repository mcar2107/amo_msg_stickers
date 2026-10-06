import type { FunctionComponent as FC } from 'preact';

import { getLocale, t } from '../../../../i18n/translate';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../../userDocs';
import { renderMessage } from '../../../renderMessage/renderMessage';
import { ExternalLink } from '../../ExternalLink/ExternalLink';
import { Field } from '../../Field/Field';

import { HintToggle } from './HintToggle/HintToggle';
import { ImportProgress } from './ImportProgress/ImportProgress';
import { useImportHint } from './useImportHint/useImportHint';
import type { TelegramImportProps } from './TelegramImport.types';

const LINK_FIELD_ID = 'picker-add-telegram-link';
const HOW_TO_ID = 'picker-add-telegram-how-to';

/**
 * Панель сегмента «Telegram»: поле «Ссылка на пак», инструкция и ход импорта. Фрагмент, а не
 * обёртка: строки ложатся в форму сегмента с её отступами. Ссылку, ошибку поля и ход импорта
 * держит провайдер, а раздаёт `AddView` — «Импорт» стоит в футере экрана, вне панели.
 *
 * Свёрнутая инструкция остаётся в документе скрытой: на неё указывает `aria-controls` кнопки
 * «?». Описанием поля она служит, только пока раскрыта.
 */
export const TelegramImport: FC<TelegramImportProps> = (props) => {
  const { link, fieldError, percent, isActive, onLinkChange } = props;
  const { isHintOpen, toggleHint } = useImportHint(isActive);

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
        <div className="relative">
          <Field
            id={LINK_FIELD_ID}
            label={t('add.telegram.linkLabel')}
            value={link}
            placeholder="t.me/addstickers/…"
            error={fieldError}
            describedBy={isHintOpen ? HOW_TO_ID : ''}
            onInput={handleLinkInput}
          />

          <HintToggle
            hintId={HOW_TO_ID}
            isExpanded={isHintOpen}
            onToggle={handleHintToggle}
          />
        </div>

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

      {percent !== null && <ImportProgress percent={percent} />}
    </>
  );
};
