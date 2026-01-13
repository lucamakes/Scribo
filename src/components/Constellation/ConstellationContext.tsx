'use client';

import { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback, type ReactNode, type RefObject } from 'react';
import type { ChildData, NodeState } from './types';
import { initializeNodes } from './utils';
import {
  DECELERATION_FACTOR,
  MIN_SPEED_THRESHOLD,
  MIN_ZOOM,
  MAX_ZOOM,
} from './constants';

// ============================================
// Types
// ============================================

interface ConstellationContextValue {
  // Canvas ref
  canvasRef: RefObject<HTMLCanvasElement | null>;
  
  // Dimensions & positioning
  dimensions: { width: number; height: number };
  centerX: number;
  centerY: number;
  
  // Nodes
  nodes: NodeState[];
  nodePositions: { x: number; y: number }[];
  currentChildren: readonly ChildData[];
  
  // Hover state
  hoveredIndex: number | null;
  isRootHovered: boolean;
  isAnyHovered: boolean;
  
  // Zoom & pan
  zoom: number;
  isDragging: boolean;
  
  // Animation
  isAnimating: boolean;
  
  // Navigation
  navigationStack: Array<{ name: string; children: readonly ChildData[] }>;
  currentLevelName: string;
  canNavigateBack: boolean;
  
  // View options
  showOnlyTwoCircles: boolean;
  showInfo: boolean;
  
  // Handlers
  handleWheel: (e: React.WheelEvent) => void;
  handleNodeMouseEnter: (index: number) => void;
  handleNodeMouseLeave: () => void;
  handleRootMouseEnter: () => void;
  handleRootMouseLeave: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  
  // Actions
  navigateInto: (node: ChildData) => void;
  navigateBack: () => void;
  navigateToLevel: (levelIndex: number) => void;
  toggleShowOnlyTwoCircles: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setShowInfo: (show: boolean) => void;
  
  // File click callback
  onFileClick?: (fileId: string) => void;
}

const ConstellationContext = createContext<ConstellationContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface ConstellationProviderProps {
  children: ReactNode;
  childrenData?: readonly ChildData[];
  rootName?: string;
  onFileClick?: (fileId: string) => void;
}

