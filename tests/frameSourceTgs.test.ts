import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVENT_TIMEOUT_MS } from '@core/frameSourceCommon';
import { openTgsSource, tgsPlan } from '@core/frameSourceTgs';

import { fakeCanvasContext } from './helpers';
import { gzip } from './helpers';

const anim = vi.hoisted(() => {
  return {
    isLoaded: true,
    totalFrames: 180,
    goToAndStop: vi.fn(),
    destroy: vi.fn(),
    addEventListener: vi.fn(),
  };
});

const loadAnimation = vi.hoisted(() => {
  return vi.fn(() => {
    return anim;
  });
});

vi.mock('lottie-web/build/player/lottie_light_canvas', () => {
  return { default: { loadAnimation } };
});

const LOTTIE = { w: 1024, h: 512, fr: 60, ip: 0, op: 180, layers: [] };

describe('tgsPlan', () => {
  it('60 fps × 3 с → 75 кадров по 40 мс', () => {
    const plan = tgsPlan(180, 60);

    expect(plan).toHaveLength(75);
    expect(plan[1]).toEqual({ position: 2.4, delayMs: 40 });
    expect(
      plan.every(({ delayMs }) => {
        return delayMs === 40;
      })
    ).toBe(true);
  });

  it('обрезается до 4 с исходных кадров и 100 кадров', () => {
    expect(tgsPlan(600, 60)).toHaveLength(100);
    expect(tgsPlan(600, 60).at(-1)?.position).toBeCloseTo(237.6);
  });

  it('при fps ниже целевых длину плана задаёт предел 4 с, а не 100 кадров', () => {
    expect(tgsPlan(1000, 10)).toHaveLength(40);
  });

  it('fps ниже целевых: шаг в один кадр, задержка от реального шага', () => {
    const plan = tgsPlan(40, 20);

    expect(plan).toHaveLength(40);
    expect(plan[1]).toEqual({ position: 1, delayMs: 50 });
  });

  it('граница длительности не добавляет лишнего кадра', () => {
    expect(tgsPlan(60, 60)).toHaveLength(25);
    expect(tgsPlan(30, 30)).toHaveLength(25);
  });
});

describe('openTgsSource', () => {
  const ownCtx = { own: true };
  const ownCanvas = {
    width: 0,
    height: 0,
    getContext: () => {
      return ownCtx;
    },
  };

  beforeEach(() => {
    anim.goToAndStop.mockClear();
    anim.destroy.mockClear();
    loadAnimation.mockClear();
    vi.stubGlobal('document', {
      createElement: () => {
        return ownCanvas;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    anim.isLoaded = true;
    anim.addEventListener.mockReset();
  });

  it('анимация не загрузилась за таймаут: источник открывается, слушатель снят', async () => {
    const removeListener = vi.fn();

    anim.isLoaded = false;
    anim.addEventListener.mockReturnValue(removeListener);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const opening = openTgsSource(await gzip(JSON.stringify(LOTTIE)), 512);

    await vi.waitFor(() => {
      expect(anim.addEventListener).toHaveBeenCalledWith(
        'DOMLoaded',
        expect.any(Function)
      );
    });
    await vi.advanceTimersByTimeAsync(EVENT_TIMEOUT_MS);

    await expect(opening).resolves.toMatchObject({ width: 512, height: 256 });
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('рендерит на своём холсте в размере источника, план от fps файла', async () => {
    const source = await openTgsSource(await gzip(JSON.stringify(LOTTIE)), 512);

    expect([source.width, source.height]).toEqual([512, 256]);
    expect([ownCanvas.width, ownCanvas.height]).toEqual([512, 256]);
    expect(loadAnimation).toHaveBeenCalledWith(
      expect.objectContaining({
        rendererSettings: expect.objectContaining({ context: ownCtx }),
      })
    );
    expect(source.plan).toHaveLength(75);
  });

  it('draw = goToAndStop + drawImage своего холста в целевой', async () => {
    const source = await openTgsSource(await gzip(JSON.stringify(LOTTIE)), 512);
    const ctx = fakeCanvasContext();

    await source.draw(1, ctx, 256, 128);
    expect(anim.goToAndStop).toHaveBeenCalledWith(2.4, true);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 256, 128);
    expect(ctx.drawImage).toHaveBeenCalledWith(ownCanvas, 0, 0, 256, 128);
    await expect(source.draw(75, ctx, 256, 128)).rejects.toThrow(RangeError);
  });

  it('dispose уничтожает анимацию', async () => {
    const source = await openTgsSource(await gzip(JSON.stringify(LOTTIE)), 512);

    source.dispose();
    expect(anim.destroy).toHaveBeenCalledOnce();
  });

  it('битый .tgs — ошибка до запуска рендера', async () => {
    await expect(openTgsSource(await gzip('{}'), 512)).rejects.toThrow('Lottie');
    expect(loadAnimation).not.toHaveBeenCalled();
  });
});
