import type { FunctionComponent as FC } from 'preact';

import { BUILTIN_TELEGRAM_TOKEN } from '../../../builtinToken';
import { getLocale, t } from '../../../i18n/translate';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../userDocs';
import { renderMessage } from '../../renderMessage/renderMessage';
import { Button } from '../Button/Button';
import { ExternalLink } from '../ExternalLink/ExternalLink';
import type { View } from '../usePickerView/usePickerView.types';
import { ViewBody } from '../ViewBody/ViewBody';
import { ViewHeader } from '../ViewHeader/ViewHeader';
import { ViewTitle } from '../ViewHeader/ViewTitle/ViewTitle';

import { SecretField } from './SecretField/SecretField';
import { telegramTokenText } from './telegramTokenText/telegramTokenText';
import { useSettingsDraft } from './useSettingsDraft/useSettingsDraft';

const SETTINGS_VIEW: View = { kind: 'settings' };

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
    <>
      <ViewHeader>
        <ViewTitle title={t('settings.title')} />
      </ViewHeader>

      <ViewBody view={SETTINGS_VIEW}>
        <div className="flex flex-col gap-2 px-0.5 pb-3 pt-1">
          <SecretField
            id="settings-klipy-key"
            label="KLIPY API key"
            value={klipyKey}
            onInput={handleKlipyKeyInput}
          >
            {renderMessage('settings.klipy.hint', {
              link: (
                <ExternalLink href="https://partner.klipy.com/api-keys">
                  partner.klipy.com
                </ExternalLink>
              ),
              docs: (
                <ExternalLink href={gifKeysDocsUrl}>{t('settings.docs')}</ExternalLink>
              ),
            })}
          </SecretField>

          <SecretField
            id="settings-giphy-key"
            label="GIPHY API key"
            value={giphyKey}
            onInput={handleGiphyKeyInput}
          >
            {renderMessage('settings.giphy.hint', {
              link: (
                <ExternalLink href="https://developers.giphy.com/dashboard/">
                  developers.giphy.com
                </ExternalLink>
              ),
              docs: (
                <ExternalLink href={gifKeysDocsUrl}>{t('settings.docs')}</ExternalLink>
              ),
            })}
          </SecretField>

          <SecretField
            id="settings-telegram-token"
            label={t(TELEGRAM_TOKEN_LABEL)}
            value={telegramToken}
            onInput={handleTelegramTokenInput}
          >
            {renderMessage(TELEGRAM_TOKEN_HINT, {
              link: <ExternalLink href="https://t.me/BotFather">@BotFather</ExternalLink>,
              docs: (
                <ExternalLink href={telegramDocsUrl}>{t('settings.docs')}</ExternalLink>
              ),
            })}
          </SecretField>

          <div className="flex items-center gap-1.5">
            <Button variant="primary" onClick={handleSaveClick}>
              {t('settings.save')}
            </Button>
          </div>
        </div>
      </ViewBody>
    </>
  );
};
