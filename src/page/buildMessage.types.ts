import type { PageRejectReason } from '@shared/pageBridge.types';

import type { AmoQuotedMessage } from './refersTo.types';

/**
 * Локальное медиа-фото до загрузки — как у фото, которое страница amo отдаёт в очередь.
 */
export type AmoPhotoMedia = {
  /**
   * Id медиа — непрозрачная уникальная строка; совпадает с `localPhotoSize.localFileId`,
   * иначе amo не найдёт файл при загрузке и повторе.
   */
  id: string;

  /**
   * Медиа ещё не на сервере.
   */
  isLocal: true;

  /**
   * Имя файла — у получателя становится `alt` картинки.
   */
  fileName: string;

  /**
   * Локальный файл фото: id и размер; ширину и высоту amo досчитает сам.
   */
  localPhotoSize: {
    /**
     * Ключ файла в отправляемых файлах amo.
     */
    localFileId: string;

    /**
     * Размер файла в байтах.
     */
    size: number;
  };

  /**
   * Id файла на сервере; null — ещё не загружен.
   */
  uploadedFileId: null;

  /**
   * Медиа готовится: размеры очередь amo досчитает сама.
   */
  localFlag: 1;

  /**
   * Вид медиа.
   */
  mediaType: 'photo';

  /**
   * Сам файл; amo забирает его в отправляемые файлы и убирает из сообщения.
   */
  file: File;
};

/**
 * Член чата в форме amo для `from` / `to`.
 */
export type AmoMember = {
  /**
   * Пусто: у себя и у «всех» id нет.
   */
  memberId: '';

  /**
   * `self` — отправитель, `all` — сообщение без адресата-упоминания.
   */
  memberType: 'self' | 'all';
};

/**
 * Сообщение для запроса `sendNewMessages` — как у страницы amo, без упоминания и подписи.
 * Ключ `[conversationType]: conversationId` у таких сообщений тоже есть — он добавляется при
 * сборке.
 */
export type AmoStickerMessage = {
  /**
   * Id чата — ключ в `state.dialogs`.
   */
  conversationId: string;

  /**
   * Тип пира чата.
   */
  conversationType: string;

  /**
   * Флаг исходящего сообщения.
   */
  flags: [2];

  /**
   * Отправитель в форме запроса.
   */
  from: {
    /**
     * Отправитель — текущий пользователь.
     */
    memberSelf: Record<string, never>;
  };

  /**
   * Адресат в форме запроса.
   */
  to: {
    /**
     * Сообщение всем участникам чата.
     */
    memberAll: Record<string, never>;
  };

  /**
   * Отправитель в форме состояния.
   */
  fromMember: AmoMember;

  /**
   * Адресат в форме состояния.
   */
  toMember: AmoMember;

  /**
   * Текст сообщения — пустой: стикер без подписи.
   */
  message: '';

  /**
   * Сообщение, на которое отвечает стикер; поля нет — стикер без ответа. Кладёт `attachReply`
   * (`refersTo.ts`).
   */
  refersTo?: AmoQuotedMessage;

  /**
   * uuid v1 в формате amo.
   */
  id: string;

  /**
   * Ключ идемпотентности — тот же `id`: по нему amo заменит локальное сообщение серверным.
   */
  idempotencyKey: string;

  /**
   * Время создания, мс — из `id`.
   */
  date: number;

  /**
   * Фото-стикер.
   */
  media: AmoPhotoMedia;

  /**
   * Сообщение отправляется.
   */
  sending: true;

  /**
   * Сообщение пока только локальное.
   */
  isLocal: true;

  /**
   * Обычное сообщение, не служебное.
   */
  type: 'regular';
};

/**
 * Сообщение не собрано: открыт не чат или его вид amo не отправляет.
 */
export type BuildMessageFailure = {
  /**
   * Причина, по которой сообщение не собрано.
   */
  reason: Extract<PageRejectReason, 'no-conversation' | 'unsupported-conversation'>;
};

export type BuildMessageResult =
  | {
      /**
       * Готовое сообщение.
       */
      message: AmoStickerMessage;
    }
  | BuildMessageFailure;

/**
 * Открытый чат, в который уходит сообщение.
 */
export type AmoConversation = {
  /**
   * Id чата — ключ в `state.dialogs`.
   */
  id: string;

  /**
   * Тип пира из `state.dialogs[id].conversationType`: `user`, `chat`, `lead` и т. п.
   */
  type: string;
};
