'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, Undo2, Circle, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import styles from './CanvasEditor.module.css';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport?: { x: number; y: number; zoom: number };
}

interface CanvasEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

const NODE_COLORS = ['#e5e5e5', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8'];

function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function parseCanvasData(content: string): CanvasData {
  try {
    const data = JSON.parse(content);
    return {
      nodes: data.nodes || [],
      connections: data.connections || [],
      viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
    };
  } catch {
    return { nodes: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }
}

export function CanvasEditor({ content, onContentChange }: CanvasEditorProps) {
  const [data, setData] = useState<CanvasData>(() => parseCanvasData(content));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [history, setHistory] = useState<CanvasData[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0, viewX: 0, viewY: 0 });
  const lastSavedRef = useRef(content);

  // Sync content changes from parent
  useEffect(() => {
    if (content !== lastSavedRef.current) {
      const newData = parseCanvasData(content);
      setData(newData);
      if (newData.viewport) {
        setViewport(newData.viewport);
      }
      lastSavedRef.current = content;
    }
  }, [content]);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(data))]);
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
    setHistory(h => h.slice(0, -1));
    setData(prev);
    if (prev.viewport) setViewport(prev.viewport);
    const json = JSON.stringify(prev);
    lastSavedRef.current = json;
    onContentChange(json);
  }, [history, onContentChange]);

  const addNode = useCallback((x?: number, y?: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const centerX = x ?? (rect ? (rect.width / 2 - viewport.x) / viewport.zoom : 200);
    const centerY = y ?? (rect ? (rect.height / 2 - viewport.y) / viewport.zoom : 200);
    
    const newNode: CanvasNode = {
      id: generateId(),
      x: centerX,
      y: centerY,
      text: '',
      color: '#e5e5e5',
    };
    saveData({ ...data, nodes: [...data.nodes, newNode] });
    setSelectedNode(newNode.id);
    setEditingNode(newNode.id);
  }, [data, saveData, viewport]);

  const deleteNode = useCallback((nodeId: string) => {
    const newNodes = data.nodes.filter(n => n.id !== nodeId);
    const newConnections = data.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    saveData({ ...data, nodes: newNodes, connections: newConnections });
    setSelectedNode(null);
  }, [data, saveData]);

  const updateNode = useCallback((nodeId: string, updates: Partial<CanvasNode>) => {
    const newNodes = data.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n);
    saveData({ ...data, nodes: newNodes }, true);
  }, [data, saveData]);

  const setNodeColor = useCallback((nodeId: string, color: string) => {
    pushHistory();
    const newNodes = data.nodes.map(n => n.id === nodeId ? { ...n, color } : n);
    saveData({ ...data, nodes: newNodes }, true);
    setShowColorPicker(false);
  }, [data, saveData, pushHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNode) {
        if (e.key === 'Escape') {
          setEditingNode(null);
        }
        return;
      }

      // Tab - create new node
      if (e.key === 'Tab') {
        e.preventDefault();
        addNode();
      }
      // Delete/Backspace - delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        deleteNode(selectedNode);
      }
      // Enter - edit selected node
      if (e.key === 'Enter' && selectedNode && !editingNode) {
        e.preventDefault();
        setEditingNode(selectedNode);
      }
      // C - start connecting
      if (e.key === 'c' && selectedNode) {
        e.preventDefault();
        setConnecting(selectedNode);
      }
      // Escape - deselect
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setConnecting(null);
        setShowColorPicker(false);
      }
      // Ctrl+Z - undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addNode, deleteNode, selectedNode, editingNode, undo]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    if (connecting) {
      if (connecting !== nodeId) {
        const connectionExists = data.connections.some(
          c => (c.from === connecting && c.to === nodeId) || (c.from === nodeId && c.to === connecting)
        );
        if (!connectionExists) {
          pushHistory();
          const newConnection: CanvasConnection = { id: generateId(), from: connecting, to: nodeId };
          saveData({ ...data, connections: [...data.connections, newConnection] }, true);
        }
      }
      setConnecting(null);
      return;
    }

    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setSelectedNode(nodeId);
    setDraggingNode(nodeId);
    setShowColorPicker(false);
    
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    dragOffset.current = { x: canvasX - node.x, y: canvasY - node.y };
  }, [connecting, data, saveData, viewport, pushHistory]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle clicks on canvas or canvasContent, not on nodes
    const target = e.target as HTMLElement;
    const isCanvasArea = target === canvasRef.current || target.classList.contains(styles.canvasContent);
    if (!isCanvasArea) return;
    
    // Middle mouse or space+left click or just left click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, viewX: viewport.x, viewY: viewport.y };
      return;
    }

    // Double-click to create node
    if (e.detail === 2) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        addNode(x, y);
      }
      return;
    }

    // Single click - start panning
    if (e.button === 0) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, viewX: viewport.x, viewY: viewport.y };
    }

    setSelectedNode(null);
    setConnecting(null);
    setEditingNode(null);
    setShowColorPicker(false);
  }, [viewport, addNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setViewport(v => ({ ...v, x: panStart.current.viewX + dx, y: panStart.current.viewY + dy }));
      return;
    }

    if (!draggingNode) return;
    
    const canvasX = (e.clientX - viewport.x) / viewport.zoom;
    const canvasY = (e.clientY - viewport.y) / viewport.zoom;
    const newX = canvasX - dragOffset.current.x;
    const newY = canvasY - dragOffset.current.y;
    
    const newNodes = data.nodes.map(n => 
      n.id === draggingNode ? { ...n, x: newX, y: newY } : n
    );
    setData(prev => ({ ...prev, nodes: newNodes }));
  }, [draggingNode, data.nodes, viewport, isPanning]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      const json = JSON.stringify({ ...data, viewport });
      lastSavedRef.current = json;
      onContentChange(json);
    }
    setDraggingNode(null);
    setIsPanning(false);
  }, [draggingNode, data, viewport, onContentChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Smoother zoom with smaller steps
    const zoomFactor = e.deltaY > 0 ? 0.90 : 1.11;
    const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.25), 3);
    
    const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
    const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [viewport]);

  const handleDoubleClick = useCallback((nodeId: string) => {
    setEditingNode(nodeId);
  }, []);

  const startConnecting = useCallback((nodeId: string) => {
    setConnecting(nodeId);
  }, []);

  const resetView = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button onClick={() => addNode()} className={styles.toolButton} title="Add node (Tab)">
          <Plus size={18} />
        </button>
        <button onClick={undo} className={styles.toolButton} disabled={history.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <div className={styles.divider} />
        {selectedNode && (
          <>
            <button 
              onClick={() => startConnecting(selectedNode)} 
              className={`${styles.toolButton} ${connecting ? styles.active : ''}`}
              title="Connect (C)"
            >
              Connect
            </button>
            <button 
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={styles.toolButton}
              title="Change color"
            >
              <Circle size={18} fill={data.nodes.find(n => n.id === selectedNode)?.color || '#e5e5e5'} />
            </button>
            <button 
              onClick={() => deleteNode(selectedNode)} 
              className={styles.toolButton}
              title="Delete (Del)"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
        {connecting && <span className={styles.hint}>Click another node to connect</span>}
      </div>

      {/* Zoom controls - bottom right */}
      <div className={styles.zoomControls}>
        <button 
          onClick={() => setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.2, 3) }))} 
          className={styles.zoomButton} 
          title="Zoom In"
        >
          <ZoomIn size={16} strokeWidth={1} />
        </button>
        <span className={styles.zoomLevel}>{Math.round(viewport.zoom * 100)}%</span>
        <button 
          onClick={() => setViewport(v => ({ ...v, zoom: Math.max(v.zoom * 0.8, 0.25) }))} 
          className={styles.zoomButton} 
          title="Zoom Out"
        >
          <ZoomOut size={16} strokeWidth={1} />
        </button>
        <button onClick={resetView} className={styles.zoomButton} title="Reset View">
          <RotateCcw size={16} strokeWidth={1} />
        </button>
      </div>

      {showColorPicker && selectedNode && (
        <div className={styles.colorPicker}>
          {NODE_COLORS.map(color => (
            <button
              key={color}
              className={styles.colorOption}
              style={{ backgroundColor: color }}
              onClick={() => setNodeColor(selectedNode, color)}
            />
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
        style={{ cursor: isPanning ? 'grabbing' : connecting ? 'crosshair' : 'default' }}
      >
        <div 
          className={styles.canvasContent}
          style={{ 
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <svg className={styles.connections}>
            {data.connections.map(conn => {
              const fromNode = data.nodes.find(n => n.id === conn.from);
              const toNode = data.nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={conn.id}
                  x1={fromNode.x + 60}
                  y1={fromNode.y + 20}
                  x2={toNode.x + 60}
                  y2={toNode.y + 20}
                  className={styles.connectionLine}
                />
              );
            })}
          </svg>

          {data.nodes.map(node => (
            <div
              key={node.id}
              className={`${styles.node} ${selectedNode === node.id ? styles.selected : ''} ${connecting === node.id ? styles.connecting : ''}`}
              style={{ left: node.x, top: node.y, backgroundColor: node.color || '#e5e5e5' }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={() => handleDoubleClick(node.id)}
            >
              {editingNode === node.id ? (
                <input
                  type="text"
                  value={node.text}
                  onChange={(e) => updateNode(node.id, { text: e.target.value })}
                  onBlur={() => setEditingNode(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingNode(null);
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      setEditingNode(null);
                      addNode();
                    }
                  }}
                  className={styles.nodeInput}
                  placeholder="Type here..."
                  autoFocus
                />
              ) : (
                <span className={styles.nodeText}>{node.text || 'Double-click to edit'}</span>
              )}
            </div>
          ))}
        </div>

        {data.nodes.length === 0 && (
          <div className={styles.emptyState}>
            <p>Double-click or press Tab to add your first idea</p>
            <p className={styles.emptyHint}>Scroll to zoom • Drag to pan</p>
          </div>
        )}
      </div>

      {/* Info button - bottom left */}
      <div className={styles.infoButton}>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className={styles.zoomButton}
          title="Keyboard shortcuts"
        >
          <Info size={16} strokeWidth={1} />
        </button>
      </div>

      {showInfo && (
        <div className={styles.infoPanel}>
          <h3 className={styles.infoTitle}>Keyboard Shortcuts</h3>
          <ul className={styles.infoList}>
            <li><strong>Tab</strong> — Create new node</li>
            <li><strong>Enter</strong> — Edit selected node</li>
            <li><strong>C</strong> — Connect mode</li>
            <li><strong>Delete</strong> — Delete selected</li>
            <li><strong>Ctrl+Z</strong> — Undo</li>
            <li><strong>Escape</strong> — Deselect</li>
          </ul>
          <h4 className={styles.infoSubtitle}>Navigation</h4>
          <ul className={styles.infoList}>
            <li><strong>Scroll</strong> — Zoom in/out</li>
            <li><strong>Drag</strong> — Pan canvas</li>
            <li><strong>Double-click</strong> — Create node at cursor</li>
          </ul>
        </div>
      )}
    </div>
  );
}
