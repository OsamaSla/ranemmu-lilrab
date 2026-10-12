/**
 * مقياس الكلام — canonical metre form.
 *
 * Metre strings arrive in mixed notations ("10.9.10.6", "10و12", "8.7 - 7",
 * and the original book's compact pairs like "87.87") depending on who typed
 * them in. Canonicalisation unifies the separators so "8.7", "8و7" and "8&7"
 * group and compare as one metre, while compound metres ("8و7 – 7") keep
 * their shape.
 *
 * Compact pairs: a two-digit dotted run above 15 (87, 74, …) is a compact
 * pair of single counts (8+7, 7+4). Longer runs (664, 7777, …) are single
 * counts written without separators. Teens (10..15) are whole counts — no
 * 16+ syllable line exists in either book, so anything longer must already
 * use و-notation in the source.
 */
export function splitPair(run: string): string {
  if (/^\d{3,}$/.test(run)) return run.split('').join('و');
  if (/^\d{2}$/.test(run) && Number(run) > 15) return `${run[0]}و${run[1]}`;
  return run;
}

export function normalizeMeter(meter: string): string {
  const unified = meter.trim().replace(/&/g, '.').replace(/و/g, '.').replace(/,/g, '.').replace(/-/g, '–').replace(/\s+/g, ' ');
  return unified
    .split(/([.–])/g)
    .map((part) => {
      if (part === '.') return 'و';
      if (/^\d+$/.test(part)) return splitPair(part);
      return part;
    })
    .join('');
}
