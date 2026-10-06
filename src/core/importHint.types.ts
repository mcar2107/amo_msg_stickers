/**
 * Срез `Storage`, которым пользуется модуль признака инструкции: тест подставляет своё
 * хранилище.
 */
export type HintStorage = Pick<Storage, 'getItem' | 'setItem'>;
