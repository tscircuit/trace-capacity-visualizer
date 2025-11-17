
import { CapacityNode3dDebugger } from './lib/CapacityNode3dDebugger'
import type { CapacityMeshNode } from './lib/types'

// Simple test data
const testNodes: CapacityMeshNode[] = [
  {
    capacityMeshNodeId: "test_node_1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    layer: "top",
    availableZ: [0, 1, 2]
  },
  {
    capacityMeshNodeId: "test_node_2",
    center: { x: 15, y: 0 },
    width: 8,
    height: 8,
    layer: "top",
    availableZ: [0, 1]
  },
  {
    capacityMeshNodeId: "test_node_3",
    center: { x: 0, y: 15 },
    width: 12,
    height: 6,
    layer: "inner1",
    availableZ: [1, 2, 3]
  }
]

function TestComponent() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Capacity Node 3D Debugger Test</h1>
      <CapacityNode3dDebugger
        nodes={testNodes}
        layerThickness={2}
        height={500}
        defaultShowRoot={true}
        defaultShowOutput={true}
      />
    </div>
  )
}

export default TestComponent