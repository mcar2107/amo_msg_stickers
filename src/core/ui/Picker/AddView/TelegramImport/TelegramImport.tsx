import type { FunctionComponent as FC } from 'preact';

import { getLocale, t } from '../../../../i18n/translate';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../../userDocs';
import { renderMessage } from '../../../renderMessage/renderMessage';
import { ExternalLink } from '../../ExternalLink/ExternalLink';
import { TextInput } from '../../TextInput/TextInput';

import { ImportProgress } from './ImportProgress/ImportProgress';
import type { TelegramImportProps } from './TelegramImport.types';

/**
 * Панель сегмента «Telegram»: ссылка на пак и ход импорта. Фрагмент, а не обёртка: строки
 * ложатся в форму сегмента с её отступами. Ссылку и ход импорта держит `AddView` — «Импорт»
 * стоит в футере экрана, вне панели. `isActive` панель получает для действий при показе
 * сегмента.
 */
export const TelegramImport: FC<TelegramImportProps> = (props) => {
  const { link, percent, onLinkChange } = props;

  const handleLinkInput = (value: string) => {
    onLinkChange(value);
  };

  return (
    <>
      <h3 className="mt-1.5 text-xsm font-bold">{t('add.telegram.title')}</h3>

      <p className="text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70">
        {renderMessage('add.telegram.hint', {
          docs: (
            <ExternalLink href={userDocsUrl(USER_DOCS_PAGE.telegram, getLocale())}>
              {t('add.telegram.docs')}
            </ExternalLink>
          ),
        })}
      </p>

      <TextInput
        type="text"
        value={link}
        placeholder="t.me/addstickers/…"
        onInput={handleLinkInput}
      />

      {percent !== null && <ImportProgress percent={percent} />}
    </>
  );
};
