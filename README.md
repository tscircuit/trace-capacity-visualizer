# CapacityNode3dDebugger

A React component for visualizing capacity mesh nodes in 3D space using Three.js.

## Features

- 3D visualization of capacity mesh nodes
- Interactive controls for orbiting, zooming, and panning
- Layer-based visualization with customizable thickness
- Toggle options for different visual elements (root, obstacles, output)
- Wireframe and solid rendering modes
- Opacity controls for mesh visualization
- Box shrinking for better spatial visualization
- Border highlighting for mesh boxes

## Usage

```tsx
import { CapacityNode3dDebugger } from './lib/CapacityNode3dDebugger'
import type { CapacityMeshNode } from './lib/types'

const nodes: CapacityMeshNode[] = [
  {
    capacityMeshNodeId: "node1",
    center: { x: 0, y: 0 },
    width: 10,
    height: 10,
    layer: "top",
    availableZ: [0, 1, 2]
  }
  // ... more nodes
]

function App() {
  return (
    <CapacityNode3dDebugger
      nodes={nodes}
      layerThickness={1}
      height={600}
      defaultShowRoot={true}
      defaultShowObstacles={false}
      defaultShowOutput={true}
      defaultWireframeOutput={false}
    />
  )
}
```

## Props

- `nodes`: Array of capacity mesh nodes to visualize
- `simpleRouteJson`: Optional SimpleRouteJson data for obstacles and bounds
- `layerThickness`: Visual Z thickness per layer (default: 1)
- `height`: Canvas height (default: 600)
- `defaultShowRoot`: Show root bounds initially (default: true)
- `defaultShowObstacles`: Show obstacles initially (default: false)
- `defaultShowOutput`: Show output mesh initially (default: true)
- `defaultWireframeOutput`: Use wireframe for output initially (default: false)
- `style`: Optional CSS styles for the container

## Controls

- **Show 3D/Hide 3D**: Toggle 3D visualization
- **Rebuild 3D**: Rebuild the 3D scene
- **Root**: Toggle root bounds visibility
- **Obstacles**: Toggle obstacles visibility
- **Output**: Toggle output mesh visibility
- **Wireframe Output**: Toggle between solid and wireframe rendering
- **Opacity**: Adjust mesh opacity (0-1)
- **Shrink boxes**: Enable box shrinking for better visualization
- **Show borders**: Toggle border highlighting on mesh boxes

## Mouse Controls

- **Drag**: Orbit camera
- **Wheel**: Zoom in/out
- **Right-drag**: Pan camera