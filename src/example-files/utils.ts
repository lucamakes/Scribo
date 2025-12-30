import {
  MIN_NODE_SIZE,
  MAX_NODE_SIZE,
  BASE_SPEED,
  INITIAL_RADIUS,
  RADIUS_STEP,
  INITIAL_NODE_LIMIT,
  LIMIT_STEP,
  WORDS_PER_MINUTE,
} from './constants';
import { type ChildData, type NodeState } from './types';

/**
 * Calculates node size based on word count
 */
export function calculateNodeSize(
  words: number,
  minWords: number,
  maxWords: number
): number {
  if (maxWords === minWords) return (MIN_NODE_SIZE + MAX_NODE_SIZE) / 2;
  const ratio = (words - minWords) / (maxWords - minWords);
  return MIN_NODE_SIZE + ratio * (MAX_NODE_SIZE - MIN_NODE_SIZE);
}

/**
 * Calculates text size based on node size
 */
export function calculateTextSize(nodeSize: number): number {
  const ratio = (nodeSize - MIN_NODE_SIZE) / (MAX_NODE_SIZE - MIN_NODE_SIZE);
  return 10 + ratio * 8;
}

/**
 * Calculates reading time in minutes based on word count
 */
export function calculateReadingTime(words: number): number {
  return Math.ceil(words / WORDS_PER_MINUTE);
}

/**
 * Generates dynamic circle radii and limits based on total node count.
 * Each new circle increases capacity by LIMIT_STEP.
 */
export function generateDynamicOrbits(
  totalNodes: number,
  limitToTwoCircles: boolean
): { radii: number[]; limits: number[] } {
  const radii: number[] = [];
  const limits: number[] = [];
  
  let remainingNodes = totalNodes;
  let circleIndex = 0;
  
  while (remainingNodes > 0) {
    const radius = INITIAL_RADIUS + circleIndex * RADIUS_STEP;
    const limit = INITIAL_NODE_LIMIT + circleIndex * LIMIT_STEP;
    
    radii.push(radius);
    limits.push(limit);
    
    remainingNodes -= limit;
    circleIndex++;
    
    // If limited to two circles, stop after second and put all remaining on it
    if (limitToTwoCircles && circleIndex >= 2) {
      break;
    }
  }
  
  return { radii, limits };
}

/**
 * Distributes nodes across dynamically generated orbits.
 * Smaller nodes go on inner orbits, larger on outer.
 */
export function distributeNodesAcrossOrbits(
  nodes: Array<{ size: number; originalIndex: number }>,
  radii: number[],
  limits: number[]
): Map<number, number> {
  const orbitAssignments = new Map<number, number>();
  const sortedBySize = [...nodes].sort((a, b) => a.size - b.size);
  const orbitCounts: number[] = radii.map(() => 0);
  
  for (const node of sortedBySize) {
    let assigned = false;
    for (let i = 0; i < radii.length; i++) {
      if (orbitCounts[i] < limits[i]) {
        orbitAssignments.set(node.originalIndex, radii[i]);
        orbitCounts[i]++;
        assigned = true;
        break;
      }
    }
    // Fallback to outermost circle if all are "full"
    if (!assigned) {
      orbitAssignments.set(node.originalIndex, radii[radii.length - 1]);
    }
  }
  return orbitAssignments;
}

/**
 * Calculates initial angles for nodes on each orbit to space them evenly
 */
export function calculateInitialAngles(
  nodes: NodeState[],
  orbitAssignments: Map<number, number>,
  radii: number[]
): void {
  const nodesByOrbit = new Map<number, NodeState[]>();
  for (const node of nodes) {
    const radius = orbitAssignments.get(node.originalIndex) ?? radii[0];
    const orbitGroup = nodesByOrbit.get(radius) ?? [];
    orbitGroup.push(node);
    nodesByOrbit.set(radius, orbitGroup);
  }
  
  for (const [, orbitNodes] of nodesByOrbit) {
    const count = orbitNodes.length;
    orbitNodes.forEach((node, index) => {
      node.angle = (index / count) * Math.PI * 2;
    });
  }
}

/**
 * Initializes node states with dynamic orbit distribution.
 * Returns both the nodes and the generated radii for canvas drawing.
 * When limitToTwoCircles is true, only shows the smallest nodes that fit.
 */
export function initializeNodes(
  childrenData: readonly ChildData[],
  limitToTwoCircles: boolean = false
): { nodes: NodeState[]; radii: number[] } {
  // If limiting to two circles, calculate max capacity and filter to smallest nodes
  let dataToProcess: readonly ChildData[];
  if (limitToTwoCircles) {
    const maxCapacity = INITIAL_NODE_LIMIT + (INITIAL_NODE_LIMIT + LIMIT_STEP); // 6 + 8 = 14
    
    // Sort by word count (smallest first) and take only what fits
    const sortedByWords = [...childrenData].sort((a, b) => a.words - b.words);
    dataToProcess = sortedByWords.slice(0, maxCapacity);
  } else {
    dataToProcess = childrenData;
  }

  const wordCounts = dataToProcess.map((c) => c.words);
  const minWords = Math.min(...wordCounts);
  const maxWords = Math.max(...wordCounts);

  const nodesWithSize = dataToProcess.map((child, index) => ({
    size: calculateNodeSize(child.words, minWords, maxWords),
    originalIndex: index,
  }));

  // Generate dynamic orbits
  const { radii, limits } = generateDynamicOrbits(
    dataToProcess.length,
    limitToTwoCircles
  );

  const orbitAssignments = distributeNodesAcrossOrbits(nodesWithSize, radii, limits);

  const nodes: NodeState[] = dataToProcess.map((child, index) => {
    const size = calculateNodeSize(child.words, minWords, maxWords);
    const radius = orbitAssignments.get(index) ?? radii[0];

    return {
      data: child,
      size,
      textSize: calculateTextSize(size),
      originalIndex: index,
      radius,
      speed: BASE_SPEED,
      angle: 0,
      isDecelerating: false,
    };
  });

  calculateInitialAngles(nodes, orbitAssignments, radii);
  return { nodes, radii };
}
