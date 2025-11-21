import { useMemo, useRef, useState, useEffect } from "react"
import type { CapacityMeshNode, SimpleRouteJson } from "./types"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { canonicalizeLayerOrder } from "../utils/canonicalizeLayerOrder"
import { buildPrismsFromNodes } from "../utils/buildPrismsFromNodes"
import { clamp01 } from "../utils/clamp01"
import { darkenColor } from "../utils/darkenColor"
import { createColorAssigner } from "../utils/layerPalette"

export const ThreeBoardView: React.FC<{
  nodes: CapacityMeshNode[]
  srj?: SimpleRouteJson
  layerThickness: number
  height: number
  showRoot: boolean
  showObstacles: boolean
  showOutput: boolean
  wireframeOutput: boolean
  meshOpacity: number
  shrinkBoxes: boolean
  boxShrinkAmount: number
  showBorders: boolean
  isOrthographic: boolean
  onDeleteNodes: (nodes: CapacityMeshNode[]) => void
}> = ({
  nodes,
  srj,
  layerThickness,
  height,
  showRoot,
  showObstacles,
  showOutput,
  wireframeOutput,
  meshOpacity,
  shrinkBoxes,
  boxShrinkAmount,
  showBorders,
  isOrthographic,
  onDeleteNodes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const destroyRef = useRef<() => void>(() => {})
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef =
    useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null)
  const outputGroupRef = useRef<THREE.Group | null>(null)
  const controlsStateRef =
    useRef<{ position: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>(
      null,
    )

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodes: CapacityMeshNode[]
  } | null>(null)

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu(null) // Close any existing menu

    const scene = sceneRef.current
    const camera = cameraRef.current
    const outputGroup = outputGroupRef.current
    const el = containerRef.current
    if (!el || !scene || !camera || !outputGroup) return

    const rect = el.getBoundingClientRect()
    const pointer = new THREE.Vector2()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(outputGroup.children, true)

    if (intersects.length > 0 && intersects[0]) {
      let intersectedObject: THREE.Object3D | null = intersects[0].object
      while (intersectedObject && !intersectedObject.userData.nodes) {
        intersectedObject = intersectedObject.parent
      }

      if (intersectedObject && intersectedObject.userData.nodes) {
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodes: intersectedObject.userData.nodes,
        })
      }
    }
  }

  const handleDelete = (nodesToDelete: CapacityMeshNode[]) => {
    onDeleteNodes(nodesToDelete)
    setContextMenu(null)
  }

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener("click", handleClick)
    return () => window.removeEventListener("click", handleClick)
  }, [])

  const layerNames = useMemo(() => {
    // Build from nodes (preferred, matches solver) and fall back to SRJ obstacle names
    const fromNodes = canonicalizeLayerOrder(nodes.map((n) => n.layer))
    if (fromNodes.length) return fromNodes
    const fromObs = canonicalizeLayerOrder(
      (srj?.obstacles ?? []).flatMap((o) => o.layers ?? []),
    )
    return fromObs.length ? fromObs : ["top"]
  }, [nodes, srj])

  const zIndexByLayerName = useMemo(() => {
    const m = new Map<string, number>()
    layerNames.forEach((n, i) => m.set(n, i))
    return m
  }, [layerNames])

  const layerCount = layerNames.length || srj?.layerCount || 1

  const prisms = useMemo(
    () => buildPrismsFromNodes(nodes, layerCount),
    [nodes, layerCount],
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const el = containerRef.current
      if (!el) return
      if (!mounted) return

      destroyRef.current?.()

      const w = el.clientWidth || 800
      const h = el.clientHeight || height

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
      })
      // Increase pixel ratio for better alphaHash quality
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(w, h)
      el.innerHTML = ""
      el.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      sceneRef.current = scene
      scene.background = new THREE.Color(0xf7f8fa)

      const fitBox = srj
        ? {
            minX: srj.bounds.minX,
            maxX: srj.bounds.maxX,
            minY: srj.bounds.minY,
            maxY: srj.bounds.maxY,
            z0: 0,
            z1: layerCount,
          }
        : (() => {
            if (prisms.length === 0) {
              return {
                minX: -10,
                maxX: 10,
                minY: -10,
                maxY: 10,
                z0: 0,
                z1: layerCount,
              }
            }
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity
            for (const p of prisms) {
              minX = Math.min(minX, p.minX)
              maxX = Math.max(maxX, p.maxX)
              minY = Math.min(minY, p.minY)
              maxY = Math.max(maxY, p.maxY)
            }
            return { minX, maxX, minY, maxY, z0: 0, z1: layerCount }
          })()

      const dx = fitBox.maxX - fitBox.minX
      const dz = fitBox.maxY - fitBox.minY
      const dy = (fitBox.z1 - fitBox.z0) * layerThickness
      const size = Math.max(dx, dz, dy)

      let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
      if (isOrthographic) {
        const aspect = w / h
        const frustumSize = size * 1.2
        camera = new THREE.OrthographicCamera(
          (frustumSize * aspect) / -2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          frustumSize / -2,
          0.1,
          size * 20,
        )
      } else {
        camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000)
      }
      cameraRef.current = camera

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true

      const amb = new THREE.AmbientLight(0xffffff, 0.9)
      scene.add(amb)
      const dir = new THREE.DirectionalLight(0xffffff, 0.6)
      dir.position.set(1, 2, 3)
      scene.add(dir)

      const rootGroup = new THREE.Group()
      const obstaclesGroup = new THREE.Group()
      const outputGroup = new THREE.Group()
      outputGroupRef.current = outputGroup
      scene.add(rootGroup, obstaclesGroup, outputGroup)

      // Axes helper for orientation (similar to experiment)
      const axes = new THREE.AxesHelper(50)
      scene.add(axes)

      const colorRoot = 0x111827
      const colorOb = 0xef4444

      // Use shared color assigner logic
      const assigner = createColorAssigner()
      const getSpanColor = (z0: number, z1: number) => assigner(`${z0}-${z1}`)

      function makeBoxMesh(
        b: {
          minX: number
          maxX: number
          minY: number
          maxY: number
          z0: number
          z1: number
        },
        color: number,
        wire: boolean,
        nodes: CapacityMeshNode[],
        opacity = 0.45,
        borders = false,
      ) {
        const dx = b.maxX - b.minX
        const dz = b.maxY - b.minY // map board Y -> three Z
        const dy = (b.z1 - b.z0) * layerThickness
        const cx = -((b.minX + b.maxX) / 2) // negate X to match expected orientation
        const cz = (b.minY + b.maxY) / 2
        // Negate Y so z=0 is at top, higher z goes down
        const cy = -((b.z0 + b.z1) / 2) * layerThickness

        const geom = new THREE.BoxGeometry(dx, dy, dz)
        if (wire) {
          const edges = new THREE.EdgesGeometry(geom)
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color }),
          )
          line.position.set(cx, cy, cz)
          line.userData = { nodes }
          return line
        }
        const clampedOpacity = clamp01(opacity)
        const mat = new THREE.MeshPhongMaterial({
          color,
          opacity: clampedOpacity,
          transparent: clampedOpacity < 1,
          alphaHash: clampedOpacity < 1,
          alphaToCoverage: true,
        })

        const mesh = new THREE.Mesh(geom, mat)
        mesh.position.set(cx, cy, cz)
        mesh.userData = { nodes }

        if (!borders) return mesh

        const edges = new THREE.EdgesGeometry(geom)
        const borderColor = darkenColor(color, 0.6)
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: borderColor }),
        )
        line.position.set(cx, cy, cz)

        const group = new THREE.Group()
        group.add(mesh)
        group.add(line)
        group.userData = { nodes }
        return group
      }

      // Root wireframe from SRJ bounds
      if (srj && showRoot) {
        const rootBox = {
          minX: srj.bounds.minX,
          maxX: srj.bounds.maxX,
          minY: srj.bounds.minY,
          maxY: srj.bounds.maxY,
          z0: 0,
          z1: layerCount,
        }
        rootGroup.add(makeBoxMesh(rootBox, colorRoot, true, []))
      }

      // Obstacles — rectangular only — one slab per declared layer
      if (srj && showObstacles) {
        for (const ob of srj.obstacles ?? []) {
          if (ob.type !== "rect") continue
          const minX = ob.center.x - ob.width / 2
          const maxX = ob.center.x + ob.width / 2
          const minY = ob.center.y - ob.height / 2
          const maxY = ob.center.y + ob.height / 2

          // Prefer explicit zLayers; otherwise map layer names to indices
          const zs =
            ob.zLayers && ob.zLayers.length
              ? Array.from(new Set(ob.zLayers))
              : (ob.layers ?? [])
                  .map((name) => zIndexByLayerName.get(name))
                  .filter((z): z is number => typeof z === "number")

          for (const z of zs) {
            if (z < 0 || z >= layerCount) continue
            obstaclesGroup.add(
              makeBoxMesh(
                { minX, maxX, minY, maxY, z0: z, z1: z + 1 },
                colorOb,
                false,
                [],
                0.35,
                false,
              ),
            )
          }
        }
      }

      // Output prisms from nodes (wireframe toggle like the experiment)
      if (showOutput) {
        for (const p of prisms) {
          let box = p
          if (shrinkBoxes && boxShrinkAmount > 0) {
            const s = boxShrinkAmount

            const widthX = p.maxX - p.minX
            const widthY = p.maxY - p.minY

            // Never shrink more on a side than allowed by the configured shrink amount
            // while ensuring we don't shrink past a minimum dimension of "s"
            const maxShrinkEachSideX = Math.max(0, (widthX - s) / 2)
            const maxShrinkEachSideY = Math.max(0, (widthY - s) / 2)

            const shrinkX = Math.min(s, maxShrinkEachSideX)
            const shrinkY = Math.min(s, maxShrinkEachSideY)

            const minX = p.minX + shrinkX
            const maxX = p.maxX - shrinkX
            const minY = p.minY + shrinkY
            const maxY = p.maxY - shrinkY

            // Guard against any degenerate box
            if (minX >= maxX || minY >= maxY) {
              continue
            }

            box = { ...p, minX, maxX, minY, maxY }
          }

          const color = getSpanColor(p.z0, p.z1)
          outputGroup.add(
            makeBoxMesh(
              box,
              color,
              wireframeOutput,
              p.nodes,
              meshOpacity,
              showBorders && !wireframeOutput,
            ),
          )
        }
      }

      if (controlsStateRef.current) {
        camera.position.copy(controlsStateRef.current.position)
        controls.target.copy(controlsStateRef.current.target)
        if (isOrthographic) {
          ;(camera as THREE.OrthographicCamera).zoom =
            controlsStateRef.current.zoom
        }
        camera.updateProjectionMatrix()
        controls.update()
      } else {
        // Fit camera
        const target = new THREE.Vector3(
          -((fitBox.minX + fitBox.maxX) / 2), // negate X to account for flipped axis
          -dy / 2, // center of the inverted Y range
          (fitBox.minY + fitBox.maxY) / 2,
        )
        controls.target.copy(target)

        const dist = size * 2.0
        if (isOrthographic) {
          // Top-down view
          camera.position.copy(target).add(new THREE.Vector3(0, dist, 0))
          camera.lookAt(target)
        } else {
          // Camera looks from above-right-front, with negative Y being "up" (z=0 at top)
          camera.position.set(
            -(fitBox.maxX + dist * 0.6), // negate X to account for flipped axis
            -dy / 2 + dist, // negative Y is up, so position above the center
            fitBox.maxY + dist * 0.6,
          )
        }

        camera.near = Math.max(0.1, size / 100)
        camera.far = dist * 10 + size * 10
        camera.updateProjectionMatrix()
        controls.update()
      }

      const onResize = () => {
        const W = el.clientWidth || w
        const H = el.clientHeight || h
        if (isOrthographic) {
          const aspect = W / H
          const frustumSize = size * 1.2
          const ocam = camera as THREE.OrthographicCamera
          ocam.left = (frustumSize * aspect) / -2
          ocam.right = (frustumSize * aspect) / 2
          ocam.top = frustumSize / 2
          ocam.bottom = frustumSize / -2
        } else {
          ;(camera as THREE.PerspectiveCamera).aspect = W / H
        }
        camera.updateProjectionMatrix()
        renderer.setSize(W, H)
      }
      window.addEventListener("resize", onResize)

      let raf = 0
      const animate = () => {
        raf = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      destroyRef.current = () => {
        controlsStateRef.current = {
          position: camera.position.clone(),
          target: controls.target.clone(),
          zoom: (camera as any).zoom ?? 1,
        }
        cancelAnimationFrame(raf)
        window.removeEventListener("resize", onResize)
        renderer.dispose()
        el.innerHTML = ""
        sceneRef.current = null
        cameraRef.current = null
        outputGroupRef.current = null
      }
    })()

    return () => {
      mounted = false
      destroyRef.current?.()
    }
  }, [
    srj,
    prisms,
    layerCount,
    layerThickness,
    height,
    showObstacles,
    wireframeOutput,
    zIndexByLayerName,
    meshOpacity,
    shrinkBoxes,
    boxShrinkAmount,
    showBorders,
    isOrthographic,
  ])

  return (
    <>
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: 8,
            zIndex: 1000,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <button
            onClick={() => handleDelete(contextMenu.nodes)}
            style={{
              background: "none",
              border: "none",
              padding: "4px 8px",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            Hide
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        style={{
          width: "100%",
          height,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          background: "#f7f8fa",
        }}
      />
    </>
  )
}
