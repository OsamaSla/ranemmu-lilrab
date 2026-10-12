/**
 * Meter families (النظم) transcribed from the original app's bundled database
 * (taranim_db.sqlite, song.nazm) — the same index behind its
 * "الترنيمات مرتبة حسب النظم" grid.
 *
 * A family is a singable tune group: one grid cell holding a base metre plus
 * variant sub-metres (e.g. family ٨و٧ holds 87.87 alongside 87 – 87.87.87.87).
 * Family membership is musical knowledge — it is NOT derivable from the metre
 * string (74.74.74.74 belongs to ٨و٧) — so it is transcribed, not computed.
 * Labels keep the grid's Arabic-Indic digits, in grid order.
 */
export interface MeterFamily {
  /** Grid-cell label exactly as printed, e.g. "٨و٧". */
  label: string;
  /** Stable hymn ids (trNNNN) inside this cell, ascending. */
  hymnIds: string[];
}

export const METER_FAMILIES: MeterFamily[] = [
  { label: '٥', hymnIds: ['tr0052'] },
  { label: '٦', hymnIds: ['tr0201'] },
  { label: '٧', hymnIds: ['tr0069', 'tr0080', 'tr0083', 'tr0085', 'tr0087', 'tr0096', 'tr0118', 'tr0119', 'tr0154', 'tr0159', 'tr0162', 'tr0166', 'tr0179', 'tr0235', 'tr0290'] },
  { label: '٨', hymnIds: ['tr0012', 'tr0022', 'tr0024', 'tr0040', 'tr0050', 'tr0062', 'tr0066', 'tr0072', 'tr0075', 'tr0078', 'tr0079', 'tr0084', 'tr0089', 'tr0090', 'tr0091', 'tr0095', 'tr0097', 'tr0100', 'tr0102', 'tr0103', 'tr0104', 'tr0105', 'tr0106', 'tr0111', 'tr0121', 'tr0124', 'tr0126', 'tr0130', 'tr0137', 'tr0139', 'tr0140', 'tr0143', 'tr0144', 'tr0146', 'tr0148', 'tr0149', 'tr0151', 'tr0152', 'tr0155', 'tr0160', 'tr0161', 'tr0163', 'tr0164', 'tr0165', 'tr0167', 'tr0169', 'tr0174', 'tr0186', 'tr0192', 'tr0193', 'tr0198', 'tr0199', 'tr0200', 'tr0205', 'tr0209', 'tr0212', 'tr0224', 'tr0225', 'tr0227', 'tr0231', 'tr0232', 'tr0237', 'tr0238', 'tr0239', 'tr0242', 'tr0250', 'tr0253', 'tr0262', 'tr0273', 'tr0274', 'tr0277', 'tr0294', 'tr0302', 'tr0318', 'tr0344', 'tr0346', 'tr0356', 'tr0357'] },
  { label: '٩', hymnIds: ['tr0113'] },
  { label: '١٠', hymnIds: ['tr0008', 'tr0181', 'tr0182', 'tr0354'] },
  { label: '١١', hymnIds: ['tr0001', 'tr0074', 'tr0081', 'tr0134', 'tr0147', 'tr0175', 'tr0180', 'tr0254', 'tr0256', 'tr0257', 'tr0264'] },
  { label: '١٢', hymnIds: ['tr0128', 'tr0183', 'tr0283', 'tr0287'] },
  { label: '١٤', hymnIds: ['tr0176', 'tr0241', 'tr0308'] },
  { label: '٥و٤', hymnIds: ['tr0099'] },
  { label: '٥و٨و٦', hymnIds: ['tr0297'] },
  { label: '٦و٤', hymnIds: ['tr0021'] },
  { label: '٦و٤و٨', hymnIds: ['tr0150'] },
  { label: '٦و٥', hymnIds: ['tr0194', 'tr0195'] },
  { label: '٦و٧و٤', hymnIds: ['tr0158'] },
  { label: '٦و٧', hymnIds: ['tr0260'] },
  { label: '٦و٨', hymnIds: ['tr0020', 'tr0048', 'tr0063', 'tr0135'] },
  { label: '٦و٨و٩', hymnIds: ['tr0249'] },
  { label: '٦و٩و٤و٦و٧', hymnIds: ['tr0305'] },
  { label: '٧و٥', hymnIds: ['tr0300'] },
  { label: '١٠و١٢', hymnIds: ['tr0216'] },
  { label: '١٠و٦و٥', hymnIds: ['tr0313'] },
  { label: '١٠و٧و٦و٨', hymnIds: ['tr0252'] },
  { label: '١٠و٧و٩', hymnIds: ['tr0215'] },
  { label: '١٠و٨و٧', hymnIds: ['tr0064', 'tr0271'] },
  { label: '١٠و٨و٧و١١', hymnIds: ['tr0304'] },
  { label: '١٠و٩و٦و٨', hymnIds: ['tr0298'] },
  { label: '١١و١٠و٧', hymnIds: ['tr0251'] },
  { label: '١١و١٠و٨', hymnIds: ['tr0255'] },
  { label: '١١و١٢', hymnIds: ['tr0133', 'tr0178'] },
  { label: '١١و١٥', hymnIds: ['tr0221'] },
  { label: '١١و٥', hymnIds: ['tr0299'] },
  { label: '١١و٥و٧', hymnIds: ['tr0315'] },
  { label: '١١و٨', hymnIds: ['tr0017', 'tr0082', 'tr0187', 'tr0188', 'tr0230', 'tr0288'] },
  { label: '١٢و١١', hymnIds: ['tr0286', 'tr0321'] },
  { label: '١٢و٦', hymnIds: ['tr0263'] },
  { label: '١٢و٧', hymnIds: ['tr0210'] },
  { label: '١٢و٨', hymnIds: ['tr0007', 'tr0014', 'tr0038', 'tr0039', 'tr0285'] },
  { label: '١٢و٨و٤', hymnIds: ['tr0053'] },
  { label: '١٢و٨و٦', hymnIds: ['tr0217'] },
  { label: '١٢و٩', hymnIds: ['tr0316'] },
  { label: '١٢و٩و١٠', hymnIds: ['tr0132'] },
  { label: '١٥و١١و٨', hymnIds: ['tr0157', 'tr0177', 'tr0197'] },
  { label: '٧و٦', hymnIds: ['tr0025', 'tr0031', 'tr0034', 'tr0228', 'tr0279', 'tr0319', 'tr0340', 'tr0341'] },
  { label: '٧و٦و٥', hymnIds: ['tr0291'] },
  { label: '٧و٦و٨و٩', hymnIds: ['tr0220'] },
  { label: '٧و٨', hymnIds: ['tr0088', 'tr0307', 'tr0339'] },
  { label: '٨و٤', hymnIds: ['tr0068', 'tr0320'] },
  { label: '٨و٥', hymnIds: ['tr0019', 'tr0189', 'tr0223', 'tr0243'] },
  { label: '٨و٦', hymnIds: ['tr0002', 'tr0004', 'tr0005', 'tr0011', 'tr0013', 'tr0016', 'tr0027', 'tr0028', 'tr0029', 'tr0036', 'tr0042', 'tr0044', 'tr0046', 'tr0047', 'tr0049', 'tr0051', 'tr0054', 'tr0057', 'tr0058', 'tr0065', 'tr0076', 'tr0086', 'tr0092', 'tr0107', 'tr0114', 'tr0115', 'tr0116', 'tr0120', 'tr0122', 'tr0123', 'tr0131', 'tr0138', 'tr0141', 'tr0142', 'tr0153', 'tr0171', 'tr0184', 'tr0190', 'tr0204', 'tr0206', 'tr0218', 'tr0219', 'tr0233', 'tr0236', 'tr0240', 'tr0245', 'tr0246', 'tr0247', 'tr0258', 'tr0267', 'tr0268', 'tr0272', 'tr0275', 'tr0278', 'tr0306', 'tr0309', 'tr0314', 'tr0317', 'tr0342'] },
  { label: '٨و٦و٧', hymnIds: ['tr0222'] },
  { label: '٨و٦و٩و٧و٤و١٠', hymnIds: ['tr0259'] },
  { label: '٨و٧', hymnIds: ['tr0003', 'tr0006', 'tr0009', 'tr0010', 'tr0018', 'tr0023', 'tr0026', 'tr0030', 'tr0033', 'tr0035', 'tr0037', 'tr0041', 'tr0043', 'tr0045', 'tr0055', 'tr0056', 'tr0059', 'tr0060', 'tr0061', 'tr0067', 'tr0070', 'tr0071', 'tr0073', 'tr0093', 'tr0094', 'tr0098', 'tr0109', 'tr0112', 'tr0127', 'tr0129', 'tr0136', 'tr0145', 'tr0170', 'tr0172', 'tr0173', 'tr0185', 'tr0191', 'tr0203', 'tr0207', 'tr0213', 'tr0214', 'tr0226', 'tr0248', 'tr0261', 'tr0265', 'tr0266', 'tr0269', 'tr0270', 'tr0280', 'tr0284', 'tr0289', 'tr0292', 'tr0293', 'tr0296', 'tr0303', 'tr0310', 'tr0311', 'tr0312', 'tr0324', 'tr0345', 'tr0347', 'tr0349', 'tr0352', 'tr0355'] },
  { label: '٨و٧و١٠', hymnIds: ['tr0244'] },
  { label: '٨و٧و١١', hymnIds: ['tr0156'] },
  { label: '٨و٧و١٢', hymnIds: ['tr0295', 'tr0301'] },
  { label: '٨و٧و٥', hymnIds: ['tr0117'] },
  { label: '٨و٧و٦', hymnIds: ['tr0281', 'tr0282'] },
  { label: '٨و٧و٦و٥', hymnIds: ['tr0101'] },
  { label: '٨و٧و٩', hymnIds: ['tr0110'] },
  { label: '٩و٤و٨', hymnIds: ['tr0015'] },
  { label: '٩و٥', hymnIds: ['tr0196'] },
  { label: '٩و٦', hymnIds: ['tr0211', 'tr0229', 'tr0343'] },
  { label: '٩و٧و٨', hymnIds: ['tr0108', 'tr0125'] },
  { label: '٩و٨', hymnIds: ['tr0234'] },
];

/** Family label for a hymn id, or null when it has none. */
export function familyOf(hymnId: string): string | null {
  for (const family of METER_FAMILIES) {
    if (family.hymnIds.includes(hymnId)) return family.label;
  }
  return null;
}

/**
 * The metre to show on a single hymn (reader, info sheet): the short family
 * form when the hymn's cell is transcribed (٥ instead of 55.55.55.55),
 * otherwise the exact metre. Empty when neither exists.
 */
export function displayMeter(hymnId: string, meter?: string): string {
  return familyOf(hymnId) ?? (meter ?? '').trim();
}
