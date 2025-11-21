import { CapacityGraph3d } from "../../lib/CapacityGraph3d"
import type { CapacityMeshNode, CapacityMeshEdge } from "../../lib/types"
import bug11Data from "../../test-assets/bug-1/initial_pathing_solver_input.json"

export default function Bug11GraphVisualizer() {
  const data = bug11Data[0]

  if (!data) {
    return <div>No data found</div>
  }

  const nodes = (data.nodes || []) as CapacityMeshNode[]
  const edges = (data.edges || []) as CapacityMeshEdge[]

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          padding: "20px",
        }}
      >
        <h1
          style={{
            marginBottom: "20px",
            color: "#2c3e50",
            borderBottom: "2px solid #8b5cf6", // Purple for graph view
            paddingBottom: "10px",
          }}
        >
          Capacity Graph 3D - Bug 11 Topology
        </h1>

        <div style={{ marginBottom: "15px", color: "#666" }}>
          <p>Visualizing connectivity graph for <code>bug-11</code>.</p>
          <p>
            <strong>Nodes:</strong> {nodes.length} | <strong>Edges:</strong> {edges.length}
          </p>
          <p style={{ fontSize: "0.9em", color: "#888" }}>
            Layers are separated vertically. Blue = Top, Green = Inner/Bottom layers.
          </p>
        </div>

        <CapacityGraph3d
          nodes={nodes}
          edges={edges}
          height={700}
          layerSpacing={5}
          nodeSize={0.3}
          style={{
            backgroundColor: "white",
          }}
        />
      </div>
    </div>
  )
}
