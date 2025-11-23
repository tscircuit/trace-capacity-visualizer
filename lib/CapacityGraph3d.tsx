import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type { CapacityMeshNode, CapacityMeshEdge } from "./types"
import { canonicalizeLayerOrder } from "../utils/canonicalizeLayerOrder"

type CapacityGraph3dProps = {
  nodes: CapacityMeshNode[]
  edges: CapacityMeshEdge[]
  height?: number
  layerSpacing?: number
  nodeSize?: number
  style?: React.CSSProperties
}

export const CapacityGraph3d: React.FC<CapacityGraph3dProps> = ({
  nodes,
  edges,
  height = 600,
  layerSpacing = 5,
  nodeSize = 0.2,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const destroyRef = useRef<() => void>(() => {})

  // State for interaction
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Refs to access scene objects for style updates without full rebuild
  const nodesGroupRef = useRef<THREE.Group | null>(null)
  const edgesGroupRef = useRef<THREE.Group | null>(null)
  
  // Map for O(1) adjacency lookups
  // NodeID -> Set of Neighbor NodeIDs
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    
    // Initialize sets
    for (const node of nodes) {
      map.set(node.capacityMeshNodeId, new Set())
    }

    // Populate
    for (const edge of edges) {
      const [idA, idB] = edge.nodeIds
      
      if (!map.has(idA)) map.set(idA, new Set())
      if (!map.has(idB)) map.set(idB, new Set())

      map.get(idA)?.add(idB)
      map.get(idB)?.add(idA)
    }
    return map
  }, [nodes, edges])

  // Pre-calculate layer mapping for Z-height
  const layerOrder = useMemo(() => {
    const manualLayers = nodes.map(n => n.layer)
    return canonicalizeLayerOrder(manualLayers)
  }, [nodes])

  const getLayerIndex = (node: CapacityMeshNode) => {
    if (node.availableZ && node.availableZ.length > 0) {
      return Math.min(...node.availableZ)
    }
    const idx = layerOrder.indexOf(node.layer)
    return idx >= 0 ? idx : 0
  }

  // 1. Main Scene Setup Effect (Runs on Mount or Data Change)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    destroyRef.current?.()

    const w = el.clientWidth || 800
    const h = el.clientHeight || height

    // Scene Setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f4f8)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.position.set(20, 20, 20)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    el.innerHTML = ""
    el.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(10, 20, 10)
    scene.add(dirLight)

    // Groups
    const nodesGroup = new THREE.Group()
    const edgesGroup = new THREE.Group()
    scene.add(nodesGroup)
    scene.add(edgesGroup)
    
    nodesGroupRef.current = nodesGroup
    edgesGroupRef.current = edgesGroup

    // Helpers
    scene.add(new THREE.AxesHelper(5))

    // --- Build Nodes ---
    const sphereGeom = new THREE.SphereGeometry(nodeSize, 16, 16)
    const nodePositions = new Map<string, THREE.Vector3>()

    // Layer Colors
    const layerColors = [
      0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0xec4899
    ]

    // Bounds
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    nodes.forEach(node => {
      const layerIdx = getLayerIndex(node)
      const px = node.center.x
      const pz = node.center.y
      const py = layerIdx * -layerSpacing

      const pos = new THREE.Vector3(px, py, pz)
      nodePositions.set(node.capacityMeshNodeId, pos)

      minX = Math.min(minX, px); maxX = Math.max(maxX, px)
      minY = Math.min(minY, py); maxY = Math.max(maxY, py)
      minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz)

      const color = layerColors[layerIdx % layerColors.length]
      
      // Important: Unique material per node to control opacity individually
      const mat = new THREE.MeshPhongMaterial({ 
        color, 
        transparent: true, 
        opacity: 1.0 
      })
      const mesh = new THREE.Mesh(sphereGeom, mat)
      mesh.position.copy(pos)
      mesh.userData = { nodeId: node.capacityMeshNodeId }
      nodesGroup.add(mesh)
    })

    // --- Build Edges ---
    edges.forEach(edge => {
      const [idA, idB] = edge.nodeIds
      const posA = nodePositions.get(idA)
      const posB = nodePositions.get(idB)

      if (posA && posB) {
        const pts = [posA, posB]
        const geom = new THREE.BufferGeometry().setFromPoints(pts)
        
        // Unique material for edge interactivity
        const lineMat = new THREE.LineBasicMaterial({ 
          color: 0x64748b, 
          transparent: true, 
          opacity: 0.4 
        })
        
        const line = new THREE.Line(geom, lineMat)
        // Store nodeIds to check connectivity later
        line.userData = { nodeIds: edge.nodeIds } 
        edgesGroup.add(line)
      }
    })

    // --- Camera Fit ---
    if (nodes.length > 0) {
      const center = new THREE.Vector3(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2
      )
      const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
      const dist = span * 1.5 + 10

      controls.target.copy(center)
      camera.position.set(center.x, center.y + dist, center.z + dist)
      camera.lookAt(center)
      controls.update()
    }

    // --- Interaction (Raycaster) ---
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const onClick = (event: MouseEvent) => {
      // Account for canvas offset/position
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)

      // Intersect nodes
      const intersects = raycaster.intersectObjects(nodesGroup.children)

      if (intersects.length > 0) {
        const hit = intersects[0]
        const nodeId = hit?.object.userData.nodeId
        if (nodeId) {
          setSelectedNodeId(nodeId)
          return
        }
      }

      // Check if background (no node hit) -> Reset
      setSelectedNodeId(null)
    }

    renderer.domElement.addEventListener('click', onClick)

    // --- Animation Loop ---
    let rafId = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // --- Resize Handler ---
    const onResize = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H)
    }
    window.addEventListener("resize", onResize)

    // Cleanup
    destroyRef.current = () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", onResize)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.dispose()
      el.innerHTML = ""
      nodesGroupRef.current = null
      edgesGroupRef.current = null
    }
  }, [nodes, edges, height, layerSpacing, nodeSize, layerOrder])


  // 2. Visual Style Update Effect (Runs on Selection Change)
  useEffect(() => {
    const nodesGroup = nodesGroupRef.current
    const edgesGroup = edgesGroupRef.current
    
    if (!nodesGroup || !edgesGroup) return

    // If nothing selected, reset to default
    if (!selectedNodeId) {
      nodesGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh
        const mat = mesh.material as THREE.MeshPhongMaterial
        mat.opacity = 1.0
      })
      edgesGroup.children.forEach((child) => {
        const line = child as THREE.Line
        const mat = line.material as THREE.LineBasicMaterial
        mat.opacity = 0.4
      })
      return
    }

    // Identify Neighbors
    const neighbors = adjacencyMap.get(selectedNodeId) || new Set()
    
    // Update Nodes
    nodesGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshPhongMaterial
      const id = mesh.userData.nodeId
      
      const isFocus = id === selectedNodeId || neighbors.has(id)
      mat.opacity = isFocus ? 1.0 : 0.1
    })

    // Update Edges
    edgesGroup.children.forEach((child) => {
      const line = child as THREE.Line
      const mat = line.material as THREE.LineBasicMaterial
      const [idA, idB] = line.userData.nodeIds
      
      // Check if edge connects directly to the selected node
      // (Or should we highlight edges between neighbors too? User said "directly connected with it")
      // "directly connected with [the clicked node]" implies edges touching selectedNodeId.
      const isConnectedToSelected = idA === selectedNodeId || idB === selectedNodeId
      
      mat.opacity = isConnectedToSelected ? 1.0 : 0.05
    })

  }, [selectedNodeId, adjacencyMap])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: "100%", 
        height, 
        borderRadius: 8, 
        overflow: "hidden",
        border: "1px solid #cbd5e1",
        position: 'relative',
        ...style 
      }} 
    >
      {/* Instruction overlay */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        background: 'rgba(255,255,255,0.8)',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        color: '#334155',
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        {selectedNodeId 
          ? <span>Node <strong>{selectedNodeId}</strong> selected. Click background to reset.</span>
          : <span>Click a node to highlight neighbors.</span>
        }
      </div>
    </div>
  )
}
