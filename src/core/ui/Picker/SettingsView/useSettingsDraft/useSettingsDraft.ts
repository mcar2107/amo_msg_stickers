import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import type { Settings } from '../../../../host.types';
import { checkGifKey } from '../../../../sources/gifs';
import type { GifProvider } from '../../../../sources/gifs.types';
import { isBotTokenFormat } from '../../../../sources/telegram';
import { usePicker } from '../../PickerProvider/usePicker';
import { checkPlan, dropWritten, pendingWrite } from '../settingsDraft/settingsDraft';

import type { FieldCheck, SettingsChecks, SettingsDraft } from './useSettingsDraft.types';

/**
 * Пауза ввода до записи. Запись не ждёт ухода фокуса: Escape закрывает попап без `blur`
 * поля, и введённое иначе не записалось бы до следующего открытия.
 */
const WRITE_DELAY_MS = 600;

/**
 * Черновик формы настроек с автосохранением. Правки живут, пока смонтирован экран, и стоят
 * поверх сохранённых значений: перечитывание настроек на открытие попапа не сбрасывает ввод,
 * который ещё ждёт паузы. Пишется только отличие от сохранённого, а при размонтировании
 * экрана — «Назад», переключение режима — несохранённое пишется сразу.
 *
 * Проверка идёт не на каждую паузу ввода, а на фиксации значения: иначе каждая пауза тратила
 * бы лимит запросов источника. Ответ, пришедший после правки поля или новой проверки, и ответ
 * после размонтирования экрана не показываются.
 *
 * @returns значения полей, результаты проверки, ввод и фиксация
 */
export const useSettingsDraft = (): SettingsDraft => {
  const { env, settings, saveSettings } = usePicker();
  const [edits, setEdits] = useState<Partial<Settings> | null>(null);
  const [checks, setChecks] = useState<SettingsChecks | null>(null);
  const settingsRef = useRef(settings);
  const editsRef = useRef<Partial<Settings>>({});
  const writingRef = useRef<Partial<Settings>>({});
  const checkedRef = useRef<Partial<Settings>>({});
  const checkSeqRef = useRef<Partial<Record<keyof Settings, number>>>({});
  const timerRef = useRef(0);
  const isMountedRef = useRef(true);
  const draft: Settings = { ...settings, ...edits };

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const setCheck = useCallback((key: keyof Settings, check: FieldCheck | null) => {
    setChecks((prev) => {
      const { [key]: _dropped, ...rest } = prev || {};

      return check ? { ...rest, [key]: check } : rest;
    });
  }, []);

  /**
   * Новый номер проверки поля: ответ с прежним номером устарел.
   */
  const nextCheckSeq = useCallback((key: keyof Settings) => {
    const seq = (checkSeqRef.current[key] || 0) + 1;

    checkSeqRef.current = { ...checkSeqRef.current, [key]: seq };

    return seq;
  }, []);

  /**
   * Запись ждущих полей. Сравнение — с сохранённым вместе с ещё идущими записями: фиксация
   * сразу после записи по паузе не пишет то же значение второй раз.
   */
  const write = useCallback(() => {
    window.clearTimeout(timerRef.current);

    const base = { ...settingsRef.current, ...writingRef.current };
    const patch = pendingWrite(base, editsRef.current);

    if (!patch) return;

    writingRef.current = { ...writingRef.current, ...patch };

    const finish = async () => {
      await saveSettings(patch);
      writingRef.current = dropWritten(writingRef.current, patch);
    };

    void finish();
  }, [saveSettings]);

  const runGifCheck = useCallback(
    async (key: keyof Settings, provider: GifProvider, value: string) => {
      const seq = nextCheckSeq(key);

      setCheck(key, 'checking');

      const result = await checkGifKey(env, provider, value);

      if (isMountedRef.current && checkSeqRef.current[key] === seq) setCheck(key, result);
    },
    [env, nextCheckSeq, setCheck]
  );

  const runCheck = useCallback(
    (key: keyof Settings, value: string) => {
      switch (key) {
        case 'giphyKey': {
          void runGifCheck(key, 'giphy', value);

          return;
        }

        case 'klipyKey': {
          void runGifCheck(key, 'klipy', value);

          return;
        }

        case 'telegramToken': {
          setCheck(key, isBotTokenFormat(value) ? null : 'badFormat');

          return;
        }

        default: {
          const unknownKey: never = key;

          throw new Error(`Unknown settings field: ${String(unknownKey)}`);
        }
      }
    },
    [runGifCheck, setCheck]
  );

  const changeField = useCallback(
    (key: keyof Settings, value: string) => {
      if (checkedRef.current[key] === undefined) {
        checkedRef.current = { ...checkedRef.current, [key]: settingsRef.current[key] };
      }

      editsRef.current = { ...editsRef.current, [key]: value };
      setEdits(editsRef.current);
      nextCheckSeq(key);
      setCheck(key, null);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(write, WRITE_DELAY_MS);
    },
    [nextCheckSeq, setCheck, write]
  );

  const commit = useCallback(() => {
    write();

    const values = { ...settingsRef.current, ...editsRef.current };
    const { keys, checked } = checkPlan(values, checkedRef.current);

    checkedRef.current = checked;

    keys.forEach((key) => {
      runCheck(key, values[key].trim());
    });
  }, [write, runCheck]);

  /**
   * Размонтирование — «Назад», переключение режима — пишет несохранённое сразу. Проверки на
   * нём нет: её результат уже некуда показать.
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      write();
    };
  }, [write]);

  return { draft, checks: checks || {}, changeField, commit };
};
