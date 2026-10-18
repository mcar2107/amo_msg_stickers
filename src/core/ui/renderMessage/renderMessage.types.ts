import type { ComponentChild } from 'preact';

import type { MessageKey, MessageParams } from '@core/i18n';

/**
 * Узлы подстановок строки словаря: имена — ровно подстановки строки `key`.
 */
export type MessageNodes<K extends MessageKey> = Readonly<
  Record<keyof MessageParams<K>, ComponentChild>
>;

/**
 * Узлы подстановок произвольного шаблона.
 */
export type TemplateNodes = Readonly<Record<string, ComponentChild>>;
