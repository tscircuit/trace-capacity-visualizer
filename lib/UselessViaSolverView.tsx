import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import type { UselessViaSolverInput } from "./types"
import { disposeObject } from "../utils/threeUtils"

type UselessViaSolverViewProps = {
  data: UselessViaSolverInput
  height?: number
  width?: string | number
}

const LAYER_NAMES = ["top", "inner1", "inner2", "bottom"]

// Helper component for Number Input with +/- buttons
const NumberInput = ({ 
  label, 
  value, 
  onChange, 
  step = 0.1, 
  min = 0, 
  max = 10 
}: { 
  label: string, 
  value: number, 
  onChange: (val: number) => void, 
  step?: number, 
  min?: number, 
  max?: number 
}) => {
  // formatting value for display
  const displayValue = Math.round(value * 100) / 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #cbd5e1', borderRadius: 4,
            background: '#f1f5f9', cursor: 'pointer', color: '#475569'
          }}
        >-</button>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val)) onChange(Math.max(min, Math.min(max, val)))
          }}
          step={step}
          style={{
            flex: 1,
            padding: '4px 8px',
            border: '1px solid #cbd5e1',
            borderRadius: 4,
            fontSize: 12,
            textAlign: 'center',
            minWidth: 0
          }}
        />
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #cbd5e1', borderRadius: 4,
            background: '#f1f5f9', cursor: 'pointer', color: '#475569'
          }}
        >+</button>
      </div>
    </div>
  )
}

export const UselessViaSolverView: React.FC<UselessViaSolverViewProps> = ({
  data,
  height = 600,
  width = "100%",
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  
  // Internal State for UI Controls
  const [layerGap, setLayerGap] = useState(0.5)
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(-1) // -1 means all
  // State for sphere/segment size multiplier
  const [nodeSizeMultiplier, setNodeSizeMultiplier] = useState(1)

  // Fixed layer thickness for visualization
  const layerThickness = 0.2

  // Sorted Routes for Dropdown
  const sortedRoutes = useMemo(() => {
    return data.unsimplifiedHdRoutes
      .map((route, index) => ({
        ...route,
        originalIndex: index,
        segmentCount: route.route.length
      }))
      .sort((a, b) => a.segmentCount - b.segmentCount)
  }, [data])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    // Scene Setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0) // White theme

    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.set(0, 15, 15)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(10, 20, 10)
    scene.add(dirLight)

    // Helpers
    const grid = new THREE.GridHelper(20, 20, 0xdddddd, 0xeeeeee)
    grid.position.y = -5 
    scene.add(grid)
    scene.add(new THREE.AxesHelper(2))

    // --- Content Generation ---

    const getLayerY = (z: number) => -z * (layerThickness + layerGap)

    const getNetColor = (name: string, isSelected: boolean, isDimmed: boolean) => {
      if (isDimmed) return new THREE.Color(0xeeeeee)
      
      let hash = 0
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
      }
      const hue = Math.abs(hash % 360)
      
      // If selected, make it pop, otherwise normal
      return new THREE.Color(`hsl(${hue}, 70%, ${isSelected ? 40 : 50}%)`)
    }

    const contentGroup = new THREE.Group()
    scene.add(contentGroup)

    // 1. Routes
    data.unsimplifiedHdRoutes.forEach((route, i) => {
      const isSelected = selectedRouteIdx === i
      const isAnySelected = selectedRouteIdx !== -1
      const isDimmed = isAnySelected && !isSelected

      const color = getNetColor(route.connectionName, isSelected, isDimmed)
      const points = route.route.map(p => new THREE.Vector3(p.x, getLayerY(p.z), p.y))
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ 
        color: color,
        linewidth: isSelected ? 3 : 1, // Note: linewidth only works in some GL contexts
        transparent: true,
        opacity: isDimmed ? 0.2 : 1
      }) 
      const line = new THREE.Line(geometry, material)
      contentGroup.add(line)

      // Visualize points/vias
      if (!isDimmed || isSelected) {
          route.route.forEach(p => {
             const sphere = new THREE.Mesh(
               new THREE.SphereGeometry(route.traceThickness * (isSelected ? 2.5 : 2) * nodeSizeMultiplier, 8, 8),
               new THREE.MeshBasicMaterial({ 
                   color: color,
                   transparent: true,
                   opacity: isDimmed ? 0.2 : 1
               })
             )
             sphere.position.set(p.x, getLayerY(p.z), p.y)
             contentGroup.add(sphere)
          })
      }
    })

    // 2. Obstacles
    data.obstacles.forEach((obs) => {
      obs.layers.forEach((layerName) => {
        const zIndex = LAYER_NAMES.indexOf(layerName)
        if (zIndex === -1) return

        const y = getLayerY(zIndex)
        // Adjust obstacles opacity based on selection mode? 
        // Maybe keep obstacles visible but faint context
        const color = 0xff0000 // Red obstacles
        const opacity = selectedRouteIdx !== -1 ? 0.1 : 0.3

        let mesh: THREE.Mesh

        if (obs.type === "oval") {
          // Cylinder
          const radius = obs.width / 2 
          mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, layerThickness, 16),
            new THREE.MeshStandardMaterial({ 
              color, 
              transparent: true, 
              opacity,
              depthWrite: false,
              side: THREE.DoubleSide
            })
          )
          mesh.position.set(obs.center.x, y, obs.center.y)
        } else {
          // Rect
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(obs.width, layerThickness, obs.height),
            new THREE.MeshStandardMaterial({ 
              color, 
              transparent: true, 
              opacity,
              depthWrite: false,
              side: THREE.DoubleSide
            })
          )
          mesh.position.set(obs.center.x, y, obs.center.y)
        }
        contentGroup.add(mesh)
      })
    })


    // --- Rendering Loop ---
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animId)
      disposeObject(scene)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [data, layerGap, selectedRouteIdx, nodeSizeMultiplier]) // Re-render when these change

  return (
    <div style={{ position: 'relative', width, height }}>
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(255,255,255,0.9)',
        padding: '12px',
        borderRadius: 6,
        fontSize: 12,
        color: '#334155',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        zIndex: 10,
        minWidth: 240,
        border: '1px solid #e2e8f0'
      }}>
        <strong style={{ fontSize: 14, color: '#0f172a' }}>Useless Via Solver</strong>

        {/* Layer Gap Control */}
        <NumberInput
          label="Layer Gap"
          value={layerGap}
          onChange={setLayerGap}
          step={0.1}
          min={0}
          max={5}
        />

        {/* Node Size Control */}
        <NumberInput
          label="Node Size Multiplier"
          value={nodeSizeMultiplier}
          onChange={setNodeSizeMultiplier}
          step={0.1}
          min={0.1}
          max={5}
        />

        {/* Route Selection Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600 }}>
            Focus Route ({data.unsimplifiedHdRoutes.length}):
          </label>
          <select
            value={selectedRouteIdx}
            onChange={(e) => setSelectedRouteIdx(Number(e.target.value))}
            style={{
              padding: '6px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              fontSize: 11,
              background: 'white',
              width: '100%',
              outline: 'none'
            }}
          >
            <option value={-1}>Show All Routes</option>
            {sortedRoutes.map((route) => (
              <option key={route.originalIndex} value={route.originalIndex}>
                {route.connectionName} ({route.segmentCount} pts)
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ fontSize: 10, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
           Scroll/Drag to move camera
        </div>
      </div>
    </div>
  )
}
