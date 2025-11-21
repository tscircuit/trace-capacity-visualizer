/**
 * Standard color palette for visualizing layer spans.
 * Extracted from ThreeBoardView.tsx.
 */
export const LAYER_PALETTE = [
  0x0ea5e9, // cyan-ish
  0x22c55e, // green
  0xf97316, // orange
  0xa855f7, // purple
  0xfacc15, // yellow
  0x38bdf8, // light blue
  0xec4899, // pink
  0x14b8a6, // teal
]

/**
 * Creates a stateful function that assigns a consistent color
 * to a given key string.
 */
export function createColorAssigner() {
  const map = new Map<string, number>()
  let index = 0

  return (key: string) => {
    let color = map.get(key)
    if (color === undefined) {
      color = LAYER_PALETTE[index % LAYER_PALETTE.length]!
      map.set(key, color)
      index++
    }
    return color
  }
}
