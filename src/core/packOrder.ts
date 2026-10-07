import type { Pack } from './db.types';

/**
 * Пак Telegram из снимка.
 */
type KnownPack = {
  /**
   * Запись пака.
   */
  pack: Pack;

  /**
   * Место пака в снимке.
   */
  position: number;
};

/**
 * Паки, разложенные для порядка: свой пак отдельно — он первым при любом использовании паков Telegram.
 */
type PackGroups = {
  /**
   * Свои стикеры.
   */
  custom: Pack[];

  /**
   * Паки Telegram, которых нет в снимке; без снимка — все паки Telegram.
   */
  fresh: Pack[];

  /**
   * Паки Telegram из снимка с их местом в нём.
   */
  known: KnownPack[];
};

/**
 * Сравнение по использованию: от недавнего к давнему. Пак без `usedAt` считается нулём и встаёт после использованных,
 * равные — по `createdAt`, то есть в порядке импорта.
 *
 * @param a — первый пак
 * @param b — второй пак
 * @returns отрицательное число — `a` раньше `b`
 */
const byUsage = (a: Pack, b: Pack) => {
  return (b.usedAt || 0) - (a.usedAt || 0) || a.createdAt - b.createdAt;
};

/**
 * Порядок паков пикера. Без снимка (открытие попапа) паки Telegram идут по использованию. Со снимком — id паков
 * Telegram в показанном порядке — порядок открытого попапа не меняется от новых отметок использования: паки снимка
 * остаются на своих местах, а паки не из снимка (импорт в открытом попапе) встают перед ними, между собой — по
 * использованию. Id снимка, которых больше нет среди паков, пропускаются. Свой пак — первым в обоих режимах.
 *
 * @param packs — все паки библиотеки в любом порядке; не меняется
 * @param snapshot — id паков Telegram в показанном порядке; `null` — порядок считается заново
 * @returns новый массив паков в порядке показа
 */
export const orderPacks = (
  packs: readonly Pack[],
  snapshot: readonly string[] | null
): Pack[] => {
  const positions = new Map(
    (snapshot || []).map((id, position) => {
      return [id, position];
    })
  );
  const { custom, fresh, known } = packs.reduce<PackGroups>(
    (groups, pack) => {
      const position = positions.get(pack.id);

      if (pack.source === 'custom') {
        groups.custom.push(pack);
      } else if (position === undefined) {
        groups.fresh.push(pack);
      } else {
        groups.known.push({ pack, position });
      }

      return groups;
    },
    { custom: [], fresh: [], known: [] }
  );

  fresh.sort(byUsage);
  known.sort((a, b) => {
    return a.position - b.position;
  });

  return [
    ...custom,
    ...fresh,
    ...known.map(({ pack }) => {
      return pack;
    }),
  ];
};

/**
 * Снимок показанного порядка для `orderPacks`: свой пак в него не входит — он первым и без снимка.
 *
 * @param packs — паки в порядке показа
 * @returns id паков Telegram по порядку
 */
export const packSnapshot = (packs: readonly Pack[]): string[] => {
  return packs.reduce<string[]>((ids, { id, source }) => {
    if (source === 'telegram') ids.push(id);

    return ids;
  }, []);
};
