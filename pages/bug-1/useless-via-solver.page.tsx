import { UselessViaSolverView } from "../../lib/UselessViaSolverView"
import rawData from "../../test-assets/bug-1/uselessViaRemovalSolver1_input.json"
import type { UselessViaSolverInput } from "../../lib/types"

export default function UselessViaSolverPage() {
  const data = rawData[0] as any as UselessViaSolverInput
  
  if (!data) return <div>No data</div>

  return (
    <div style={{ height: "100vh", width: "100vw", margin: 0, padding: 0, background: "#f0f0f0" }}>
      <UselessViaSolverView 
        data={data} 
        height={window ? window.innerHeight : 800}
        width="100%"
      />
    </div>
  )
}
