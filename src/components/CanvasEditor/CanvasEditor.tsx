'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import styles from './CanvasEditor.module.css';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
}

interface CanvasEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function parseCanvasData(content: string): CanvasData {
  try {
    const data = JSON.parse(content);
    return {
      nodes: data.nodes || [],
      connections: data.connections || [],
    };
  } catch {
    return { nodes: [], connections: [] };
  }
}

export function CanvasEditor({ content, onContentChange }: CanvasEditorProps) {
  const [data, setData] = useState<CanvasData>(() => parseCanvasData(content));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Sync content changes
  useEffect(() => {
    const newData = parseCanvasData(content);
    setData(newData);
  }, [content]);

  const saveData = useCallback((newData: CanvasData) => {
    setData(newData);
    onContentChange(JSON.stringify(newData));
  }, [onContentChange]);

  const addNode = useCallback(() => {
    const newNode: CanvasNode = {
      id: generateId(),
      x: 150 + Math.random() * 200,
      y: 150 + Math.random() * 200,
      text: 'New idea',
    };
    saveData({ ...data, nodes: [...data.nodes, newNode] });
    setEditingNode(newNode.id);
  }, [data, saveData]);

  const deleteNode = useCallback((nodeId: string) => {
    const newNodes = data.nodes.filter(n => n.id !== nodeId);
    const newConnections = data.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    saveData({ nodes: newNodes, connections: newConnections });
    setSelectedNode(null);
  }, [data, saveData]);

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    const newNodes = data.nodes.map(n => n.id === nodeId ? { ...n, text } : n);
    saveData({ ...data, nodes: newNodes });
  }, [data, saveData]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    if (connecting) {
      if (connecting !== nodeId) {
        const connectionExists = data.connections.some(
          c => (c.from === connecting && c.to === nodeId) || (c.from === nodeId && c.to === connecting)
        );
        if (!connectionExists) {
          const newConnection: CanvasConnection = {
            id: generateId(),
            from: connecting,
            to: nodeId,
          };
          saveData({ ...data, connections: [...data.connections, newConnection] });
        }
      }
      setConnecting(null);
      return;
    }

    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setSelectedNode(nodeId);
    setDraggingNode(nodeId);
    dragOffset.current = { x: e.clientX - node.x, y: e.clientY - node.y };
  }, [connecting, data, saveData]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNode) return;
    
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    
    const newNodes = data.nodes.map(n => 
      n.id === draggingNode ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
    );
    setData({ ...data, nodes: newNodes });
  }, [draggingNode, data]);

  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      onContentChange(JSON.stringify(data));
    }
    setDraggingNode(null);
  }, [draggingNode, data, onContentChange]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
      setConnecting(null);
      setEditingNode(null);
    }
  }, []);

  const handleDoubleClick = useCallback((nodeId: string) => {
    setEditingNode(nodeId);
  }, []);

  const startConnecting = useCallback((nodeId: string) => {
    setConnecting(nodeId);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button onClick={addNode} className={styles.toolButton} title="Add node">
          <Plus size={18} />
        </button>
        {selectedNode && (
          <>
            <button 
              onClick={() => startConnecting(selectedNode)} 
              className={`${styles.toolButton} ${connecting ? styles.active : ''}`}
              title="Connect to another node"
            >
              Connect
            </button>
            <button 
              onClick={() => deleteNode(selectedNode)} 
              className={styles.toolButton}
              title="Delete node"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
        {connecting && <span className={styles.hint}>Click another node to connect</span>}
      </div>

      <div 
        ref={canvasRef}
        className={styles.canvas}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
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
            style={{ left: node.x, top: node.y }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onDoubleClick={() => handleDoubleClick(node.id)}
          >
            {editingNode === node.id ? (
              <input
                type="text"
                value={node.text}
                onChange={(e) => updateNodeText(node.id, e.target.value)}
                onBlur={() => setEditingNode(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingNode(null)}
                className={styles.nodeInput}
                autoFocus
              />
            ) : (
              <span className={styles.nodeText}>{node.text}</span>
            )}
          </div>
        ))}

        {data.nodes.length === 0 && (
          <div className={styles.emptyState}>
            <p>Click the + button to add your first idea</p>
          </div>
        )}
      </div>
    </div>
  );
}
