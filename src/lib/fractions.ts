const FRACS: [number, string][] = [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'], [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞']]

// 0.75 -> "¾", 1.5 -> "1½", 2 -> "2". Non-numeric input is returned as-is.
export function fmtAmount(raw: string | number): string {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (typeof raw === 'string' && !raw.trim()) return raw
  if (!Number.isFinite(n) || n <= 0) return String(raw)
  const whole = Math.floor(n + 1e-9)
  const frac = n - whole
  if (frac < 0.02) return String(whole)
  const hit = FRACS.find(([v]) => Math.abs(v - frac) < 0.02)
  if (!hit) return String(Math.round(n * 100) / 100)
  return `${whole || ''}${hit[1]}`
}
