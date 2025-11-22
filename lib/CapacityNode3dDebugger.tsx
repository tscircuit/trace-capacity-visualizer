import {
  useCallback,
  useEffect,
  useState,
} from "react"
import type { CapacityMeshNode, SimpleRouteJson } from "./types"
import { ThreeBoardView } from "./ThreeBoardView"

type CapacityNode3dDebuggerProps = {
  nodes: CapacityMeshNode[]
  simpleRouteJson?: SimpleRouteJson
  layerThickness?: number
  height?: number
  defaultShowObstacles?: boolean
  defaultWireframeOutput?: boolean
  defaultShowRoot?: boolean
  defaultShowOutput?: boolean
  style?: React.CSSProperties
}

export const CapacityNode3dDebugger: React.FC<CapacityNode3dDebuggerProps> = ({
  nodes: initialNodes,
  simpleRouteJson,
  layerThickness = 1,
  height = 600,
  defaultShowObstacles = false, // don't show obstacles by default
  defaultWireframeOutput = false,
  defaultShowRoot = false,
  defaultShowOutput = true,
  style,
}) => {
  const [nodes, setNodes] = useState(initialNodes)
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes])

  const [show3d, setShow3d] = useState(true)
  const [rebuildKey, setRebuildKey] = useState(0)

  const [showObstacles, setShowObstacles] = useState(defaultShowObstacles)
  const [wireframeOutput, setWireframeOutput] = useState(defaultWireframeOutput)
  const [isOrthographic, setIsOrthographic] = useState(false)

  const [meshOpacity, setMeshOpacity] = useState(0.6)
  const [shrinkBoxes, setShrinkBoxes] = useState(true)
  const [boxShrinkAmount, setBoxShrinkAmount] = useState(0.1)
  const [showBorders, setShowBorders] = useState(true)

  const rebuild = useCallback(() => setRebuildKey((k) => k + 1), [])

  const handleDeleteNodes = useCallback((nodesToDelete: CapacityMeshNode[]) => {
    const nodesToDeleteSet = new Set(nodesToDelete)
    setNodes((currentNodes) =>
      currentNodes.filter((n) => !nodesToDeleteSet.has(n)),
    )
  }, [])

  const handleReset = () => {
    setNodes(initialNodes)
  }

  return (
    <>
      <div style={{ display: "grid", gap: 12, ...style }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={showObstacles}
              onChange={(e) => setShowObstacles(e.target.checked)}
            />
            Obstacles
          </label>
          <label
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={wireframeOutput}
              onChange={(e) => setWireframeOutput(e.target.checked)}
            />
            Wireframe Output
          </label>
          <label
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={isOrthographic}
              onChange={(e) => setIsOrthographic(e.target.checked)}
            />
            Orthographic
          </label>

          {/* Mesh opacity slider */}
          {show3d && (
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginLeft: 8,
                fontSize: 12,
              }}
            >
              Opacity
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={meshOpacity}
                onChange={(e) => setMeshOpacity(parseFloat(e.target.value))}
              />
              <span style={{ width: 32, textAlign: "right" }}>
                {meshOpacity.toFixed(2)}
              </span>
            </label>
          )}

          {/* Shrink boxes option */}
          {show3d && (
            <>
              <label
                style={{
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={shrinkBoxes}
                  onChange={(e) => setShrinkBoxes(e.target.checked)}
                />
                Shrink boxes
              </label>
              {shrinkBoxes && (
                <label
                  style={{
                    display: "inline-flex",
                    gap: 4,
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  amt
                  <input
                    type="number"
                    value={boxShrinkAmount}
                    step={0.05}
                    style={{ width: 60 }}
                    onChange={(e) => {
                      const shrinkAmount = parseFloat(e.target.value)
                      if (Number.isNaN(shrinkAmount)) return
                      setBoxShrinkAmount(Math.max(0, shrinkAmount))
                    }}
                  />
                </label>
              )}
            </>
          )}

          {/* Show borders option */}
          {show3d && (
            <label
              style={{
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <input
                type="checkbox"
                checked={showBorders}
                disabled={wireframeOutput}
                onChange={(e) => setShowBorders(e.target.checked)}
              />
              <span
                style={{
                  opacity: wireframeOutput ? 0.5 : 1,
                }}
              >
                Show borders
              </span>
            </label>
          )}

          {nodes.length !== initialNodes.length && (
            <button
              onClick={handleReset}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Unhide
            </button>
          )}

          <div style={{ fontSize: 12, color: "#334155", marginLeft: 6 }}>
            Drag to orbit · Wheel to zoom · Right-drag to pan
          </div>
        </div>

        {show3d && (
          <ThreeBoardView
            key={rebuildKey}
            nodes={nodes}
            srj={simpleRouteJson}
            layerThickness={layerThickness}
            height={height}
            showRoot={defaultShowRoot}
            showObstacles={showObstacles}
            showOutput={defaultShowOutput}
            wireframeOutput={wireframeOutput}
            meshOpacity={meshOpacity}
            shrinkBoxes={shrinkBoxes}
            boxShrinkAmount={boxShrinkAmount}
            showBorders={showBorders}
            isOrthographic={isOrthographic}
            onDeleteNodes={handleDeleteNodes}
          />
        )}
      </div>

      {/* White margin at bottom of the page */}
      <div style={{ height: 200, background: "#ffffff" }} />
    </>
  )
}
