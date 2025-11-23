
import type { GridContext } from "./createGridContext"

/**
 * Converts a physical world coordinate (x, y) into integer grid coordinates (i, j).
 * Returns the indices; does not check bounds.
 */
export function getGridIndexFromPoint(
  point: { x: number; y: number },
  ctx: GridContext,
): { i: number; j: number } {
  const i = Math.floor((point.x - ctx.minX) / ctx.resolution)
  const j = Math.floor((point.y - ctx.minY) / ctx.resolution)

  return { i, j }
}
