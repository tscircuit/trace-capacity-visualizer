import type { CapacityMeshNode } from "../lib/types"
import { contiguousRuns } from "./contiguousRuns"

/** Build prisms by grouping identical XY nodes across contiguous Z */
export function buildPrismsFromNodes(
  nodes: CapacityMeshNode[],
  fallbackLayerCount: number,
): Array<{
  minX: number
  maxX: number
  minY: number
  maxY: number
  z0: number
  z1: number
  nodes: CapacityMeshNode[]
}> {
  const xyKey = (n: CapacityMeshNode) =>
    `${n.center.x.toFixed(8)}|${n.center.y.toFixed(8)}|${n.width.toFixed(
      8,
    )}|${n.height.toFixed(8)}`
  const azKey = (n: CapacityMeshNode) => {
    const zs = (
      n.availableZ && n.availableZ.length
        ? Array.from(new Set(n.availableZ))
        : [0]
    ).sort((a, b) => a - b)
    return `zset:${zs.join(",")}`
  }
  const key = (n: CapacityMeshNode) => `${xyKey(n)}|${azKey(n)}`

  const groups = new Map<
    string,
    {
      cx: number
      cy: number
      w: number
      h: number
      zs: number[]
      nodes: CapacityMeshNode[]
    }
  >()
  for (const n of nodes) {
    const k = key(n)
    const zlist = n.availableZ?.length ? n.availableZ : [0]
    const g = groups.get(k)
    if (g) {
      g.zs.push(...zlist)
      g.nodes.push(n)
    } else
      groups.set(k, {
        cx: n.center.x,
        cy: n.center.y,
        w: n.width,
        h: n.height,
        zs: [...zlist],
        nodes: [n],
      })
  }

  const prisms: Array<{
    minX: number
    maxX: number
    minY: number
    maxY: number
    z0: number
    z1: number
    nodes: CapacityMeshNode[]
  }> = []
  for (const g of Array.from(groups.values())) {
    const minX = g.cx - g.w / 2
    const maxX = g.cx + g.w / 2
    const minY = g.cy - g.h / 2
    const maxY = g.cy + g.h / 2
    const runs = contiguousRuns(g.zs)
    if (runs.length === 0) {
      prisms.push({
        minX,
        maxX,
        minY,
        maxY,
        z0: 0,
        z1: Math.max(1, fallbackLayerCount),
        nodes: g.nodes,
      })
    } else {
      for (const r of runs) {
        prisms.push({
          minX,
          maxX,
          minY,
          maxY,
          z0: r[0]!,
          z1: r[r.length - 1]! + 1,
          nodes: g.nodes,
        })
      }
    }
  }
  return prisms
}
