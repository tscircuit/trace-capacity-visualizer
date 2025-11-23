import { useState, useMemo } from "react"
import type { CapacityMeshNode, CapacityMeshEdge, PathingInputConnection } from "./types"
import { CapacityHybridView, type DebugPathData } from "./CapacityHybridView"
import { 
  convertConnectionToDebugPath, 
  getConnectionDisplayName 
} from "../utils/pathingDebug"

type CapacityPathDebuggerProps = {
  nodes: CapacityMeshNode[]
  edges: CapacityMeshEdge[]
  height?: number
  layerThickness?: number
  nodeSize?: number
  style?: React.CSSProperties
  precalculatedPaths?: PathingInputConnection[]
}

export const CapacityPathDebugger: React.FC<CapacityPathDebuggerProps> = ({
  nodes,
  edges,
  height = 600,
  layerThickness = 1,
  nodeSize = 0.3,
  style,
  precalculatedPaths,
}) => {
  const [enablePaths, setEnablePaths] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Generate connection options for dropdown, sorted by path length
  const connectionOptions = useMemo(() => {
    if (!precalculatedPaths) return []
    
    return precalculatedPaths
      .map((conn, index) => ({
        value: index,
        originalIndex: index,
        label: `${getConnectionDisplayName(conn, index)} (${conn.path.length} nodes)`,
        pathLength: conn.path.length
      }))
      .sort((a, b) => a.pathLength - b.pathLength)
      .map((option, sortedIndex) => ({
        ...option,
        value: sortedIndex // Use sorted index as the value
      }))
  }, [precalculatedPaths])

  // Convert selected connection to debug path data
  const debugPath: DebugPathData | null = useMemo(() => {
    if (!enablePaths || !precalculatedPaths || !precalculatedPaths.length) {
      return null
    }

    // Find the selected connection option and get its original index
    const selectedOption = connectionOptions[selectedIndex]
    if (!selectedOption) return null

    const connection = precalculatedPaths[selectedOption.originalIndex]
    if (!connection) return null
    return convertConnectionToDebugPath(connection)
  }, [enablePaths, precalculatedPaths, selectedIndex, connectionOptions])

  return (
    <div style={{ position: 'relative', ...style }}>
      <CapacityHybridView
        nodes={nodes}
        edges={edges}
        height={height}
        layerThickness={layerThickness}
        nodeSize={nodeSize}
        debugPath={debugPath}
        style={style}
      />
      
      {/* Path Debug Controls */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(255,255,255,0.9)',
        padding: '8px',
        borderRadius: 4,
        fontSize: 12,
        color: '#334155',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 10,
        minWidth: 200
      }}>
        <strong style={{ marginBottom: 4 }}>Path Debugger</strong>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={enablePaths}
            onChange={e => setEnablePaths(e.target.checked)}
          />
          Enable Path Debug
        </label>

        {enablePaths && (
          <>
            {!precalculatedPaths && (
              <div style={{ color: '#6b7280' }}>No precalculated paths provided</div>
            )}

            {precalculatedPaths && precalculatedPaths.length === 0 && (
              <div style={{ color: '#6b7280' }}>No connections available</div>
            )}

            {precalculatedPaths && precalculatedPaths.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 'bold' }}>
                  Select Connection:
                </label>
                <select
                  value={selectedIndex}
                  onChange={e => setSelectedIndex(Number(e.target.value))}
                  style={{
                    padding: '4px',
                    borderRadius: 2,
                    border: '1px solid #d1d5db',
                    fontSize: 11,
                    background: 'white'
                  }}
                >
                  {connectionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                {debugPath && (
                  <div style={{ 
                    fontSize: 10, 
                    color: '#6b7280', 
                    padding: '4px',
                    background: '#f9fafb',
                    borderRadius: 2
                  }}>
                    Path nodes: {debugPath.path?.length || 0}
                    <br />
                    Start: ({debugPath.start?.x.toFixed(1)}, {debugPath.start?.y.toFixed(1)}) {debugPath.start?.layer}
                    <br />
                    End: ({debugPath.end?.x.toFixed(1)}, {debugPath.end?.y.toFixed(1)}) {debugPath.end?.layer}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}