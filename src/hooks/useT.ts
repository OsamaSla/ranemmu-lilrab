/**
 * Translation and text-direction binding.
 *
 * Direction is applied in React rather than through `I18nManager.forceRTL`.
 * The native setting is only read once at process start and changing it needs
 * an app restart on Android, which is a poor experience mid-session. Styling
 * direction explicitly means a language switch takes effect immediately for
 * the whole app; the keyboard follows the system locale, which is acceptable
 * because the search field is the only place text is typed.
 */
import { useMemo } from 'react';

import { isRTL, translate, type LocaleCode, type TranslationKey } from '../i18n';
import { useSettings } from '../store/settings';

export interface Direction {
  /** Text direction for the current locale. */
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  /**
   * `flexDirection` value that lays children out in reading order, so callers
   * write `style={{ flexDirection: row }}` and it flips automatically.
   */
  row: 'row' | 'row-reverse';
  /** Text alignment matching the reading direction. */
  textAlign: 'left' | 'right';
}

export interface Translator {
  t: (key: TranslationKey) => string;
  locale: LocaleCode;
  direction: Direction;
}

export function useT(): Translator {
  const locale = useSettings((s) => s.locale);

  return useMemo(() => {
    const rtl = isRTL(locale);

    return {
      t: (key) => translate(locale, key),
      locale,
      direction: {
        dir: rtl ? 'rtl' : 'ltr',
        isRTL: rtl,
        row: rtl ? 'row-reverse' : 'row',
        textAlign: rtl ? 'right' : 'left',
      },
    };
  }, [locale]);
}