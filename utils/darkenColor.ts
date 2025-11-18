export function darkenColor(hex: number, factor = 0.6): number {
  const r = ((hex >> 16) & 0xff) * factor
  const g = ((hex >> 8) & 0xff) * factor
  const b = (hex & 0xff) * factor
  const cr = Math.max(0, Math.min(255, Math.round(r)))
  const cg = Math.max(0, Math.min(255, Math.round(g)))
  const cb = Math.max(0, Math.min(255, Math.round(b)))
  return (cr << 16) | (cg << 8) | cb
}
