import { startAgent } from './agent';
import { watchFeedRows } from './markRows';

/**
 * Точка входа агента в мире страницы: у расширения — content script с `"world": "MAIN"`, у
 * userscript — строка `page-agent:code`, вставленная элементом `<script>`.
 *
 * Пометка строк ленты запускается вместе с агентом и так же один раз на страницу: второй наблюдатель только
 * повторял бы проход по тем же строкам.
 */
if (startAgent(document, window)) watchFeedRows(document, MutationObserver);