export function ConstellationProvider({ 
  children, 
  childrenData = [], 
  rootName = 'Root Folder',
  onFileClick 
}: ConstellationProviderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Node positions (updated by animation)
  const [nodePositions, setNodePositions] = useState<{ x: number; y: number }[]>([]);
  
  // Hover state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isRootHovered, setIsRootHovered] = useState(false);
  
  // Zoom & pan - default to 0.75 on mobile, 0.9 on desktop
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 0.75;
    }
    return 0.9;
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // View options
  const [showOnlyTwoCircles, setShowOnlyTwoCircles] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Navigation
  const [navigationStack, setNavigationStack] = useState<Array<{
    name: string;
    children: readonly ChildData[];
  }>>([{ name: rootName, children: childrenData }]);

  // Refs for animation
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const nodesRef = useRef<NodeState[]>([]);
  const radiiRef = useRef<number[]>([]);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Derived values
  const currentLevel = navigationStack[navigationStack.length - 1];
  const currentChildren = currentLevel.children;
  const currentLevelName = currentLevel.name;
  const canNavigateBack = navigationStack.length > 1;
  const centerX = dimensions.width / 2 + offset.x;
  const centerY = dimensions.height / 2 + offset.y;
  const isAnyHovered = hoveredIndex !== null || isRootHovered;

  // Initialize nodes for current level
  const { nodes: initializedNodes, radii } = useMemo(
    () => initializeNodes(currentChildren, showOnlyTwoCircles),
    [currentChildren, showOnlyTwoCircles]
  );

  useEffect(() => {
    nodesRef.current = initializedNodes.map((node) => ({ ...node }));
    radiiRef.current = [...radii];
    setNodePositions(nodesRef.current.map(() => ({ x: 0, y: 0 })));
    nodesRef.current.forEach(n => {
      n.isDecelerating = false;
      n.speed = n.baseSpeed;
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
  }, []);

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
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;

    radiiRef.current.forEach((radius) => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * zoom, 0, Math.PI * 2);
      ctx.stroke();
    });
  }, [centerX, centerY, zoom, initializedNodes]);

  // Handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, MIN_ZOOM), MAX_ZOOM);
    
    const zoomRatio = newZoom / zoom;
    const newOffsetX = mouseX - (mouseX - offset.x - dimensions.width / 2) * zoomRatio - dimensions.width / 2;
    const newOffsetY = mouseY - (mouseY - offset.y - dimensions.height / 2) * zoomRatio - dimensions.height / 2;
    
    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [zoom, offset, dimensions]);

  const handleNodeMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
    nodesRef.current.forEach((n) => (n.isDecelerating = true));
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    nodesRef.current.forEach((n) => {
      n.isDecelerating = false;
      n.speed = n.baseSpeed;
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
      n.speed = n.baseSpeed;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev * 0.8, MIN_ZOOM));
  }, []);

  const resetView = useCallback(() => {
    // Reset to 0.75 on mobile, 0.9 on desktop
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    setZoom(isMobile ? 0.75 : 0.9);
    setOffset({ x: 0, y: 0 });
  }, []);

  const navigateInto = useCallback((node: ChildData) => {
    if (node.color === 'blue' && node.children && node.children.length > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setNavigationStack(prev => [...prev, { name: node.name, children: node.children! }]);
        setHoveredIndex(null);
        setOffset({ x: 0, y: 0 });
        setIsAnimating(false);
      }, 300);
    }
  }, []);

  const navigateBack = useCallback(() => {
    if (navigationStack.length > 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setNavigationStack(prev => prev.slice(0, -1));
        setHoveredIndex(null);
        setOffset({ x: 0, y: 0 });
        setIsAnimating(false);
      }, 300);
    }
  }, [navigationStack.length]);

  const navigateToLevel = useCallback((levelIndex: number) => {
    if (levelIndex >= 0 && levelIndex < navigationStack.length) {
      setIsAnimating(true);
      setTimeout(() => {
        setNavigationStack(prev => prev.slice(0, levelIndex + 1));
        setHoveredIndex(null);
        setOffset({ x: 0, y: 0 });
        setIsAnimating(false);
      }, 300);
    }
  }, [navigationStack.length]);

  const toggleShowOnlyTwoCircles = useCallback(() => {
    setShowOnlyTwoCircles(prev => !prev);
  }, []);

  const value: ConstellationContextValue = useMemo(() => ({
    canvasRef,
    dimensions,
    centerX,
    centerY,
    nodes: nodesRef.current,
    nodePositions,
    currentChildren,
    hoveredIndex,
    isRootHovered,
    isAnyHovered,
    zoom,
    isDragging,
    isAnimating,
    navigationStack,
    currentLevelName,
    canNavigateBack,
    showOnlyTwoCircles,
    showInfo,
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
    navigateToLevel,
    toggleShowOnlyTwoCircles,
    zoomIn,
    zoomOut,
    resetView,
    setShowInfo,
    onFileClick,
  }), [
    dimensions, centerX, centerY, nodePositions, currentChildren,
    hoveredIndex, isRootHovered, isAnyHovered, zoom, isDragging, isAnimating,
    navigationStack, currentLevelName, canNavigateBack, showOnlyTwoCircles, showInfo,
    handleWheel, handleNodeMouseEnter, handleNodeMouseLeave, handleRootMouseEnter,
    handleRootMouseLeave, handleMouseDown, handleMouseMove, handleMouseUp,
    navigateInto, navigateBack, navigateToLevel, toggleShowOnlyTwoCircles,
    zoomIn, zoomOut, resetView, onFileClick
  ]);

  return (
    <ConstellationContext.Provider value={value}>
      {children}
    </ConstellationContext.Provider>
  );
}

export function useConstellation() {
  const context = useContext(ConstellationContext);
  if (!context) {
    throw new Error('useConstellation must be used within a ConstellationProvider');
  }
  return context;
}
