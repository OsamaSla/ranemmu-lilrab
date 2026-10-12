/**
 * Meter families (النظم) transcribed from the printed book's
 * "الترنيمات مرتبة حسب النظم" index.
 *
 * A family is a singable tune group: one grid cell in the book's index that
 * holds a base metre plus variant sub-metres (e.g. family ٨و٧ holds 87.87
 * alongside 87.87.87.87–87). Family membership is musical knowledge — it is
 * NOT derivable from the metre string (74.74.74.74 belongs to ٨و٧) — so it
 * is transcribed cell by cell. Labels keep the book's Arabic-Indic digits.
 *
 * Coverage grows batch by batch; hymns without a family fall back to
 * exact-metre groups in the structure screen.
 */
export interface MeterFamily {
  /** Grid-cell label exactly as printed, e.g. "٨و٧". */
  label: string;
  /** Stable hymn ids (trNNNN) confirmed inside this cell, in index order. */
  hymnIds: string[];
}

export const METER_FAMILIES: MeterFamily[] = [
  {
    label: '٨و٧',
    hymnIds: [
      'tr0003',
      'tr0006',
      'tr0010',
      'tr0026',
      'tr0035',
      'tr0041',
      'tr0043',
      'tr0055',
      'tr0056',
      'tr0059',
      'tr0060',
      'tr0045',
      'tr0207',
      'tr0214',
      'tr0310',
      'tr0203',
      'tr0248',
      'tr0284',
      'tr0345',
    ],
  },
];

/** Family label for a hymn id, or null when its cell is not transcribed yet. */
export function familyOf(hymnId: string): string | null {
  for (const family of METER_FAMILIES) {
    if (family.hymnIds.includes(hymnId)) return family.label;
  }
  return null;
}
