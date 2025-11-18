export function contiguousRuns(nums: number[]) {
  const zs = Array.from(new Set(nums)).sort((a, b) => a - b)
  if (zs.length === 0) return [] as number[][]
  const groups: number[][] = []
  let run: number[] = [zs[0]!]
  for (let i = 1; i < zs.length; i++) {
    if (zs[i] === zs[i - 1]! + 1) run.push(zs[i]!)
    else {
      groups.push(run)
      run = [zs[i]!]
    }
  }
  groups.push(run)
  return groups
}
