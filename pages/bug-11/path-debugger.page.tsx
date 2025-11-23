import { CapacityPathDebugger } from "../../lib/CapacityPathDebugger"
import initialPathingSolver from "../../test-assets/bug-11/initial_pathing_solver.json"
import pathingOptimizerInput from "../../test-assets/bug-11/pathingOptimizer_input.json"

export default function PathDebuggerPage() {
  // The JSON file is an array, so we get the first element
  const pathingSolverResult = (initialPathingSolver as any)[0]
  const { nodes, edges } = pathingSolverResult
  const precalculatedPaths = pathingOptimizerInput[0]?.initialPathingSolver.connectionsWithNodes

  if (!nodes || !edges) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ color: "#dc2626" }}>Error Loading Data</h1>
        <p>Could not load nodes and edges from initial_pathing_solver.json</p>
        <pre style={{ background: "#f3f4f6", padding: 10, borderRadius: 4 }}>
          Data structure: {JSON.stringify({ hasNodes: !!nodes, hasEdges: !!edges, dataKeys: Object.keys(pathingSolverResult || {}) }, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20, color: "#1f2937" }}>
        Path Debugger - Bug 11 Dataset
      </h1>
      
      <div style={{ marginBottom: 16, color: "#6b7280", fontSize: 14 }}>
        Interactive path visualization using nodes/edges from initial_pathing_solver.json (146 nodes, 344 edges)
        and precalculated routes from pathingOptimizer_input.json (73 connections).
        Enable "Path Debug" and select connections to highlight start/end points (yellow) and paths.
      </div>

      <CapacityPathDebugger
        nodes={nodes}
        edges={edges}
        height={800}
        layerThickness={1.2}
        layerGap={0}
        nodeSize={0.25}
        precalculatedPaths={precalculatedPaths}
      />
    </div>
  )
}