import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type RefObject,
} from 'react';
import {
  BASE_SPEED,
  DECELERATION_FACTOR,
  MIN_SPEED_THRESHOLD,
  ZOOM_SENSITIVITY,
  MIN_ZOOM,
  MAX_ZOOM,
} from './constants';
import { initializeNodes } from './utils';
import { type ChildData, type NodeState } from './types';

/**
 * Custom hook for Constellation logic including animation, zoom, and navigation.
 */
export function useConstellation(
  initialChildren: readonly ChildData[],
  canvasRef: RefObject<HTMLCanvasElement | null>
) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [nodePositions, setNodePositions] = useState<{ x: number; y: number }[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRootHovered, setIsRootHovered] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showOnlyTwoCircles, setShowOnlyTwoCircles] = useState(false);
  
  // Navigation state
  const [navigationStack, setNavigationStack] = useState<Array<{
    name: string;
    children: readonly ChildData[];
  }>>([{ name: 'Root Folder', children: initialChildren }]);

  const currentLevel = navigationStack[navigationStack.length - 1];
  const currentChildren = currentLevel.children;

  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const nodesRef = useRef<NodeState[]>([]);
  const radiiRef = useRef<number[]>([]);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const centerX = dimensions.width / 2 + offset.x;
  const centerY = dimensions.height / 2 + offset.y;

  // Initialize nodes for current level
  const { nodes: initializedNodes, radii } = useMemo(
    () => initializeNodes(currentChildren, showOnlyTwoCircles),
    [currentChildren, showOnlyTwoCircles]
  );

  useEffect(() => {
    nodesRef.current = initializedNodes.map((node) => ({ ...node }));
    radiiRef.current = [...radii];
    setNodePositions(nodesRef.current.map(() => ({ x: 0, y: 0 })));
    // Reset decelerations when level changes
    nodesRef.current.forEach(n => {
      n.isDecelerating = false;
      n.speed = BASE_SPEED;
    });
  }, [initializedNodes, radii]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef]);

  // Animation Loop
  useEffect(() => {
    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const nodes = nodesRef.current;
      const newPositions: { x: number; y: number }[] = [];

      nodes.forEach((node) => {
        if (node.isDecelerating) {
          node.speed *= DECELERATION_FACTOR;
          if (node.speed < MIN_SPEED_THRESHOLD) {
            node.speed = 0;
            node.isDecelerating = false;
          }
        }
        node.angle += node.speed * deltaTime;

        const x = centerX + Math.cos(node.angle) * node.radius * zoom;
        const y = centerY + Math.sin(node.angle) * node.radius * zoom;
        newPositions.push({ x, y });
      });

      setNodePositions(newPositions);
      animationRef.current = requestAnimationFrame(animate);
    };

    if (dimensions.width > 0 && dimensions.height > 0) {
      animate();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [centerX, centerY, dimensions.width, dimensions.height, zoom]);

  // Canvas Drawing (Orbits)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(219, 219, 219, 0.43)';
    ctx.lineWidth = 2;

    radiiRef.current.forEach((radius) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * zoom, 0, Math.PI * 2);
      ctx.stroke();
    });
  }, [canvasRef, centerX, centerY, zoom, initializedNodes]);

  // Zoom Handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    setZoom((prevZoom) => {
      const newZoom = prevZoom - e.deltaY * ZOOM_SENSITIVITY;
      return Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    });
  }, []);

  // Hover Handlers
  const handleNodeMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
    nodesRef.current.forEach((n) => (n.isDecelerating = true));
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    nodesRef.current.forEach((n) => {
      n.isDecelerating = false;
      n.speed = BASE_SPEED;
    });
  }, []);

  const handleRootMouseEnter = useCallback(() => {
    setIsRootHovered(true);
    nodesRef.current.forEach((n) => (n.isDecelerating = true));
  }, []);

  const handleRootMouseLeave = useCallback(() => {
    setIsRootHovered(false);
    nodesRef.current.forEach((n) => {
      n.isDecelerating = false;
      n.speed = BASE_SPEED;
    });
  }, []);

  // Drag Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      };
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Navigation Handlers
  const navigateInto = useCallback((node: ChildData) => {
    if (node.color === 'blue' && node.children && node.children.length > 0) {
      setNavigationStack(prev => [...prev, { name: node.name, children: node.children! }]);
      setHoveredIndex(null);
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  const navigateBack = useCallback(() => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
      setHoveredIndex(null);
      setOffset({ x: 0, y: 0 });
    }
  }, [navigationStack.length]);

  const toggleShowOnlyTwoCircles = useCallback(() => {
    setShowOnlyTwoCircles(prev => !prev);
  }, []);

  return {
    centerX,
    centerY,
    nodePositions,
    hoveredIndex,
    isRootHovered,
    zoom,
    isDragging,
    nodes: nodesRef.current,
    currentLevelName: currentLevel.name,
    canNavigateBack: navigationStack.length > 1,
    showOnlyTwoCircles,
    handleWheel,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleRootMouseEnter,
    handleRootMouseLeave,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    navigateInto,
    navigateBack,
    toggleShowOnlyTwoCircles,
  };
}
