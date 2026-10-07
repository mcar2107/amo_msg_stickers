import type { FunctionComponent as FC, TargetedSubmitEvent } from 'preact';

import { BUILTIN_TELEGRAM_TOKEN } from '../../../builtinToken';
import { getLocale, t } from '../../../i18n/translate';
import { USER_DOCS_PAGE, userDocsUrl } from '../../../userDocs';
import { renderMessage } from '../../renderMessage/renderMessage';
import { ExternalLink } from '../ExternalLink/ExternalLink';
import { Field } from '../Field/Field';
import { Screen } from '../Screen/Screen';

import { fieldCheckText } from './fieldCheckText/fieldCheckText';
import { fieldCheckTone } from './fieldCheckTone/fieldCheckTone';
import { telegramTokenText } from './telegramTokenText/telegramTokenText';
import { useSettingsDraft } from './useSettingsDraft/useSettingsDraft';

/**
 * Встроенный токен сборки не меняется до перезагрузки страницы — ключи выбираются раз.
 */
const { label: TELEGRAM_TOKEN_LABEL, hint: TELEGRAM_TOKEN_HINT } = telegramTokenText(
  Boolean(BUILTIN_TELEGRAM_TOKEN)
);

const GIF_GROUP_ID = 'settings-group-gif';
const TELEGRAM_GROUP_ID = 'settings-group-telegram';

/**
 * Пояснение «хватит одного ключа» — ещё и описание обоих полей GIF: в режиме форм скринридер
 * читает только подпись и описание поля, а не текст группы.
 */
const GIF_NOTE_ID = 'settings-gif-note';

/**
 * Отступы: 4 px — внутри поля и заголовка группы с её пояснением, 12 px — между полями
 * группы (с 4 px соседние поля сливались в одно), 16 px — между группами (`gap-4` формы).
 */
const GROUP_CLASS = 'flex flex-col gap-3';

const GROUP_TITLE_CLASS = 'm-0 font-primary text-xsm font-semibold';
const NOTE_CLASS = 'm-0 text-xs leading-[1.4] text-cadetGray-30 dark:text-gray-70';

/**
 * Ключи KLIPY и GIPHY и токен Telegram-бота, двумя группами со своей ссылкой на доку. KLIPY
 * первым: с него дока советует начинать, если ключ нужен один. Кнопки «Сохранить» нет:
 * значения пишутся сами и сразу применяются в ленте GIF и импорте, без перезагрузки страницы.
 */
export const SettingsView: FC = () => {
  const { draft, checks, changeField, commit } = useSettingsDraft();
  const { giphyKey, klipyKey, telegramToken } = draft;
  const {
    giphyKey: giphyCheck,
    klipyKey: klipyCheck,
    telegramToken: telegramCheck,
  } = checks;
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

  /**
   * `change` всплывает от поля, когда из него уходит фокус или в нём нажат Enter: одна
   * подписка на форме фиксирует любое поле.
   */
  const handleFormChange = () => {
    commit();
  };

  const handleFormSubmit = (event: TargetedSubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    commit();
  };

  const gifDocsLink = (
    <ExternalLink href={gifKeysDocsUrl}>
      <span className="whitespace-nowrap">{t('settings.docs')}</span>
    </ExternalLink>
  );

  const telegramDocsLink = (
    <ExternalLink href={telegramDocsUrl}>
      <span className="whitespace-nowrap">{t('settings.docs')}</span>
    </ExternalLink>
  );

  return (
    <Screen title={t('settings.title')}>
      <form
        className="flex flex-col gap-4 px-0.5"
        noValidate
        onChange={handleFormChange}
        onSubmit={handleFormSubmit}
      >
        <p className={NOTE_CLASS}>{t('settings.storedLocally')}</p>

        <section aria-labelledby={GIF_GROUP_ID} className={GROUP_CLASS}>
          <div className="flex flex-col gap-1">
            <h3 id={GIF_GROUP_ID} className={GROUP_TITLE_CLASS}>
              {t('settings.group.gif')}
            </h3>

            <p id={GIF_NOTE_ID} className={NOTE_CLASS}>
              {renderMessage('settings.gif.oneKey', { docs: gifDocsLink })}
            </p>
          </div>

          <Field
            isSecret
            id="settings-klipy-key"
            label="KLIPY API key"
            value={klipyKey}
            placeholder={t('settings.gif.placeholder')}
            result={fieldCheckText(klipyCheck, 'KLIPY')}
            tone={fieldCheckTone(klipyCheck)}
            hint={renderMessage('settings.klipy.where', {
              link: (
                <ExternalLink href="https://partner.klipy.com/api-keys">
                  partner.klipy.com
                </ExternalLink>
              ),
            })}
            describedBy={GIF_NOTE_ID}
            onInput={handleKlipyKeyInput}
          />

          <Field
            isSecret
            id="settings-giphy-key"
            label="GIPHY API key"
            value={giphyKey}
            placeholder={t('settings.gif.placeholder')}
            result={fieldCheckText(giphyCheck, 'GIPHY')}
            tone={fieldCheckTone(giphyCheck)}
            hint={renderMessage('settings.giphy.where', {
              link: (
                <ExternalLink href="https://developers.giphy.com/dashboard/">
                  developers.giphy.com
                </ExternalLink>
              ),
            })}
            describedBy={GIF_NOTE_ID}
            onInput={handleGiphyKeyInput}
          />
        </section>

        <section aria-labelledby={TELEGRAM_GROUP_ID} className={GROUP_CLASS}>
          <h3 id={TELEGRAM_GROUP_ID} className={GROUP_TITLE_CLASS}>
            {t('settings.group.telegram')}
          </h3>

          <Field
            isSecret
            id="settings-telegram-token"
            label={t(TELEGRAM_TOKEN_LABEL)}
            value={telegramToken}
            placeholder={t('settings.telegram.placeholder')}
            result={fieldCheckText(telegramCheck, 'Telegram')}
            tone={fieldCheckTone(telegramCheck)}
            hint={renderMessage(TELEGRAM_TOKEN_HINT, {
              link: <ExternalLink href="https://t.me/BotFather">@BotFather</ExternalLink>,
              docs: telegramDocsLink,
            })}
            onInput={handleTelegramTokenInput}
          />
        </section>
      </form>
    </Screen>
  );
};
