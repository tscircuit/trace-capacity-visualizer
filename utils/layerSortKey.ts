export function layerSortKey(name: string) {
  const n = name.toLowerCase()
  if (n === "top") return -1_000_000
  if (n === "bottom") return 1_000_000
  const m = /^inner(\d+)$/i.exec(n)
  if (m) return parseInt(m[1]!, 10) || 0
  return 100 + n.charCodeAt(0)
}
