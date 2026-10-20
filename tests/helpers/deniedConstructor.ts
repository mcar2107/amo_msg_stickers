/**
 * Так Firefox отвечает изолированному миру userscript-а на `u.constructor` у байтов из
 * `Blob.arrayBuffer()`: массив создан в мире страницы. На этом чтении падают species-методы
 * — `subarray`, `slice`, `map`, `filter`.
 */
const DENIED_MESSAGE = 'Permission denied to access property "constructor"';

/**
 * Ставит на объект собственный геттер `constructor`, который бросает, — как массив байтов из
 * мира страницы в Firefox.
 *
 * @param target — массив байтов или прототип
 * @returns тот же объект
 */
export const denyConstructor = <T extends object>(target: T) => {
  Object.defineProperty(target, 'constructor', {
    configurable: true,
    get: () => {
      throw new Error(DENIED_MESSAGE);
    },
  });

  return target;
};

/**
 * Выполняет вызов с бросающим `Uint8Array.prototype.constructor`: так проверяется код, который
 * сам создаёт байты из `Blob`, и экземпляр подменить нельзя. Дескриптор восстанавливается в
 * `finally`, поэтому сравнивать результат через `expect` нужно уже после вызова: матчеры
 * читают `constructor`.
 *
 * @param run — проверяемый вызов
 * @returns его результат
 */
export const withDeniedConstructor = async <T>(run: () => Promise<T>) => {
  const { prototype } = Uint8Array;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'constructor');

  if (!descriptor) throw new Error('У Uint8Array.prototype нет constructor');

  denyConstructor(prototype);

  try {
    return await run();
  } finally {
    Object.defineProperty(prototype, 'constructor', descriptor);
  }
};
