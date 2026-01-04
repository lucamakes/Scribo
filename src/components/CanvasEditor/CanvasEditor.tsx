'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Trash2, Link2, Unlink } from 'lucide-react';
import styles from './CanvasEditor.module.css';

interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  width: number;
  color: string;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

interface CanvasData {
  notes: Note[];
  connections: Connection[];
  viewOffset: { x: number; y: number };
  zoom: number;
}

interface CanvasEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

const COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff', '#e0e7ff', '#ffffff'];

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function CanvasEditor({ content, onContentChange }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const lastLoadedContentRef = useRef<string>('');
  const isUserEditingRef = useRef(false);

  // Load content when prop changes (from database)
  useEffect(() => {
    // Skip if this is the same content we already loaded or if user is actively editing
    if (content === lastLoadedContentRef.current || isUserEditingRef.current) return;
    
    lastLoadedContentRef.current = content;

    if (content) {
      try {
        const data: CanvasData = JSON.parse(content);
        setNotes(data.notes || []);
        setConnections(data.connections || []);
        setViewOffset(data.viewOffset || { x: 0, y: 0 });
        setZoom(data.zoom || 1);
      } catch {
        // Invalid JSON, start fresh
        setNotes([]);
        setConnections([]);
        setViewOffset({ x: 0, y: 0 });
        setZoom(1);
      }
    } else {
      // Empty content, start fresh
      setNotes([]);
      setConnections([]);
      setViewOffset({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [content]);

  // Save content when data changes
  const saveContent = useCallback(() => {
    const data: CanvasData = { notes, connections, viewOffset, zoom };
    const json = JSON.stringify(data);
    lastLoadedContentRef.current = json; // Track what we're saving to avoid reload loop
    onContentChange(json);
  }, [notes, connections, viewOffset, zoom, onContentChange]);

  // Mark user as editing when notes/connections change, then save
  useEffect(() => {
    // Only save if we have actually loaded content before (not on initial mount)
    if (lastLoadedContentRef.current || notes.length > 0 || connections.length > 0) {
      isUserEditingRef.current = true;
      saveContent();
      // Reset editing flag after a short delay
      const timeout = setTimeout(() => {
        isUserEditingRef.current = false;
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [notes, connections, saveContent]);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - viewOffset.x) / zoom,
      y: (screenY - rect.top - viewOffset.y) / zoom,
    };
  }, [viewOffset, zoom]);

  // Double-click to create note
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    
    const pos = screenToCanvas(e.clientX, e.clientY);
    const newNote: Note = {
      id: generateId(),
      x: pos.x - 75,
      y: pos.y - 20,
      text: '',
      width: 150,
      color: COLORS[0],
    };
    
    setNotes(prev => [...prev, newNote]);
    setEditingNoteId(newNote.id);
    setSelectedNoteId(newNote.id);
  }, [screenToCanvas]);

  // Pan canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
    }
  }, [viewOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setViewOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggedNote) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      setNotes(prev => prev.map(note =>
        note.id === draggedNote
          ? { ...note, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : note
      ));
    }
  }, [isPanning, panStart, draggedNote, dragOffset, screenToCanvas]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggedNote(null);
  }, []);

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.25), 3));
  }, []);

  // Note drag start
  const handleNoteDragStart = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const pos = screenToCanvas(e.clientX, e.clientY);
    setDragOffset({ x: pos.x - note.x, y: pos.y - note.y });
    setDraggedNote(noteId);
    setSelectedNoteId(noteId);
  }, [notes, screenToCanvas]);

  // Update note text
  const handleNoteTextChange = useCallback((noteId: string, text: string) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId ? { ...note, text } : note
    ));
  }, []);

  // Delete selected note
  const deleteSelectedNote = useCallback(() => {
    if (!selectedNoteId) return;
    setNotes(prev => prev.filter(n => n.id !== selectedNoteId));
    setConnections(prev => prev.filter(c => c.from !== selectedNoteId && c.to !== selectedNoteId));
    setSelectedNoteId(null);
  }, [selectedNoteId]);

  // Change note color
  const changeNoteColor = useCallback((color: string) => {
    if (!selectedNoteId) return;
    setNotes(prev => prev.map(note =>
      note.id === selectedNoteId ? { ...note, color } : note
    ));
  }, [selectedNoteId]);

  // Start connecting notes
  const startConnecting = useCallback(() => {
    if (selectedNoteId) {
      setConnectingFrom(selectedNoteId);
    }
  }, [selectedNoteId]);

  // Complete connection
  const handleNoteClick = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    
    if (connectingFrom && connectingFrom !== noteId) {
      // Check if connection already exists
      const exists = connections.some(
        c => (c.from === connectingFrom && c.to === noteId) ||
             (c.from === noteId && c.to === connectingFrom)
      );
      
      if (!exists) {
        setConnections(prev => [...prev, {
          id: generateId(),
          from: connectingFrom,
          to: noteId,
        }]);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNoteId(noteId);
    }
  }, [connectingFrom, connections]);

  // Remove connections from selected note
  const removeConnections = useCallback(() => {
    if (!selectedNoteId) return;
    setConnections(prev => prev.filter(c => c.from !== selectedNoteId && c.to !== selectedNoteId));
  }, [selectedNoteId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNoteId) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNote();
      } else if (e.key === 'Escape') {
        setSelectedNoteId(null);
        setConnectingFrom(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingNoteId, deleteSelectedNote]);

  // Click outside to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setSelectedNoteId(null);
      setConnectingFrom(null);
    }
  }, []);

  // Get note center for connection lines
  const getNoteCenter = (note: Note) => ({
    x: note.x + note.width / 2,
    y: note.y + 20,
  });

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.hint}>
          Double-click to add a note • Drag notes to move • Select and press Delete to remove
        </div>
        <div className={styles.toolGroup}>
          {selectedNote && (
            <>
              <div className={styles.colorPicker}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`${styles.colorSwatch} ${selectedNote.color === color ? styles.activeColor : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => changeNoteColor(color)}
                    title="Change color"
                  />
                ))}
              </div>
              <div className={styles.divider} />
              <button
                className={`${styles.toolButton} ${connectingFrom ? styles.active : ''}`}
                onClick={startConnecting}
                title="Connect to another note"
              >
                <Link2 size={18} />
              </button>
              <button
                className={styles.toolButton}
                onClick={removeConnections}
                title="Remove connections"
              >
                <Unlink size={18} />
              </button>
              <button
                className={styles.toolButton}
                onClick={deleteSelectedNote}
                title="Delete note"
              >
                <Trash2 size={18} />
              </button>
              <div className={styles.divider} />
            </>
          )}
          <button
            className={styles.toolButton}
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))}
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <button
            className={styles.toolButton}
            onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.25))}
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={styles.canvas}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        {connectingFrom && (
          <div className={styles.connectingHint}>
            Click another note to connect, or press Escape to cancel
          </div>
        )}

        <svg
          className={styles.connectionsSvg}
          style={{
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          }}
        >
          {connections.map(conn => {
            const fromNote = notes.find(n => n.id === conn.from);
            const toNote = notes.find(n => n.id === conn.to);
            if (!fromNote || !toNote) return null;

            const from = getNoteCenter(fromNote);
            const to = getNoteCenter(toNote);

            return (
              <line
                key={conn.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={styles.connectionLine}
              />
            );
          })}
        </svg>

        <div
          className={styles.notesContainer}
          style={{
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          }}
        >
          {notes.map(note => (
            <div
              key={note.id}
              className={`${styles.note} ${selectedNoteId === note.id ? styles.selected : ''} ${connectingFrom === note.id ? styles.connecting : ''}`}
              style={{
                left: note.x,
                top: note.y,
                width: note.width,
                backgroundColor: note.color,
              }}
              onMouseDown={(e) => handleNoteDragStart(e, note.id)}
              onClick={(e) => handleNoteClick(e, note.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingNoteId(note.id);
              }}
            >
              {editingNoteId === note.id ? (
                <textarea
                  className={styles.noteTextarea}
                  value={note.text}
                  onChange={(e) => handleNoteTextChange(note.id, e.target.value)}
                  onBlur={() => setEditingNoteId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingNoteId(null);
                    }
                  }}
                  autoFocus
                  placeholder="Type your note..."
                />
              ) : (
                <div className={styles.noteText}>
                  {note.text || <span className={styles.placeholder}>Double-click to edit</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
