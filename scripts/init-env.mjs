/**
 * `postinstall`: создаёт `.env` из шаблона `.env.example`, если `.env` ещё нет. Существующий
 * `.env` не трогается — в нём ключи разработчика.
 *
 * Сбой не роняет установку зависимостей: `.env` нужен только стенду, а `pnpm i` идёт и в CI.
 */
import { constants, copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_PATH = join(ROOT, '.env');
const TEMPLATE_PATH = join(ROOT, '.env.example');

if (!existsSync(ENV_PATH)) {
  try {
    /**
     * `COPYFILE_EXCL` — не перезаписать `.env`, появившийся между проверкой и копированием.
     */
    copyFileSync(TEMPLATE_PATH, ENV_PATH, constants.COPYFILE_EXCL);
    console.info('.env создан из .env.example — впишите ключи для стенда');
  } catch (error) {
    console.warn(`.env не создан: ${error instanceof Error ? error.message : error}`);
  }
}
