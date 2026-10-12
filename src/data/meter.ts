/**
 * مقياس الكلام — canonical metre form.
 *
 * Metre strings arrive in mixed notations ("10.9.10.6", "10و12", "8.7 - 7")
 * depending on who typed them in. Canonicalisation unifies the separators so
 * "8.7", "8و7" and "8&7" group and compare as one metre, while compound
 * metres ("8و7 – 7") keep their shape.
 */
export function normalizeMeter(meter: string): string {
  return meter.trim().replace(/&/g, 'و').replace(/\./g, 'و').replace(/-/g, '–').replace(/\s+/g, ' ');
}
