import { describe, expect, it, vi } from 'vitest';

import { createTabCentering } from '@ui/SectionTabs/tabCentering';

/**
 * Контроллер с подменённой постановкой вкладки: `place` отвечает `isShown` и пишет, с каким
 * движением его позвали.
 *
 * @param motion — что разрешает системная настройка движения
 * @returns контроллер, журнал вызовов `place` и переключатель «полоса видна»
 */
const setup = (motion: ScrollBehavior = 'smooth') => {
  const state = { isShown: true };
  const place = vi.fn((_behavior: ScrollBehavior) => {
    return state.isShown;
  });
  const centering = createTabCentering({
    place,
    motion: () => {
      return motion;
    },
  });

  return { centering, place, state };
};

describe('createTabCentering', () => {
  it('первая постановка вкладки — мгновенно', () => {
    const { centering, place } = setup();

    centering.select();

    expect(place).toHaveBeenCalledWith('auto');
  });

  it('смена вкладки на видимой полосе — плавно', () => {
    const { centering, place } = setup();

    centering.select();
    centering.select();

    expect(place).toHaveBeenLastCalledWith('smooth');
  });

  it('при уменьшении движения смена вкладки — мгновенно', () => {
    const { centering, place } = setup('auto');

    centering.select();
    centering.select();

    expect(place).toHaveBeenLastCalledWith('auto');
  });

  it('вкладка, которую не удалось поставить, в следующий раз ставится мгновенно', () => {
    const { centering, place, state } = setup();

    state.isShown = false;
    centering.select();
    state.isShown = true;
    centering.select();

    expect(place).toHaveBeenLastCalledWith('auto');
  });

  it('показ полосы после скрытия ставит вкладку мгновенно', () => {
    const { centering, place } = setup();

    centering.select();
    centering.resize(0);
    centering.resize(300);

    expect(place).toHaveBeenCalledTimes(2);
    expect(place).toHaveBeenLastCalledWith('auto');
  });

  it('после скрытия смена вкладки — мгновенно', () => {
    const { centering, place } = setup();

    centering.select();
    centering.resize(0);
    centering.select();

    expect(place).toHaveBeenLastCalledWith('auto');
  });

  it('скрытая полоса вкладку не ставит', () => {
    const { centering, place } = setup();

    centering.resize(0);

    expect(place).not.toHaveBeenCalled();
  });

  it('смена ширины видимой полосы с поставленной вкладкой её не трогает', () => {
    const { centering, place } = setup();

    centering.select();
    centering.resize(300);
    centering.resize(320);

    expect(place).toHaveBeenCalledTimes(1);
  });
});
