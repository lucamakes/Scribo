'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Undo2, Redo2, Circle, ZoomIn, ZoomOut, RotateCcw, Info, Square, ChevronUp, ChevronDown, GripHorizontal, Unlink, Unplug, Link, PenLine } from 'lucide-react';
import styles from './CanvasEditor.module.css';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
  stackId?: string; // ID of stack this node belongs to
  stackIndex?: number; // Position in stack
}

export interface CanvasStack {
  id: string;
  x: number;
  y: number;
  nodeIds: string[];
}

export interface CanvasShape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  type?: 'rectangle' | 'circle';
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  stacks: CanvasStack[];
  shapes: CanvasShape[];
  viewport?: { x: number; y: number; zoom: number };
}

interface CanvasEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

const NODE_COLORS = ['#e5e5e5', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8'];
const SHAPE_COLORS = ['#f5f5f5', '#fef2f2', '#fff7ed', '#fefce8', '#f0fdf4', '#eff6ff', '#f5f3ff', '#fdf2f8'];
const STACK_SNAP_DISTANCE = 40;
const NODE_HEIGHT = 44;

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function parseCanvasData(content: string): CanvasData {
  try {
    const data = JSON.parse(content);
    return {
      nodes: data.nodes || [],
      connections: data.connections || [],
      stacks: data.stacks || [],
      shapes: data.shapes || [],
      viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
    };
  } catch {
    return { nodes: [], connections: [], stacks: [], shapes: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }
}

export function CanvasEditor({ content, onContentChange }: CanvasEditorProps) {
  const [data, setData] = useState<CanvasData>(() => parseCanvasData(content));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [draggingShape, setDraggingShape] = useState<string | null>(null);
  const [draggingStackHeader, setDraggingStackHeader] = useState<string | null>(null);
  const [resizingShape, setResizingShape] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingShape, setEditingShape] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [history, setHistory] = useState<CanvasData[]>([]);
  const [future, setFuture] = useState<CanvasData[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [snapPreview, setSnapPreview] = useState<{x: number, y: number, stackId?: string} | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const lastSavedRef = useRef(content);

  useEffect(() => {
    if (content !== lastSavedRef.current) {
      const newData = parseCanvasData(content);
      setData(newData);
      if (newData.viewport) setViewport(newData.viewport);
      lastSavedRef.current = content;
    }
  }, [content]);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(data))]);
    setFuture([]); // Clear redo stack on new action
  }, [data]);

  const saveData = useCallback((newData: CanvasData, skipHistory = false) => {
    if (!skipHistory) pushHistory();
    const dataWithViewport = { ...newData, viewport };
    setData(dataWithViewport);
    const json = JSON.stringify(dataWithViewport);
    lastSavedRef.current = json;
    onContentChange(json);
  }, [onContentChange, viewport, pushHistory]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [...f, JSON.parse(JSON.stringify(data))]); // Save current for redo
    setHistory(h => h.slice(0, -1));
    setData(prev);
    if (prev.viewport) setViewport(prev.viewport);
    const json = JSON.stringify(prev);
    lastSavedRef.current = json;
    onContentChange(json);
  }, [history, data, onContentChange]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    setHistory(h => [...h, JSON.parse(JSON.stringify(data))]); // Save current for undo
    setFuture(f => f.slice(0, -1));
    setData(next);
    if (next.viewport) setViewport(next.viewport);
    const json = JSON.stringify(next);
    lastSavedRef.current = json;
    onContentChange(json);
  }, [future, data, onContentChange]);

  // Find potential stack snap position
  const findSnapPosition = useCallback((nodeId: string, x: number, y: number) => {
    for (const otherNode of data.nodes) {
      if (otherNode.id === nodeId) continue;
      if (otherNode.stackId) continue; // Skip nodes already in stacks
      
      // Check if dragging below another node
      const dx = Math.abs(x - otherNode.x);
      const dy = y - (otherNode.y + NODE_HEIGHT);
      
      if (dx < STACK_SNAP_DISTANCE && dy > -10 && dy < STACK_SNAP_DISTANCE) {
        return { x: otherNode.x, y: otherNode.y + NODE_HEIGHT + 4, targetNodeId: otherNode.id };
      }
    }
    
    // Check existing stacks
    for (const stack of data.stacks) {
      const lastNodeId = stack.nodeIds[stack.nodeIds.length - 1];
      const lastNode = data.nodes.find(n => n.id === lastNodeId);
      if (!lastNode || lastNodeId === nodeId) continue;
      
      const stackBottom = stack.y + stack.nodeIds.length * (NODE_HEIGHT + 4);
      const dx = Math.abs(x - stack.x);
      const dy = y - stackBottom;
      
      if (dx < STACK_SNAP_DISTANCE && dy > -10 && dy < STACK_SNAP_DISTANCE) {
        return { x: stack.x, y: stackBottom, stackId: stack.id };
      }
    }
    return null;
  }, [data.nodes, data.stacks]);

  const addNode = useCallback((x?: number, y?: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = x ?? (rect ? (rect.width / 2 - viewport.x) / viewport.zoom : 200);
    const centerY = y ?? (rect ? (rect.height / 2 - viewport.y) / viewport.zoom : 200);
    
    const newNode: CanvasNode = { id: generateId(), x: centerX, y: centerY, text: '', color: '#e5e5e5' };
    saveData({ ...data, nodes: [...data.nodes, newNode] });
    setSelectedNode(newNode.id);
    setSelectedShape(null);
    setEditingNode(newNode.id);
  }, [data, saveData, viewport]);

  const addShape = useCallback((type: 'rectangle' | 'circle' = 'rectangle') => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - viewport.x) / viewport.zoom - 100 : 100;
    const centerY = rect ? (rect.height / 2 - viewport.y) / viewport.zoom - 75 : 100;
    
    const size = type === 'circle' ? 150 : 200;
    const newShape: CanvasShape = {
      id: generateId(), 
      x: centerX, 
      y: centerY, 
      width: size, 
      height: type === 'circle' ? size : 150, 
      label: 'Group', 
      color: '#f5f5f5',
      type
    };
    saveData({ ...data, shapes: [...data.shapes, newShape] });
    setSelectedShape(newShape.id);
    setSelectedNode(null);
    setEditingShape(newShape.id);
  }, [data, saveData, viewport]);

  const deleteNode = useCallback((nodeId: string) => {
    const node = data.nodes.find(n => n.id === nodeId);
    let newStacks = [...data.stacks];
    
    // Remove from stack if in one
    if (node?.stackId) {
      newStacks = newStacks.map(s => s.id === node.stackId 
        ? { ...s, nodeIds: s.nodeIds.filter(id => id !== nodeId) }
        : s
      ).filter(s => s.nodeIds.length > 0);
    }
    
    const newNodes = data.nodes.filter(n => n.id !== nodeId);
    const newConnections = data.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    saveData({ ...data, nodes: newNodes, connections: newConnections, stacks: newStacks });
    setSelectedNode(null);
  }, [data, saveData]);

  const deleteShape = useCallback((shapeId: string) => {
    saveData({ ...data, shapes: data.shapes.filter(s => s.id !== shapeId) });
    setSelectedShape(null);
  }, [data, saveData]);

  const updateNode = useCallback((nodeId: string, updates: Partial<CanvasNode>) => {
    const newNodes = data.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n);
    saveData({ ...data, nodes: newNodes }, true);
  }, [data, saveData]);

  const updateShape = useCallback((shapeId: string, updates: Partial<CanvasShape>) => {
    const newShapes = data.shapes.map(s => s.id === shapeId ? { ...s, ...updates } : s);
    saveData({ ...data, shapes: newShapes }, true);
  }, [data, saveData]);

  const setNodeColor = useCallback((nodeId: string, color: string) => {
    pushHistory();
    updateNode(nodeId, { color });
    setShowColorPicker(false);
  }, [updateNode, pushHistory]);

  const setShapeColor = useCallback((shapeId: string, color: string) => {
    pushHistory();
    updateShape(shapeId, { color });
    setShowColorPicker(false);
  }, [updateShape, pushHistory]);

  // Stack manipulation functions
  const moveNodeInStack = useCallback((nodeId: string, direction: 'up' | 'down') => {
    const node = data.nodes.find(n => n.id === nodeId);
    if (!node?.stackId) return;
    
    const stack = data.stacks.find(s => s.id === node.stackId);
    if (!stack) return;
    
    const currentIndex = stack.nodeIds.indexOf(nodeId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= stack.nodeIds.length) return;
    
    pushHistory();
    const newNodeIds = [...stack.nodeIds];
    [newNodeIds[currentIndex], newNodeIds[newIndex]] = [newNodeIds[newIndex], newNodeIds[currentIndex]];
    
    const newStacks = data.stacks.map(s => s.id === stack.id ? { ...s, nodeIds: newNodeIds } : s);
    saveData({ ...data, stacks: newStacks }, true);
  }, [data, saveData, pushHistory]);

  const detachNodeFromStack = useCallback((nodeId: string) => {
    const node = data.nodes.find(n => n.id === nodeId);
    if (!node?.stackId) return;
    
    const stack = data.stacks.find(s => s.id === node.stackId);
    if (!stack) return;
    
    pushHistory();
    let newNodes = [...data.nodes];
    let newStacks = [...data.stacks];
    
    // Remove node from stack
    newStacks = newStacks.map(s => {
      if (s.id === stack.id) {
        return { ...s, nodeIds: s.nodeIds.filter(id => id !== nodeId) };
      }
      return s;
    });
    
    // Position the detached node to the right of the stack
    const nodeIndex = stack.nodeIds.indexOf(nodeId);
    newNodes = newNodes.map(n => n.id === nodeId 
      ? { ...n, x: stack.x + 150, y: stack.y + nodeIndex * (NODE_HEIGHT + 4), stackId: undefined, stackIndex: undefined }
      : n
    );
    
    // Remove stack if only 1 node left
    const updatedStack = newStacks.find(s => s.id === stack.id);
    if (updatedStack && updatedStack.nodeIds.length <= 1) {
      if (updatedStack.nodeIds.length === 1) {
        const remainingNodeId = updatedStack.nodeIds[0];
        newNodes = newNodes.map(n => n.id === remainingNodeId ? { ...n, stackId: undefined, stackIndex: undefined } : n);
      }
      newStacks = newStacks.filter(s => s.id !== stack.id);
    }
    
    saveData({ ...data, nodes: newNodes, stacks: newStacks }, true);
  }, [data, saveData, pushHistory]);

  const deleteConnection = useCallback((connectionId: string) => {
    pushHistory();
    const newConnections = data.connections.filter(c => c.id !== connectionId);
    saveData({ ...data, connections: newConnections }, true);
    setHoveredConnection(null);
  }, [data, saveData, pushHistory]);

  // Get nodes in render order (stacked nodes positioned correctly)
  const getNodePosition = useCallback((node: CanvasNode) => {
    if (node.stackId) {
      const stack = data.stacks.find(s => s.id === node.stackId);
      if (stack) {
        const index = stack.nodeIds.indexOf(node.id);
        return { x: stack.x, y: stack.y + index * (NODE_HEIGHT + 4) };
      }
    }
    return { x: node.x, y: node.y };
  }, [data.stacks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNode || editingShape) {
        if (e.key === 'Escape') { setEditingNode(null); setEditingShape(null); }
        return;
      }
      if (e.key === 'Tab') { e.preventDefault(); addNode(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) { e.preventDefault(); deleteNode(selectedNode); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShape) { e.preventDefault(); deleteShape(selectedShape); }
      if (e.key === 'Enter' && selectedNode) { e.preventDefault(); setEditingNode(selectedNode); }
      if (e.key === 'Enter' && selectedShape) { e.preventDefault(); setEditingShape(selectedShape); }
      if (e.key === 'Escape') { setSelectedNode(null); setSelectedShape(null); setShowColorPicker(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addNode, deleteNode, deleteShape, selectedNode, selectedShape, editingNode, editingShape, undo, redo]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // If we're in connect mode, complete the connection
    if (connectingFrom && connectingFrom !== nodeId) {
      const exists = data.connections.some(c => 
        (c.from === connectingFrom && c.to === nodeId) || (c.from === nodeId && c.to === connectingFrom)
      );
      if (!exists) {
        pushHistory();
        saveData({ 
          ...data, 
          connections: [...data.connections, { id: generateId(), from: connectingFrom, to: nodeId }] 
        }, true);
      }
      setConnectingFrom(null);
      return;
    }

    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Don't allow dragging stacked nodes - they use buttons instead
    if (node.stackId) {
      setSelectedNode(nodeId);
      setSelectedShape(null);
      setShowColorPicker(false);
      return;
    }

    setSelectedNode(nodeId);
    setSelectedShape(null);
    setDraggingNode(nodeId);
    setShowColorPicker(false);
    
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    dragOffset.current = { x: canvasX - node.x, y: canvasY - node.y };
  }, [data, viewport, connectingFrom, pushHistory, saveData]);

  const handleShapeMouseDown = useCallback((e: React.MouseEvent, shapeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    const shape = data.shapes.find(s => s.id === shapeId);
    if (!shape) return;

    setSelectedShape(shapeId);
    setSelectedNode(null);
    setDraggingShape(shapeId);
    setShowColorPicker(false);
    
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    dragOffset.current = { x: canvasX - shape.x, y: canvasY - shape.y };
  }, [data.shapes, viewport]);

  const handleConnectClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingFrom(nodeId);
  }, []);

  const handleShapeResizeStart = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    const shape = data.shapes.find(s => s.id === shapeId);
    if (!shape) return;
    
    setResizingShape(shapeId);
    resizeStart.current = { x: e.clientX, y: e.clientY, width: shape.width, height: shape.height };
  }, [data.shapes]);

  const handleStackHeaderMouseDown = useCallback((e: React.MouseEvent, stackId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    const stack = data.stacks.find(s => s.id === stackId);
    if (!stack) return;

    setSelectedStack(stackId);
    setSelectedNode(null);
    setSelectedShape(null);
    setDraggingStackHeader(stackId);
    setShowColorPicker(false);
    
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    dragOffset.current = { x: canvasX - stack.x, y: canvasY - stack.y };
  }, [data.stacks, viewport]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isCanvasArea = target === canvasRef.current || target.classList.contains(styles.canvasContent);
    if (!isCanvasArea) return;
    
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, viewX: viewport.x, viewY: viewport.y };
      return;
    }

    if (e.detail === 2) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        addNode(x, y);
      }
      return;
    }

    if (e.button === 0) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, viewX: viewport.x, viewY: viewport.y };
    }

    setSelectedNode(null);
    setSelectedShape(null);
    setSelectedStack(null);
    setConnectingFrom(null);
    setEditingNode(null);
    setEditingShape(null);
    setShowColorPicker(false);
  }, [viewport, addNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setViewport(v => ({ ...v, x: panStart.current.viewX + dx, y: panStart.current.viewY + dy }));
      return;
    }

    if (resizingShape) {
      const dx = (e.clientX - resizeStart.current.x) / viewport.zoom;
      const dy = (e.clientY - resizeStart.current.y) / viewport.zoom;
      const newWidth = Math.max(100, resizeStart.current.width + dx);
      const newHeight = Math.max(80, resizeStart.current.height + dy);
      const newShapes = data.shapes.map(s => s.id === resizingShape ? { ...s, width: newWidth, height: newHeight } : s);
      setData(prev => ({ ...prev, shapes: newShapes }));
      return;
    }

    if (draggingShape) {
      const canvasX = (e.clientX - viewport.x) / viewport.zoom;
      const canvasY = (e.clientY - viewport.y) / viewport.zoom;
      const newX = canvasX - dragOffset.current.x;
      const newY = canvasY - dragOffset.current.y;
      const newShapes = data.shapes.map(s => s.id === draggingShape ? { ...s, x: newX, y: newY } : s);
      setData(prev => ({ ...prev, shapes: newShapes }));
      return;
    }

    // Handle dragging stack via background
    if (draggingStackHeader) {
      const stack = data.stacks.find(s => s.id === draggingStackHeader);
      if (stack) {
        const canvasX = (e.clientX - viewport.x) / viewport.zoom;
        const canvasY = (e.clientY - viewport.y) / viewport.zoom;
        const newX = canvasX - dragOffset.current.x;
        const newY = canvasY - dragOffset.current.y;
        const dx = newX - stack.x;
        const dy = newY - stack.y;
        const newStacks = data.stacks.map(s => s.id === stack.id ? { ...s, x: newX, y: newY } : s);
        const newNodes = data.nodes.map(n => {
          if (n.stackId === stack.id) {
            return { ...n, x: n.x + dx, y: n.y + dy };
          }
          return n;
        });
        setData(prev => ({ ...prev, nodes: newNodes, stacks: newStacks }));
      }
      return;
    }

    if (!draggingNode) return;
    
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    const newX = canvasX - dragOffset.current.x;
    const newY = canvasY - dragOffset.current.y;
    
    const node = data.nodes.find(n => n.id === draggingNode);
    if (!node) return;

    // Check for snap to create/join stacks
    const snap = findSnapPosition(draggingNode, newX, newY);
    setSnapPreview(snap ? { x: snap.x, y: snap.y, stackId: snap.stackId } : null);
    
    const newNodes = data.nodes.map(n => n.id === draggingNode ? { ...n, x: newX, y: newY } : n);
    setData(prev => ({ ...prev, nodes: newNodes }));
  }, [draggingNode, draggingShape, draggingStackHeader, resizingShape, data, viewport, isPanning, findSnapPosition]);

  const handleMouseUp = useCallback(() => {
    const node = draggingNode ? data.nodes.find(n => n.id === draggingNode) : null;
    
    // Handle stack snapping on drop
    if (draggingNode && snapPreview && node) {
      let newNodes = [...data.nodes];
      let newStacks = [...data.stacks];
      
      if (snapPreview.stackId) {
        // Add to existing stack
        const stack = newStacks.find(s => s.id === snapPreview.stackId);
        if (stack) {
          stack.nodeIds.push(draggingNode);
          newNodes = newNodes.map(n => n.id === draggingNode 
            ? { ...n, x: snapPreview.x, y: snapPreview.y, stackId: stack.id, stackIndex: stack.nodeIds.length - 1 }
            : n
          );
        }
      } else {
        // Create new stack with target node and dragged node
        const targetNode = data.nodes.find(n => 
          Math.abs(n.x - snapPreview.x) < 5 && Math.abs(n.y + NODE_HEIGHT + 4 - snapPreview.y) < 5
        );
        if (targetNode && targetNode.id !== draggingNode) {
          const newStack: CanvasStack = {
            id: generateId(),
            x: targetNode.x,
            y: targetNode.y,
            nodeIds: [targetNode.id, draggingNode]
          };
          newStacks.push(newStack);
          newNodes = newNodes.map(n => {
            if (n.id === targetNode.id) return { ...n, stackId: newStack.id, stackIndex: 0 };
            if (n.id === draggingNode) return { ...n, x: snapPreview.x, y: snapPreview.y, stackId: newStack.id, stackIndex: 1 };
            return n;
          });
        }
      }
      
      pushHistory();
      const newData = { ...data, nodes: newNodes, stacks: newStacks };
      setData(newData);
      const json = JSON.stringify({ ...newData, viewport });
      lastSavedRef.current = json;
      onContentChange(json);
      setSnapPreview(null);
    } else if (draggingNode || draggingShape || draggingStackHeader || resizingShape) {
      const json = JSON.stringify({ ...data, viewport });
      lastSavedRef.current = json;
      onContentChange(json);
    }
    
    setDraggingNode(null);
    setDraggingShape(null);
    setDraggingStackHeader(null);
    setResizingShape(null);
    setIsPanning(false);
    setSnapPreview(null);
  }, [draggingNode, draggingShape, draggingStackHeader, resizingShape, snapPreview, data, viewport, onContentChange, pushHistory]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.25), 3);
    const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
    const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);
    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [viewport]);

  const resetView = useCallback(() => setViewport({ x: 0, y: 0, zoom: 1 }), []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button onClick={() => addNode()} className={styles.toolButton} title="Add note (Tab)">
          <PenLine size={18} strokeWidth={1} />
        </button>
        <button onClick={() => addShape('rectangle')} className={styles.toolButton} title="Add rectangle">
          <Square size={18} strokeWidth={1} />
        </button>
        <button onClick={() => addShape('circle')} className={styles.toolButton} title="Add circle">
          <Circle size={18} strokeWidth={1} />
        </button>
        <div className={styles.divider} />
        <button onClick={undo} className={styles.toolButton} disabled={history.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 size={18} strokeWidth={1} />
        </button>
        <button onClick={redo} className={styles.toolButton} disabled={future.length === 0} title="Redo (Ctrl+Y)">
          <Redo2 size={18} strokeWidth={1} />
        </button>
        {selectedNode && (
          <>
            <div className={styles.divider} />
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)} 
              className={styles.colorButton} 
              style={{ backgroundColor: data.nodes.find(n => n.id === selectedNode)?.color || '#e5e5e5' }}
              title="Change color"
            />
            <button onClick={() => deleteNode(selectedNode)} className={styles.toolButton} title="Delete (Del)">
              <Trash2 size={18} strokeWidth={1} />
            </button>
          </>
        )}
        {selectedShape && (
          <>
            <div className={styles.divider} />
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)} 
              className={styles.colorButton}
              style={{ backgroundColor: data.shapes.find(s => s.id === selectedShape)?.color || '#f5f5f5' }}
              title="Change color"
            />
            <button onClick={() => deleteShape(selectedShape)} className={styles.toolButton} title="Delete shape">
              <Trash2 size={18} strokeWidth={1} />
            </button>
          </>
        )}
        {connectingFrom && (
          <>
            <div className={styles.divider} />
            <span className={styles.hint}>Click a note to connect</span>
            <button onClick={() => setConnectingFrom(null)} className={styles.toolButton} title="Cancel">
              Cancel
            </button>
          </>
        )}
      </div>

      <div className={styles.zoomControls}>
        <button onClick={() => setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.2, 3) }))} className={styles.zoomButton} title="Zoom In">
          <ZoomIn size={16} strokeWidth={1} />
        </button>
        <span className={styles.zoomLevel}>{Math.round(viewport.zoom * 100)}%</span>
        <button onClick={() => setViewport(v => ({ ...v, zoom: Math.max(v.zoom * 0.8, 0.25) }))} className={styles.zoomButton} title="Zoom Out">
          <ZoomOut size={16} strokeWidth={1} />
        </button>
        <button onClick={resetView} className={styles.zoomButton} title="Reset View">
          <RotateCcw size={16} strokeWidth={1} />
        </button>
      </div>

      {showColorPicker && (selectedNode || selectedShape) && (
        <div className={styles.colorPicker}>
          {(selectedNode ? NODE_COLORS : SHAPE_COLORS).map(color => (
            <button key={color} className={styles.colorOption} style={{ backgroundColor: color }}
              onClick={() => selectedNode ? setNodeColor(selectedNode, color) : selectedShape && setShapeColor(selectedShape, color)} />
          ))}
        </div>
      )}

      <div
        ref={canvasRef}
        className={styles.canvas}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <div
          className={styles.canvasContent}
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}
        >
          {/* Background shapes (rendered first, behind nodes) */}
          {data.shapes.map(shape => (
            <div
              key={shape.id}
              className={`${styles.shape} ${selectedShape === shape.id ? styles.selected : ''} ${shape.type === 'circle' ? styles.circleShape : ''}`}
              style={{
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                backgroundColor: shape.color,
              }}
              onMouseDown={(e) => handleShapeMouseDown(e, shape.id)}
              onDoubleClick={() => setEditingShape(shape.id)}
            >
              {editingShape === shape.id ? (
                <input
                  type="text"
                  className={styles.shapeLabel}
                  value={shape.label}
                  onChange={(e) => updateShape(shape.id, { label: e.target.value })}
                  onBlur={() => setEditingShape(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingShape(null); }}
                  autoFocus
                />
              ) : (
                <span className={styles.shapeLabel}>{shape.label}</span>
              )}
              {selectedShape === shape.id && (
                <div
                  className={styles.shapeResizeHandle}
                  onMouseDown={(e) => handleShapeResizeStart(e, shape.id)}
                />
              )}
            </div>
          ))}

          {/* Connections SVG */}
          <svg className={styles.connections}>
            {data.connections.map(conn => {
              const fromNode = data.nodes.find(n => n.id === conn.from);
              const toNode = data.nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              const fromPos = getNodePosition(fromNode);
              const toPos = getNodePosition(toNode);
              const x1 = fromPos.x + 60;
              const y1 = fromPos.y + 22;
              const x2 = toPos.x + 60;
              const y2 = toPos.y + 22;
              return (
                <g key={conn.id}>
                  {/* Invisible wider line for easier hover */}
                  <line
                    className={styles.connectionHitArea}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    onMouseEnter={() => setHoveredConnection(conn.id)}
                    onMouseLeave={() => setHoveredConnection(null)}
                  />
                  <line
                    className={`${styles.connectionLine} ${hoveredConnection === conn.id ? styles.hovered : ''}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                  />
                </g>
              );
            })}
          </svg>

          {/* Connection delete buttons */}
          {data.connections.map(conn => {
            if (hoveredConnection !== conn.id) return null;
            const fromNode = data.nodes.find(n => n.id === conn.from);
            const toNode = data.nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            const fromPos = getNodePosition(fromNode);
            const toPos = getNodePosition(toNode);
            const midX = (fromPos.x + toPos.x) / 2 + 60;
            const midY = (fromPos.y + toPos.y) / 2 + 22;
            return (
              <button
                key={`del-${conn.id}`}
                className={styles.connectionDeleteBtn}
                style={{ left: midX - 10, top: midY - 10 }}
                onClick={() => deleteConnection(conn.id)}
                onMouseEnter={() => setHoveredConnection(conn.id)}
                onMouseLeave={() => setHoveredConnection(null)}
                title="Remove connection"
              >
                <Unplug size={14} />
              </button>
            );
          })}

          {/* Snap preview indicator */}
          {snapPreview && (
            <div
              className={styles.snapPreview}
              style={{ left: snapPreview.x, top: snapPreview.y }}
            />
          )}

          {/* Stack backgrounds (rendered before nodes so they appear behind) */}
          {data.stacks.map(stack => {
            const stackHeight = stack.nodeIds.length * (NODE_HEIGHT + 4) + 8;
            return (
              <div
                key={`stack-bg-${stack.id}`}
                className={`${styles.stackBackground} ${selectedStack === stack.id ? styles.selected : ''}`}
                style={{ 
                  left: stack.x - 8, 
                  top: stack.y - 28,
                  width: 136,
                  height: stackHeight + 28,
                }}
                onMouseDown={(e) => handleStackHeaderMouseDown(e, stack.id)}
              >
                <div className={styles.stackHandle}>
                  <GripHorizontal size={14} className={styles.stackHandleIcon} />
                </div>
              </div>
            );
          })}

          {/* Nodes */}
          {data.nodes.map(node => {
            const pos = getNodePosition(node);
            const stack = node.stackId ? data.stacks.find(s => s.id === node.stackId) : null;
            const nodeIndex = stack ? stack.nodeIds.indexOf(node.id) : -1;
            const isFirst = nodeIndex === 0;
            const isLast = stack ? nodeIndex === stack.nodeIds.length - 1 : false;
            const isHovered = hoveredNode === node.id;
            
            return (
              <div
                key={node.id}
                className={`${styles.node} ${selectedNode === node.id ? styles.selected : ''} ${connectingFrom === node.id ? styles.connecting : ''} ${connectingFrom && connectingFrom !== node.id ? styles.connectTarget : ''} ${node.stackId ? styles.stacked : ''}`}
                style={{ left: pos.x, top: pos.y, backgroundColor: node.color || '#e5e5e5' }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onDoubleClick={() => setEditingNode(node.id)}
              >
                {editingNode === node.id ? (
                  <input
                    type="text"
                    className={styles.nodeInput}
                    value={node.text}
                    onChange={(e) => updateNode(node.id, { text: e.target.value })}
                    onBlur={() => setEditingNode(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNode(null); }}
                    placeholder="Type here..."
                    autoFocus
                  />
                ) : (
                  <span className={styles.nodeText}>{node.text || 'New note'}</span>
                )}
                
                {/* Stack control buttons on hover */}
                {node.stackId && isHovered && !editingNode && (
                  <div 
                    className={styles.stackControls}
                    onMouseEnter={() => setHoveredNode(node.id)}
                  >
                    {!isFirst && (
                      <button 
                        className={styles.stackControlBtn} 
                        onClick={(e) => { e.stopPropagation(); moveNodeInStack(node.id, 'up'); }}
                        title="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                    )}
                    {!isLast && (
                      <button 
                        className={styles.stackControlBtn} 
                        onClick={(e) => { e.stopPropagation(); moveNodeInStack(node.id, 'down'); }}
                        title="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                    )}
                    <button 
                      className={styles.stackControlBtn} 
                      onClick={(e) => { e.stopPropagation(); detachNodeFromStack(node.id); }}
                      title="Remove from stack"
                    >
                      <Unlink size={14} />
                    </button>
                  </div>
                )}
                
                {/* Connect button on hover */}
                {isHovered && !editingNode && (
                  <button 
                    className={`${styles.connectBtn} ${connectingFrom === node.id ? styles.active : ''}`}
                    onClick={(e) => handleConnectClick(e, node.id)}
                    title="Connect to another note"
                  >
                    <Link size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {data.nodes.length === 0 && data.shapes.length === 0 && (
            <div className={styles.emptyState}>
              <p>Double-click to add a note</p>
              <p className={styles.emptyHint}>or press Tab</p>
            </div>
          )}
        </div>
      </div>

      {/* Info button */}
      <div className={styles.infoButton}>
        <button onClick={() => setShowInfo(!showInfo)} className={styles.zoomButton} title="Keyboard shortcuts">
          <Info size={16} strokeWidth={1} />
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className={styles.infoPanel}>
          <h4 className={styles.infoTitle}>Quick Reference</h4>
          
          <h5 className={styles.infoSubtitle}>Shortcuts</h5>
          <div className={styles.infoGrid}>
            <span className={styles.infoKey}>Tab</span>
            <span className={styles.infoValue}>Add new note</span>
            <span className={styles.infoKey}>Enter</span>
            <span className={styles.infoValue}>Edit selected</span>
            <span className={styles.infoKey}>Delete</span>
            <span className={styles.infoValue}>Remove selected</span>
            <span className={styles.infoKey}>Ctrl+Z</span>
            <span className={styles.infoValue}>Undo</span>
            <span className={styles.infoKey}>Ctrl+Y</span>
            <span className={styles.infoValue}>Redo</span>
            <span className={styles.infoKey}>Esc</span>
            <span className={styles.infoValue}>Deselect</span>
          </div>
          
          <h5 className={styles.infoSubtitle}>Canvas</h5>
          <div className={styles.infoGrid}>
            <span className={styles.infoKey}>Scroll</span>
            <span className={styles.infoValue}>Zoom in/out</span>
            <span className={styles.infoKey}>Drag</span>
            <span className={styles.infoValue}>Pan canvas</span>
            <span className={styles.infoKey}>Dbl-click</span>
            <span className={styles.infoValue}>Add note</span>
          </div>
          
          <h5 className={styles.infoSubtitle}>Tips</h5>
          <ul className={styles.infoList}>
            <li>Hover note → click link icon → click target</li>
            <li>Drag note below another to stack</li>
            <li>Hover connection line to delete</li>
          </ul>
        </div>
      )}
    </div>
  );
}
