import { useState, useEffect } from "react"
import { CapacityNode3dDebugger } from "../lib/CapacityNode3dDebugger"
import type { CapacityMeshNode, SimpleRouteJson } from "../lib/types"

export default function Example01() {
  const [nodes, setNodes] = useState<CapacityMeshNode[]>([])
  const [simpleRouteJson, setSimpleRouteJson] = useState<SimpleRouteJson | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load the example data from test-assets
    fetch('/test-assets/example01.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load example data: ${response.status} ${response.statusText}`)
        }
        return response.json()
      })
      .then(data => {
        // The example data contains meshNodes directly
        if (data.meshNodes && Array.isArray(data.meshNodes)) {
          setNodes(data.meshNodes)
          
          // Create a simple route json with bounds based on the nodes
          if (data.meshNodes.length > 0) {
            const bounds = calculateBoundsFromNodes(data.meshNodes)
            const mockSimpleRouteJson: SimpleRouteJson = {
              layerCount: 4, // Based on availableZ values in the data
              minTraceWidth: 0.1,
              obstacles: [],
              connections: [],
              bounds: bounds
            }
            setSimpleRouteJson(mockSimpleRouteJson)
          }
        } else {
          throw new Error('Invalid data format: meshNodes array not found')
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading example data:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const calculateBoundsFromNodes = (nodes: CapacityMeshNode[]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    
    nodes.forEach(node => {
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
      maxY: maxY + padding
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading example data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e74c3c',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div>
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <p>Make sure the test-assets directory contains example01.json</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        padding: '20px'
      }}>
        <h1 style={{ 
          marginBottom: '20px', 
          color: '#2c3e50',
          borderBottom: '2px solid #3498db',
          paddingBottom: '10px'
        }}>
          Capacity Node 3D Debugger - Example 01
        </h1>
        
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#ecf0f1',
          borderRadius: '6px',
          borderLeft: '4px solid #3498db'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Dataset Information</h3>
          <p style={{ margin: '5px 0', color: '#7f8c8d' }}>
            <strong>Total Nodes:</strong> {nodes.length}
          </p>
          <p style={{ margin: '5px 0', color: '#7f8c8d' }}>
            <strong>Layers:</strong> 4 (based on availableZ values)
          </p>
          <p style={{ margin: '5px 0', color: '#7f8c8d' }}>
            <strong>Bounds:</strong> 
            {simpleRouteJson ? 
              ` X: ${simpleRouteJson.bounds.minX.toFixed(2)} to ${simpleRouteJson.bounds.maxX.toFixed(2)}, ` +
              `Y: ${simpleRouteJson.bounds.minY.toFixed(2)} to ${simpleRouteJson.bounds.maxY.toFixed(2)}` 
              : ' Calculating...'
            }
          </p>
        </div>

        <CapacityNode3dDebugger
          nodes={nodes}
          simpleRouteJson={simpleRouteJson}
          layerThickness={1}
          height={600}
          defaultShowRoot={true}
          defaultShowObstacles={false}
          defaultShowOutput={true}
          defaultWireframeOutput={false}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3cd',
          borderRadius: '6px',
          borderLeft: '4px solid #ffc107'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Usage Instructions</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', color: '#856404' }}>
            <li>Click "Show 3D" to render the 3D visualization</li>
            <li>Use mouse to orbit, wheel to zoom, right-drag to pan</li>
            <li>Toggle different layers and visualization options using the controls</li>
            <li>Adjust opacity and box shrinking for better visualization</li>
          </ul>
        </div>
      </div>
    </div>
  )
}