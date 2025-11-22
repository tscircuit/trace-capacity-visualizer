import * as THREE from "three"

/**
 * Recursively dispose of a Three.js object and its children
 * Properly cleans up geometry and material to prevent memory leaks
 */
export function disposeObject(obj: THREE.Object3D) {
  if (!obj) return
  
  obj.children.forEach(disposeObject)
  
  if ((obj as any).geometry) {
    (obj as any).geometry.dispose()
  }
  
  if ((obj as any).material) {
    const material = (obj as any).material
    if (Array.isArray(material)) {
      material.forEach((m: any) => m.dispose())
    } else {
      material.dispose()
    }
  }
}