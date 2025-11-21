import type { PathingOptimizerResult, PathingInputConnection, CapacityMeshNode } from "../lib/types"
import type { DebugPathData } from "../lib/CapacityHybridView"

/**
 * Load and parse the pathingOptimizer_input.json file
 * Import it directly since it's a static asset
 */
export async function loadPathingData(): Promise<PathingOptimizerResult> {
  try {
    // Import the JSON file directly
    const pathingData = await import("../test-assets/bug-11/pathingOptimizer_input.json")
    // The file is an array with one object containing initialPathingSolver
    const data = (pathingData.default || pathingData) as any
    return data[0] as PathingOptimizerResult
  } catch (error) {
    console.error("Error loading pathing data:", error)
    throw error
  }
}

/**
 * Match JSON path nodes to scene nodes by position
 * Returns a map from JSON node to scene node ID
 */
export function matchNodesByPosition(
  sceneNodes: CapacityMeshNode[],
  jsonNodes: Array<{ center: { x: number; y: number }; layer: string }>,
  tolerance: number = 0.001
): Map<any, string> {
  const matches = new Map<any, string>()
  
  for (const jsonNode of jsonNodes) {
    const match = sceneNodes.find(sceneNode => 
      Math.abs(sceneNode.center.x - jsonNode.center.x) < tolerance &&
      Math.abs(sceneNode.center.y - jsonNode.center.y) < tolerance &&
      sceneNode.layer === jsonNode.layer
    )
    
    if (match) {
      matches.set(jsonNode, match.capacityMeshNodeId)
    }
  }
  
  return matches
}

/**
 * Convert a PathingInputConnection to DebugPathData for rendering
 */
export function convertConnectionToDebugPath(
  connection: PathingInputConnection
): DebugPathData {
  const { pointsToConnect } = connection.connection
  
  return {
    start: pointsToConnect[0] ? {
      x: pointsToConnect[0].x,
      y: pointsToConnect[0].y,
      layer: pointsToConnect[0].layer
    } : undefined,
    end: pointsToConnect[1] ? {
      x: pointsToConnect[1].x,
      y: pointsToConnect[1].y,
      layer: pointsToConnect[1].layer
    } : undefined,
    path: connection.path.map(node => ({
      x: node.center.x,
      y: node.center.y,
      layer: node.layer,
      isObstacle: (node as any)._completelyInsideObstacle || (node as any)._containsObstacle
    }))
  }
}

/**
 * Generate a display name for a connection
 */
export function getConnectionDisplayName(connection: PathingInputConnection, index: number): string {
  const name = connection.connection.name || `Connection ${index}`
  const pathStatus = connection.pathFound ? "✓" : "✗"
  return `${index}: ${name} ${pathStatus}`
}