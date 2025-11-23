
import type { SimpleRouteJson } from "../lib/types"

export interface GridContext {
  minX: number
  minY: number
  maxX: number
  maxY: number
  resolution: number
  widthCells: number
  heightCells: number
  layerCount: number
}

/**
 * Creates a grid context from a SimpleRouteJson object specifically for defining the
 * bounding box and resolution of the voxel grid.
 */
export function createGridContext(
  simpleRouteJson: SimpleRouteJson,
  params: { resolution: number },
): GridContext {
  const { bounds, layerCount } = simpleRouteJson
  const { minX, minY, maxX, maxY } = bounds

  // Calculate dimensions
  const width = maxX - minX
  const height = maxY - minY

  // Calculate cell counts (rounding up to ensure coverage)
  const widthCells = Math.ceil(width / params.resolution)
  const heightCells = Math.ceil(height / params.resolution)

  return {
    minX,
    minY,
    maxX,
    maxY,
    resolution: params.resolution,
    widthCells,
    heightCells,
    layerCount,
  }
}
