import { useState, useMemo } from "react"
import type { CapacityMeshNode, CapacityMeshEdge, PathingInputConnection } from "./types"
import { CapacityHybridView, type DebugPathData } from "./CapacityHybridView"
import { 
  convertConnectionToDebugPath, 
  getConnectionDisplayName 
} from "../utils/pathingDebug"
import { LAYER_PALETTE } from "../utils/layerPalette"

type CapacityPathDebuggerProps = {
  nodes: CapacityMeshNode[]
  edges: CapacityMeshEdge[]
  height?: number
  layerThickness?: number
  layerGap?: number
  nodeSize?: number
  style?: React.CSSProperties
  precalculatedPaths?: PathingInputConnection[]
}

export const CapacityPathDebugger: React.FC<CapacityPathDebuggerProps> = ({
  nodes,
  edges,
  height = 600,
  layerThickness = 1,
  layerGap = 0,
  nodeSize = 0.3,
  style,
  precalculatedPaths,
}) => {
  const [enablePaths, setEnablePaths] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [currentLayerGap, setCurrentLayerGap] = useState(layerGap)
  const [visibleLayers, setVisibleLayers] = useState<string[] | null>(null)

  // Get available layers from nodes
  const availableLayers = useMemo(() => {
    return [...new Set(nodes.map(node => node.layer))].sort()
  }, [nodes])

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
        layerGap={currentLayerGap}
        nodeSize={nodeSize}
        debugPath={debugPath}
        style={style}
        visibleLayers={visibleLayers || undefined}
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

        {/* Layer Gap Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 'bold' }}>
            Layer Gap: {currentLayerGap.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={currentLayerGap}
            onChange={(e) => setCurrentLayerGap(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Layer Visibility Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 'bold' }}>
            Visible Layers:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* All Layers Toggle */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              fontSize: 10,
              cursor: 'pointer',
              padding: '2px 0'
            }}>
              <input
                type="checkbox"
                checked={visibleLayers === null}
                onChange={(e) => {
                  if (e.target.checked) {
                    setVisibleLayers(null)
                  } else {
                    setVisibleLayers([])
                  }
                }}
                style={{ margin: 0 }}
              />
              <div style={{
                width: 12,
                height: 12,
                background: 'linear-gradient(90deg, #0ea5e9 0%, #22c55e 25%, #f97316 50%, #a855f7 75%, #facc15 100%)',
                borderRadius: 2,
                border: '1px solid #d1d5db'
              }} />
              <span>All Layers</span>
            </label>

            {/* Individual Layer Toggles */}
            {availableLayers.map((layer, index) => {
              const isVisible = visibleLayers === null || (visibleLayers && visibleLayers.includes(layer))
              const layerColor = LAYER_PALETTE[index % LAYER_PALETTE.length] || 0x808080
              
              return (
                <label key={layer} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: '2px 0',
                  opacity: visibleLayers === null ? 0.7 : 1
                }}>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => {
                      if (visibleLayers === null) {
                        // If showing all layers, create array with all except this one if unchecking
                        if (!e.target.checked) {
                          setVisibleLayers(availableLayers.filter(l => l !== layer))
                        }
                      } else {
                        // If selective mode, add/remove this layer
                        if (e.target.checked) {
                          const newLayers = [...(visibleLayers || []), layer]
                          // If all layers are now selected, switch to "all" mode
                          if (newLayers.length === availableLayers.length) {
                            setVisibleLayers(null)
                          } else {
                            setVisibleLayers(newLayers)
                          }
                        } else {
                          setVisibleLayers((visibleLayers || []).filter(l => l !== layer))
                        }
                      }
                    }}
                    disabled={visibleLayers === null}
                    style={{ margin: 0 }}
                  />
                  <div style={{
                    width: 12,
                    height: 12,
                    backgroundColor: `#${layerColor.toString(16).padStart(6, '0')}`,
                    borderRadius: 2,
                    border: '1px solid #d1d5db'
                  }} />
                  <span style={{ textTransform: 'capitalize' }}>{layer}</span>
                  {visibleLayers && !visibleLayers.includes(layer) && visibleLayers !== null && (
                    <span style={{ color: '#9ca3af' }}>(hidden)</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
        
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