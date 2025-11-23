
import type { SimpleRouteJson } from "../lib/types"
import type { GridContext } from "./createGridContext"
import { getGridIndexFromPoint } from "./getGridIndexFromPoint"

/**
 * Generates a flattened Uint8Array representing the 3D voxel grid.
 * Values: 0 = Empty, 255 = Obstacle.
 * Indexing: index = z * (width * height) + y * width + x
 */
export function createVoxelGridData(
  simpleRouteJson: SimpleRouteJson,
  ctx: GridContext,
): Uint8Array {
  const { widthCells, heightCells, layerCount } = ctx
  const volume = widthCells * heightCells * layerCount
  const gridData = new Uint8Array(volume)

  // Helper to map layer name to Z index
  // Assumes standard stackup conventions (Top=0, Bottom=Max, InnerN=N)
  const getLayerIndex = (layerName: string): number => {
    const name = layerName.toLowerCase()
    if (name === "top") return 0
    if (name === "bottom") return layerCount - 1
    if (name.startsWith("inner")) {
      const match = name.match(/\d+/)
      return match ? Number.parseInt(match[0], 10) : 0
    }
    return 0
  }

  // Mark Obstacles
  for (const obstacle of simpleRouteJson.obstacles) {
    if (obstacle.type !== "rect") continue

    // Calculate Grid Bounds for the Obstacle
    // Obstacle center/width/height are in physical units
    const halfWidth = obstacle.width / 2
    const halfHeight = obstacle.height / 2

    const minPhys = {
      x: obstacle.center.x - halfWidth,
      y: obstacle.center.y - halfHeight,
    }
    const maxPhys = {
      x: obstacle.center.x + halfWidth,
      y: obstacle.center.y + halfHeight,
    }

    const minIdx = getGridIndexFromPoint(minPhys, ctx)
    const maxIdx = getGridIndexFromPoint(maxPhys, ctx)

    // Clamp to grid bounds
    minIdx.i = Math.max(0, minIdx.i)
    minIdx.j = Math.max(0, minIdx.j)
    maxIdx.i = Math.min(widthCells - 1, maxIdx.i)
    maxIdx.j = Math.min(heightCells - 1, maxIdx.j)

    // Fill Voxels
    for (const layerName of obstacle.layers) {
      const z = getLayerIndex(layerName)
      if (z < 0 || z >= layerCount) continue

      for (let j = minIdx.j; j <= maxIdx.j; j++) {
        for (let i = minIdx.i; i <= maxIdx.i; i++) {
          const flatIndex = z * (widthCells * heightCells) + j * widthCells + i
          gridData[flatIndex] = 255 // Mark as Obstacle
        }
      }
    }
  }

  return gridData
}
