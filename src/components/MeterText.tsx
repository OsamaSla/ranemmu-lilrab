/**
 * مقياس الكلام — metre display.
 *
 * Metre strings arrive in mixed notations ("10.9.10.6", "10و12", "8.7 - 7")
 * depending on who typed them in. Every display goes through here so dots
 * always read as a small "و" between full-size numbers, never as a Latin
 * decimal point that breaks the RTL flow.
 */
import { Text as RNText, type TextStyle } from 'react-native';

import { splitPair } from '../data/meter';

/** The "و" separator renders at this fraction of the digit size. */
const SEPARATOR_SCALE = 0.72;

interface MeterToken {
  text: string;
  small: boolean;
}

function tokenize(meter: string): MeterToken[] {
  return meter
    .trim()
    .split(/(\d+|[٠-٩]+|[.و&]+|[-–—]+|\s+)/g)
    .filter((part) => part !== undefined && part !== '')
    .flatMap((part) => {
      if (/^\d+$/.test(part)) {
        const split = splitPair(part);
        if (split !== part) {
          const [a, b] = [split[0], split[2]];
          return [
            { text: a, small: false },
            { text: 'و', small: true },
            { text: b, small: false },
          ];
        }
        return [{ text: part, small: false }];
      }
      if (/^[٠-٩]+$/.test(part)) return [{ text: part, small: false }];
      if (/^[.و&]+$/.test(part)) return [{ text: 'و', small: true }];
      if (/^[-–—]+$/.test(part)) return [{ text: '–', small: true }];
      if (/^\s+$/.test(part)) return [{ text: ' ', small: false }];
      return [{ text: part, small: false }];
    });
}

interface MeterTextProps {
  meter: string;
  /** Digit size; the "و" separator scales down from this. */
  fontSize: number;
  color: string;
  bold?: boolean;
  align?: 'left' | 'right' | 'center';
  numberOfLines?: number;
  style?: TextStyle;
}

export function MeterText({ meter, fontSize, color, bold, align, numberOfLines, style }: MeterTextProps) {
  const separatorSize = Math.max(8, Math.round(fontSize * SEPARATOR_SCALE));
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[{ writingDirection: 'rtl', textAlign: align ?? 'right' }, style]}>
      {tokenize(meter).map((token, index) => (
        <RNText
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          style={
            token.small
              ? { fontSize: separatorSize, color }
              : { fontSize, color, fontWeight: bold ? '700' : '400' }
          }>
          {token.text}
        </RNText>
      ))}
    </RNText>
  );
}
