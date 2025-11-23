import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type { CapacityMeshNode, CapacityMeshEdge } from "./types"
import { canonicalizeLayerOrder } from "../utils/canonicalizeLayerOrder"
import { buildPrismsFromNodes } from "../utils/buildPrismsFromNodes"
import { createColorAssigner, LAYER_PALETTE } from "../utils/layerPalette"
import { darkenColor } from "../utils/darkenColor"
import { disposeObject } from "../utils/threeUtils"

export type DebugPathData = {
  start?: { x: number; y: number; layer: string }
  end?: { x: number; y: number; layer: string }
  path?: Array<{ x: number; y: number; layer: string; isObstacle?: boolean }>
}

type CapacityHybridViewProps = {
  nodes: CapacityMeshNode[]
  edges: CapacityMeshEdge[]
  height?: number
  layerThickness?: number
  layerGap?: number
  nodeSize?: number
  debugPath?: DebugPathData | null
  style?: React.CSSProperties
  visibleLayers?: string[]
}



export const CapacityHybridView: React.FC<CapacityHybridViewProps> = ({
  nodes,
  edges,
  height = 600,
  layerThickness = 1,
  layerGap = 0,
  nodeSize = 0.3,
  debugPath,
  style,
  visibleLayers,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const destroyRef = useRef<() => void>(() => {})

  // State for interaction
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // State for Visibility Controls
  const [showMesh, setShowMesh] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const [showEdges, setShowEdges] = useState(true)

  // Refs for style updates
  const graphNodesGroupRef = useRef<THREE.Group | null>(null)
  const graphEdgesGroupRef = useRef<THREE.Group | null>(null)
  const meshGroupRef = useRef<THREE.Group | null>(null)
  const debugPathGroupRef = useRef<THREE.Group | null>(null)

  // --- Data Processing ---

  // 1. Graph Adjacency
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    if (!nodes) return map
    for (const node of nodes) map.set(node.capacityMeshNodeId, new Set())
    if (!edges) return map
    for (const edge of edges) {
      const [idA, idB] = edge.nodeIds
      if (!map.has(idA)) map.set(idA, new Set())
      if (!map.has(idB)) map.set(idB, new Set())
      map.get(idA)?.add(idB)
      map.get(idB)?.add(idA)
    }
    return map
  }, [nodes, edges])

  // 2. Layer ordering
  const layerOrder = useMemo(() => {
    if (!nodes || nodes.length === 0) return []
    const manualLayers = nodes.map(n => n.layer)
    return canonicalizeLayerOrder(manualLayers)
  }, [nodes])
  const layerCount = Math.max(layerOrder.length, 4) 

  const getLayerIndex = (node: CapacityMeshNode) => {
    if (node.availableZ && node.availableZ.length > 0) return Math.min(...node.availableZ)
    const idx = layerOrder.indexOf(node.layer)
    return idx >= 0 ? idx : 0
  }

  // Helper function to calculate Y position with layer gap
  const getLayerYPosition = (layerIdx: number) => {
    return -(layerIdx + 0.5) * layerThickness - layerIdx * layerGap
  }

  // 3. Mesh Prisms
  const prisms = useMemo(
    () => buildPrismsFromNodes(nodes, layerCount),
    [nodes, layerCount]
  )

  // --- Scene Setup ---
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    destroyRef.current?.()

    const w = el.clientWidth || 800
    const h = el.clientHeight || height

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    el.innerHTML = ""
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf7f8fa)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000)
    
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
    dirLight.position.set(10, 20, 10)
    scene.add(dirLight)

    const meshGroup = new THREE.Group() 
    const debugPathGroup = new THREE.Group()
    const graphNodesGroup = new THREE.Group() 
    const graphEdgesGroup = new THREE.Group() 
    
    scene.add(meshGroup)
    scene.add(debugPathGroup)
    scene.add(graphEdgesGroup)
    scene.add(graphNodesGroup)

    meshGroupRef.current = meshGroup
    debugPathGroupRef.current = debugPathGroup
    graphNodesGroupRef.current = graphNodesGroup
    graphEdgesGroupRef.current = graphEdgesGroup

    scene.add(new THREE.AxesHelper(5))

    const assigner = createColorAssigner()

    // Optimization: Shared Geometry for boxes
    // By scaling a unit box, we avoid creating hundreds of unique BufferGeometries
    const unitBoxGeom = new THREE.BoxGeometry(1, 1, 1)
    const unitEdgesGeom = new THREE.EdgesGeometry(unitBoxGeom)

    // --- 1. Render Mesh (Boxes) ---
    for (const p of prisms) {
      const dx = p.maxX - p.minX
      const dz = p.maxY - p.minY
      const dy = (p.z1 - p.z0) * layerThickness

      const cx = (p.minX + p.maxX) / 2
      const cz = (p.minY + p.maxY) / 2
      const avgLayerIdx = (p.z0 + p.z1) / 2
      const cy = -(avgLayerIdx * layerThickness + avgLayerIdx * layerGap)

      const color = assigner(`${p.z0}-${p.z1}`)

      // Create Mesh from Shared Geometry
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        opacity: 0.15,
        transparent: true,
        depthWrite: false, 
        side: THREE.DoubleSide
      })
      const mesh = new THREE.Mesh(unitBoxGeom, mat)
      mesh.position.set(cx, cy, cz)
      mesh.scale.set(dx, dy, dz) // Scale to fit
      meshGroup.add(mesh)

      // Create Edges from Shared Geometry
      const edgesMat = new THREE.LineBasicMaterial({ 
        color: darkenColor(color, 0.6), 
        transparent: true, 
        opacity: 0.4 
      })
      const boxLines = new THREE.LineSegments(unitEdgesGeom, edgesMat)
      boxLines.position.set(cx, cy, cz)
      boxLines.scale.set(dx, dy, dz) // Scale to fit
      meshGroup.add(boxLines)
    }

    // --- 2. Render Graph ---
    const sphereGeom = new THREE.SphereGeometry(nodeSize, 16, 16)
    const nodePositions = new Map<string, THREE.Vector3>()
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity

    if (!nodes) return

    nodes.forEach(node => {
      // Skip node if layer filtering is enabled and this layer is not visible
      if (visibleLayers && !visibleLayers.includes(node.layer)) {
        return
      }

      const layerIdx = getLayerIndex(node)
      const px = node.center.x 
      const pz = node.center.y  
      const py = getLayerYPosition(layerIdx) 

      const pos = new THREE.Vector3(px, py, pz)
      nodePositions.set(node.capacityMeshNodeId, pos)

      minX = Math.min(minX, px); maxX = Math.max(maxX, px)
      minY = Math.min(minY, py); maxY = Math.max(maxY, py)
      minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz)

      let color = LAYER_PALETTE[layerIdx % LAYER_PALETTE.length]
      if (node._completelyInsideObstacle || node._containsObstacle) {
        color = 0xef4444
      }
      // We must clone material (create new instance) to allow individual opacity control
      const mat = new THREE.MeshPhongMaterial({ color })
      const mesh = new THREE.Mesh(sphereGeom, mat)
      mesh.position.copy(pos)
      mesh.userData = { nodeId: node.capacityMeshNodeId }
      graphNodesGroup.add(mesh)
    })

    const lineMatTemplate = new THREE.LineBasicMaterial({ 
      color: 0x334155, 
      transparent: true, 
      opacity: 0.6 
    })

    if (!edges) return

    edges.forEach(edge => {
      const [idA, idB] = edge.nodeIds
      const posA = nodePositions.get(idA)
      const posB = nodePositions.get(idB)

      if (posA && posB) {
        const geom = new THREE.BufferGeometry().setFromPoints([posA, posB])
        // New material instance for highlighting
        const line = new THREE.Line(geom, lineMatTemplate.clone()) 
        line.userData = { nodeIds: edge.nodeIds }
        graphEdgesGroup.add(line)
      }
    })

    if (nodes.length > 0) {
      const center = new THREE.Vector3((minX + maxX)/2, (minY + maxY)/2, (minZ + maxZ)/2)
      const dist = Math.max(maxX - minX, maxZ - minZ) * 1.5 + 10
      controls.target.copy(center)
      camera.position.set(center.x, center.y + dist, center.z + dist)
      camera.lookAt(center)
      controls.update()
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const onClick = (e: MouseEvent) => {
      if (!graphNodesGroupRef.current?.visible) return

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObjects(graphNodesGroup.children)
      if (intersects.length > 0) {
        setSelectedNodeId(intersects[0]!.object.userData.nodeId)
      } else {
        setSelectedNodeId(null)
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    let rafId = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H)
    }
    window.addEventListener("resize", onResize)

    destroyRef.current = () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", onResize)
      renderer.domElement.removeEventListener('click', onClick)
      
      // Aggressive Cleanup
      disposeObject(scene)
      
      // Don't dispose shared geometries that might be reused? 
      // The unitBoxGeom and unitEdgesGeom are local to this effect scope, so they MUST be disposed.
      unitBoxGeom.dispose()
      unitEdgesGeom.dispose()
      sphereGeom.dispose()
      lineMatTemplate.dispose()

      renderer.dispose()
      el.innerHTML = ""
    }
  }, [nodes, edges, height, layerThickness, layerGap, nodeSize, layerOrder, prisms, visibleLayers])

  // --- Debug Path Rendering ---
  useEffect(() => {
    const group = debugPathGroupRef.current
    if (!group) return
    
    while(group.children.length > 0) {
       const child = group.children[0]
       if (child) {
         group.remove(child)
         if ((child as any).geometry) (child as any).geometry.dispose()
         if ((child as any).material) (child as any).material.dispose()
       }
    }

    if (!debugPath) return

    const getPos = (x: number, y: number, layer: string) => {
        const idx = layerOrder.indexOf(layer)
        const layerIdx = idx >= 0 ? idx : 0
        return new THREE.Vector3(
            x,
            getLayerYPosition(layerIdx),
            y
        )
    }

    // Render path line in yellow
    if (debugPath.path && debugPath.path.length > 1) {
       const points = debugPath.path.map(p => getPos(p.x, p.y, p.layer))
       const geom = new THREE.BufferGeometry().setFromPoints(points)
       const mat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 })
       const line = new THREE.Line(geom, mat)
       group.add(line)
    }

    // Render yellow spheres for each path node
    if (debugPath.path && debugPath.path.length > 0) {
      const sphereGeom = new THREE.SphereGeometry(nodeSize * 1.2, 16, 16)
      const sphereMatYellow = new THREE.MeshStandardMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 0.8,
        emissive: 0xaaaa00,
        emissiveIntensity: 0.1 
      })
      const sphereMatRed = new THREE.MeshStandardMaterial({ 
        color: 0xef4444, 
        transparent: true, 
        opacity: 0.8,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.1 
      })
      
      debugPath.path.forEach(pathNode => {
        const mat = pathNode.isObstacle ? sphereMatRed : sphereMatYellow
        const sphere = new THREE.Mesh(sphereGeom, mat)
        sphere.position.copy(getPos(pathNode.x, pathNode.y, pathNode.layer))
        group.add(sphere)
      })
    }

    const markerGeom = new THREE.BoxGeometry(nodeSize*1.5, nodeSize*1.5, nodeSize*1.5)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00, emissiveIntensity: 0.2 })

    if (debugPath.start) {
        const m = new THREE.Mesh(markerGeom, markerMat)
        m.position.copy(getPos(debugPath.start.x, debugPath.start.y, debugPath.start.layer))
        group.add(m)
    }
    if (debugPath.end) {
        const m = new THREE.Mesh(markerGeom, markerMat)
        m.position.copy(getPos(debugPath.end.x, debugPath.end.y, debugPath.end.layer))
        group.add(m)
    }

  }, [debugPath, layerOrder, layerThickness, layerGap, nodeSize])

  // --- Style Updates ---
  useEffect(() => {
    const gNodes = graphNodesGroupRef.current
    const gEdges = graphEdgesGroupRef.current
    const meshGroup = meshGroupRef.current
    if (!gNodes || !gEdges || !meshGroup) return

    // Optimized Loop: Avoid redundant assignments if state matches? 
    // Three.js doesn't mind redundant value assignment much, but logic check helps.

    if (!selectedNodeId) {
      gNodes.children.forEach(c => {
        const mesh = c as THREE.Mesh
        const mat = mesh.material as THREE.MeshPhongMaterial
        if (mat.opacity !== 1.0) mat.opacity = 1.0
      })
      gEdges.children.forEach(c => {
        const line = c as THREE.Line
        const mat = line.material as THREE.LineBasicMaterial
        if (mat.opacity !== 0.6) mat.opacity = 0.6
      })
      meshGroup.children.forEach(c => {
        if (c.type === 'Mesh') {
          const mesh = c as THREE.Mesh
          const mat = mesh.material as THREE.MeshPhongMaterial
          if (mat.opacity !== 0.15) mat.opacity = 0.15
        }
        if (c.type === 'LineSegments') {
          const line = c as THREE.LineSegments
          const mat = line.material as THREE.LineBasicMaterial
          if (mat.opacity !== 0.4) mat.opacity = 0.4
        }
      })
      return
    }

    const neighbors = adjacencyMap.get(selectedNodeId) || new Set()

    gNodes.children.forEach(c => {
      const mesh = c as THREE.Mesh
      const mat = mesh.material as THREE.MeshPhongMaterial
      const id = mesh.userData.nodeId
      const isFocus = id === selectedNodeId || neighbors.has(id)
      const targetOpacity = isFocus ? 1.0 : 0.1
      if (mat.opacity !== targetOpacity) mat.opacity = targetOpacity
    })

    gEdges.children.forEach(c => {
      const line = c as THREE.Line
      const mat = line.material as THREE.LineBasicMaterial
      const [a, b] = line.userData.nodeIds
      const isConnectedToSelected = a === selectedNodeId || b === selectedNodeId
      const targetOpacity = isConnectedToSelected ? 1.0 : 0.05
      if (mat.opacity !== targetOpacity) mat.opacity = targetOpacity
    })

  }, [selectedNodeId, adjacencyMap])

  // --- Visibility Updates ---
  useEffect(() => {
    if (meshGroupRef.current) meshGroupRef.current.visible = showMesh
    if (graphNodesGroupRef.current) graphNodesGroupRef.current.visible = showNodes
    if (graphEdgesGroupRef.current) graphEdgesGroupRef.current.visible = showEdges
  }, [showMesh, showNodes, showEdges])

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #cbd5e1",
        position: "relative",
        ...style,
      }}
    >
      {/* The Three.js Canvas Container */}
      <div 
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* UI Control Panel */}
      <div style={{
        position: 'absolute',
        top: 10, 
        left: 10,
        background: 'rgba(255,255,255,0.9)',
        padding: '8px', 
        borderRadius: 4,
        fontSize: 12, 
        color: '#334155',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 10
      }}>
        <strong style={{ marginBottom: 4 }}>Visibility Controls</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input 
            type="checkbox" 
            checked={showMesh} 
            onChange={e => setShowMesh(e.target.checked)} 
          /> 
          Show Box (Mesh)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input 
            type="checkbox" 
            checked={showNodes} 
            onChange={e => setShowNodes(e.target.checked)} 
          /> 
          Show Nodes
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input 
            type="checkbox" 
            checked={showEdges} 
            onChange={e => setShowEdges(e.target.checked)} 
          /> 
          Show Edges
        </label>
        
        {selectedNodeId && (
          <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
            <div>Selected: <strong>{selectedNodeId}</strong></div>
            <button 
              onClick={() => setSelectedNodeId(null)}
              style={{
                marginTop: 4,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: 11,
                width: '100%'
              }}
            >
              Reset Selection
            </button>
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 10, left: 10,
        background: 'rgba(255,255,255,0.5)',
        padding: '2px 6px', borderRadius: 4,
        fontSize: 10, color: '#64748b',
        pointerEvents: 'none'
      }}>
        Click nodes to inspect connectivity.
      </div>
    </div>
  )
}
