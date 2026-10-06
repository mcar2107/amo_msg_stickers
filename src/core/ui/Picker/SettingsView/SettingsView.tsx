import type { FunctionComponent as FC } from 'preact';

import { BUILTIN_TELEGRAM_TOKEN } from '../../../builtinToken';
import { getLocale, t } from '../../../i18n/translate';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../userDocs';
import { renderMessage } from '../../renderMessage/renderMessage';
import { Button } from '../Button/Button';
import { ExternalLink } from '../ExternalLink/ExternalLink';
import { Field } from '../Field/Field';
import { Screen } from '../Screen/Screen';

import { telegramTokenText } from './telegramTokenText/telegramTokenText';
import { useSettingsDraft } from './useSettingsDraft/useSettingsDraft';

/**
 * Встроенный токен сборки не меняется до перезагрузки страницы — ключи выбираются раз.
 */
const { label: TELEGRAM_TOKEN_LABEL, hint: TELEGRAM_TOKEN_HINT } = telegramTokenText(
  Boolean(BUILTIN_TELEGRAM_TOKEN)
);

/**
 * Ключи KLIPY и GIPHY и токен Telegram-бота. KLIPY первым: с него дока советует начинать, если
 * ключ нужен один. Сохранённые значения сразу применяются в ленте GIF и импорте, без
 * перезагрузки страницы.
 */
export const SettingsView: FC = () => {
  const { draft, changeField, save } = useSettingsDraft();
  const { giphyKey, klipyKey, telegramToken } = draft;
  const locale = getLocale();
  const gifKeysDocsUrl = userDocsUrl(USER_DOCS_PAGE.gifKeys, locale);
  const telegramDocsUrl = userDocsUrl(USER_DOCS_PAGE.telegram, locale);

  const handleGiphyKeyInput = (value: string) => {
    changeField('giphyKey', value);
  };

  const handleKlipyKeyInput = (value: string) => {
    changeField('klipyKey', value);
  };

  const handleTelegramTokenInput = (value: string) => {
    changeField('telegramToken', value);
  };

  const handleSaveClick = () => {
    void save();
  };

  return (
    <Screen
      title={t('settings.title')}
      footer={
        <Button variant="primary" onClick={handleSaveClick}>
          {t('settings.save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-2 px-0.5">
        <Field
          isSecret
          id="settings-klipy-key"
          label="KLIPY API key"
          value={klipyKey}
          hint={renderMessage('settings.klipy.hint', {
            link: (
              <ExternalLink href="https://partner.klipy.com/api-keys">
                partner.klipy.com
              </ExternalLink>
            ),
            docs: <ExternalLink href={gifKeysDocsUrl}>{t('settings.docs')}</ExternalLink>,
          })}
          onInput={handleKlipyKeyInput}
        />

        <Field
          isSecret
          id="settings-giphy-key"
          label="GIPHY API key"
          value={giphyKey}
          hint={renderMessage('settings.giphy.hint', {
            link: (
              <ExternalLink href="https://developers.giphy.com/dashboard/">
                developers.giphy.com
              </ExternalLink>
            ),
            docs: <ExternalLink href={gifKeysDocsUrl}>{t('settings.docs')}</ExternalLink>,
          })}
          onInput={handleGiphyKeyInput}
        />

        <Field
          isSecret
          id="settings-telegram-token"
          label={t(TELEGRAM_TOKEN_LABEL)}
          value={telegramToken}
          hint={renderMessage(TELEGRAM_TOKEN_HINT, {
            link: <ExternalLink href="https://t.me/BotFather">@BotFather</ExternalLink>,
            docs: (
              <ExternalLink href={telegramDocsUrl}>{t('settings.docs')}</ExternalLink>
            ),
          })}
          onInput={handleTelegramTokenInput}
        />
      </div>
    </Screen>
  );
};
