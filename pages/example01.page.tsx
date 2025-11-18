import { CapacityNode3dDebugger } from "../lib/CapacityNode3dDebugger"
import type { CapacityMeshNode, SimpleRouteJson } from "../lib/types"

import example01 from "../test-assets/example01.json"

export default function Example01() {
  const calculateBoundsFromNodes = (nodes: CapacityMeshNode[]) => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity

    nodes.forEach((node) => {
      const halfWidth = node.width / 2
      const halfHeight = node.height / 2

      minX = Math.min(minX, node.center.x - halfWidth)
      maxX = Math.max(maxX, node.center.x + halfWidth)
      minY = Math.min(minY, node.center.y - halfHeight)
      maxY = Math.max(maxY, node.center.y + halfHeight)
    })

    // Add some padding
    const padding = 2
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    }
  }

  const nodes = (example01.meshNodes || []) as CapacityMeshNode[]
  const bounds = calculateBoundsFromNodes(nodes)
  const simpleRouteJson: SimpleRouteJson = {
    layerCount: 4, // Based on availableZ values in the data
    minTraceWidth: 0.1,
    obstacles: [],
    connections: [],
    bounds: bounds,
  }

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
            borderBottom: "2px solid #3498db",
            paddingBottom: "10px",
          }}
        >
          Capacity Node 3D Debugger - Example 01
        </h1>

        <CapacityNode3dDebugger
          nodes={nodes}
          simpleRouteJson={simpleRouteJson}
          layerThickness={1}
          height={600}
          defaultShowObstacles={false}
          defaultWireframeOutput={false}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "15px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        />
      </div>
    </div>
  )
}