import { layerSortKey } from "./layerSortKey"

export function canonicalizeLayerOrder(names: string[]) {
  return Array.from(new Set(names)).sort((a, b) => {
    const ka = layerSortKey(a)
    const kb = layerSortKey(b)
    if (ka !== kb) return ka - kb
    return a.localeCompare(b)
  })
}
