'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  X, Upload, FileJson, FileType, Folder, FileText, 
  ChevronRight, ChevronLeft, Trash2, GripVertical,
  Pencil, Check
} from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import { 
  parseProjectImport, 
  parseHtmlImport,
} from '@/lib/services/exportService';
import { projectService } from '@/lib/services/projectService';
import { itemService } from '@/lib/services/itemService';
import { supabase } from '@/lib/supabase';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: { id: string; name: string; createdAt: string }) => void;
}

interface StructureItem {
  id: string;
  name: string;
  content: string;
  type: 'file' | 'folder';
  indent: number;
}

type ImportType = 'json' | 'html' | null;
type Step = 'select' | 'upload' | 'structure' | 'configure';

export function ImportModal({ isOpen, onClose, onProjectCreated }: ImportModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [importType, setImportType] = useState<ImportType>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // JSON import state
  const [jsonData, setJsonData] = useState<any>(null);
  
  // Structure editor state
  const [structureItems, setStructureItems] = useState<StructureItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Common state
  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('select');
    setImportType(null);
    setIsDragging(false);
    setImporting(false);
    setError(null);
    setJsonData(null);
    setStructureItems([]);
    setEditingId(null);
    setEditingName('');
    setDraggedIndex(null);
    setDragOverIndex(null);
    setSelectedItemId(null);
    setProjectName('');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [importType]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [importType]);

  const processFile = async (file: File) => {
    setImporting(true);
    setError(null);

    try {
      const content = await readFileContent(file);
      const fileName = file.name.replace(/\.[^/.]+$/, '');

      if (importType === 'json') {
        const data = parseProjectImport(content);
        setJsonData(data);
        setProjectName(data.project.name);
        setStep('configure');
      } else if (importType === 'html') {
        const items = parseHtmlImport(content);
        // Convert to structure items
        const structure: StructureItem[] = items.map(item => ({
          id: item.id,
          name: item.name,
          content: item.content,
          type: item.suggestedType,
          indent: item.level,
        }));
        setStructureItems(structure);
        setProjectName(fileName);
        setStep('structure');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setImporting(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Structure editor functions
  const toggleItemType = (id: string) => {
    setStructureItems(prev => {
      const index = prev.findIndex(i => i.id === id);
      if (index === -1) return prev;
      
      const item = prev[index];
      const newType = item.type === 'folder' ? 'file' : 'folder';
      
      // If changing to file, check if any items are nested inside this one
      if (newType === 'file') {
        // Check if there are items nested under this one
        for (let i = index + 1; i < prev.length; i++) {
          if (prev[i].indent <= item.indent) break;
          if (prev[i].indent > item.indent) {
            // There are nested items - can't convert to file
            return prev;
          }
        }
      }
      
      return prev.map((it, i) => 
        i === index ? { ...it, type: newType } : it
      );
    });
  };

  const indentItem = (id: string) => {
    setStructureItems(prev => {
      const index = prev.findIndex(i => i.id === id);
      if (index <= 0) return prev;
      
      const currentItem = prev[index];
      const prevItem = prev[index - 1];
      
      // Can only indent one level deeper than the item directly above
      if (currentItem.indent > prevItem.indent) return prev;
      
      // Find the parent we'd be nesting into
      let parentIndex = -1;
      for (let i = index - 1; i >= 0; i--) {
        if (prev[i].indent === currentItem.indent) {
          parentIndex = i;
          break;
        }
        if (prev[i].indent < currentItem.indent) {
          parentIndex = i;
          break;
        }
      }
      
      // If parent is a file, can't indent
      if (parentIndex >= 0 && prev[parentIndex].type === 'file' && prev[parentIndex].indent === currentItem.indent) {
        return prev;
      }
      
      // Check if the item above is a file at the same level - can't nest into it
      if (prevItem.type === 'file' && prevItem.indent === currentItem.indent) {
        return prev;
      }
      
      return prev.map((item, i) => 
        i === index ? { ...item, indent: currentItem.indent + 1 } : item
      );
    });
  };

  const outdentItem = (id: string) => {
    setStructureItems(prev => prev.map(item => 
      item.id === id ? { ...item, indent: Math.max(item.indent - 1, 0) } : item
    ));
  };

  const deleteItem = (id: string) => {
    setStructureItems(prev => prev.filter(item => item.id !== id));
  };

  const addItem = (afterId: string | null, type: 'file' | 'folder') => {
    const newItem: StructureItem = {
      id: `new-${Date.now()}`,
      name: type === 'folder' ? 'New Folder' : 'New Document',
      content: '',
      type,
      indent: 0,
    };

    if (afterId === null) {
      setStructureItems(prev => [...prev, newItem]);
    } else {
      setStructureItems(prev => {
        const index = prev.findIndex(i => i.id === afterId);
        if (index === -1) return [...prev, newItem];
        
        // Match indent of the item we're adding after
        newItem.indent = prev[index].indent;
        
        const newItems = [...prev];
        newItems.splice(index + 1, 0, newItem);
        return newItems;
      });
    }

    // Start editing the new item
    setEditingId(newItem.id);
    setEditingName(newItem.name);
  };

  const startEditing = (item: StructureItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const saveEditing = () => {
    if (editingId && editingName.trim()) {
      setStructureItems(prev => prev.map(item =>
        item.id === editingId ? { ...item, name: editingName.trim() } : item
      ));
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  // Drag and drop for reordering
  const handleItemDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleItemDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setStructureItems(prev => {
        const items = [...prev];
        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(index, 0, draggedItem);
        return items;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleItemDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImport = async () => {
    if (!projectName.trim()) return;

    setImporting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to import a project');
        return;
      }

      if (importType === 'json' && jsonData) {
        await importJsonProject(user.id);
      } else if (importType === 'html' && structureItems.length > 0) {
        await importStructuredProject(user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import project');
    } finally {
      setImporting(false);
    }
  };

  const importJsonProject = async (userId: string) => {
    const projectResult = await projectService.create({
      user_id: userId,
      name: projectName.trim(),
      word_count_goal: jsonData.project.word_count_goal,
      time_goal_minutes: jsonData.project.time_goal_minutes,
      goal_period: jsonData.project.goal_period,
    });

    if (!projectResult.success) {
      setError((projectResult as { success: false; error: string }).error);
      return;
    }

    const project = projectResult.data;
    const idMap = new Map<string, string>();

    // Sort items so parents are created before children
    // First, create a map of items by their original ID
    const itemsById = new Map(jsonData.items.map((item: any) => [item.id, item]));
    
    // Topological sort: process items level by level
    const sortedItems: any[] = [];
    const processed = new Set<string>();
    
    const processItem = (item: any) => {
      if (processed.has(item.id)) return;
      
      // If item has a parent, process parent first
      if (item.parent_id && itemsById.has(item.parent_id) && !processed.has(item.parent_id)) {
        processItem(itemsById.get(item.parent_id));
      }
      
      sortedItems.push(item);
      processed.add(item.id);
    };
    
    // Process all items
    for (const item of jsonData.items) {
      processItem(item);
    }

    for (const item of sortedItems) {
      const itemResult = await itemService.create(
        project.id,
        item.parent_id ? idMap.get(item.parent_id) || null : null,
        item.name,
        item.type
      );

      if (itemResult.success) {
        idMap.set(item.id, itemResult.data.id);
        
        // Update sort_order to match original
        if (item.sort_order !== undefined) {
          await itemService.reorder(itemResult.data.id, item.sort_order);
        }
        
        if (item.content) {
          await itemService.updateContent(itemResult.data.id, item.content);
        }
      }
    }

    if (jsonData.goalProgress && jsonData.goalProgress.length > 0) {
      for (const gp of jsonData.goalProgress) {
        await (supabase as any).from('project_goal_progress').insert({
          project_id: project.id,
          date: gp.date,
          words_written: gp.words_written,
          time_spent_minutes: gp.time_spent_minutes,
        });
      }
    }

    onProjectCreated({
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
    });
    handleClose();
  };

  const importStructuredProject = async (userId: string) => {
    const projectResult = await projectService.create({
      user_id: userId,
      name: projectName.trim(),
    });

    if (!projectResult.success) {
      setError((projectResult as { success: false; error: string }).error);
      return;
    }

    const project = projectResult.data;
    
    // Build parent relationships based on indent levels
    const idMap = new Map<string, string>();
    const parentStack: { id: string | null; indent: number }[] = [{ id: null, indent: -1 }];

    for (const item of structureItems) {
      // Find appropriate parent based on indent
      while (parentStack.length > 1 && parentStack[parentStack.length - 1].indent >= item.indent) {
        parentStack.pop();
      }
      
      const parentId = parentStack[parentStack.length - 1].id;
      const dbParentId = parentId ? idMap.get(parentId) || null : null;

      const itemResult = await itemService.create(
        project.id,
        dbParentId,
        item.name,
        item.type
      );

      if (itemResult.success) {
        idMap.set(item.id, itemResult.data.id);
        if (item.content && item.type === 'file') {
          await itemService.updateContent(itemResult.data.id, item.content);
        }
        
        // If this is a folder, it can be a parent for subsequent items
        if (item.type === 'folder') {
          parentStack.push({ id: item.id, indent: item.indent });
        }
      }
    }

    onProjectCreated({
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
    });
    handleClose();
  };

  const getAcceptedFileTypes = (): string => {
    if (importType === 'json') return '.json,.scribo.json';
    if (importType === 'html') return '.html,.htm';
    return '.json,.html,.htm';
  };

  // Get plain text from HTML content for preview
  const getPlainTextPreview = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const selectedItem = structureItems.find(i => i.id === selectedItemId);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Import Project</h2>
          <IconButton onClick={handleClose} title="Close">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </header>

        <div className={styles.content}>
          {step === 'select' && (
            <div className={styles.sourceSelection}>
              <p className={styles.subtitle}>Choose import source</p>
              <div className={styles.sourceGrid}>
                <button
                  className={styles.sourceCard}
                  onClick={() => { setImportType('json'); setStep('upload'); }}
                >
                  <FileJson size={32} strokeWidth={1.5} />
                  <span className={styles.sourceName}>Scribo Project</span>
                  <span className={styles.sourceDesc}>.scribo.json backup file</span>
                </button>
                
                <button
                  className={styles.sourceCard}
                  onClick={() => { setImportType('html'); setStep('upload'); }}
                >
                  <FileType size={32} strokeWidth={1.5} />
                  <span className={styles.sourceName}>Google Docs</span>
                  <span className={styles.sourceDesc}>.html files</span>
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <>
              <button className={styles.backButton} onClick={() => { setImportType(null); setStep('select'); }}>
                ← Back
              </button>

              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} strokeWidth={1.5} className={styles.uploadIcon} />
                <p className={styles.dropText}>
                  {importing ? 'Reading file...' : 'Drag & drop your file here'}
                </p>
                <p className={styles.dropSubtext}>or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptedFileTypes()}
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />
              </div>

              {importType === 'html' && (
                <div className={styles.infoBox}>
                  <p>To export from Google Docs:</p>
                  <ol>
                    <li>Open your document in Google Docs</li>
                    <li>Go to File → Download → Web Page (.html)</li>
                    <li>Upload the downloaded .html file here</li>
                  </ol>
                  <p className={styles.infoNote}>Note: Only HTML files are supported. Please upload the .html version, not .md or other formats.</p>
                </div>
              )}
            </>
          )}

          {step === 'structure' && (
            <>
              <button className={styles.backButton} onClick={() => setStep('upload')}>
                ← Back
              </button>

              <div className={styles.structureHeader}>
                <h3>Organize Your Project</h3>
                <p>Click an item to preview its content. Drag to reorder, use arrows to nest.</p>
              </div>

              <div className={styles.structureToolbar}>
                <Button 
                  variant="secondary" 
                  onClick={() => addItem(structureItems[structureItems.length - 1]?.id || null, 'folder')}
                >
                  <Folder size={14} /> Add Folder
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => addItem(structureItems[structureItems.length - 1]?.id || null, 'file')}
                >
                  <FileText size={14} /> Add File
                </Button>
              </div>

              <div className={styles.structureContainer}>
                <div className={styles.structureList}>
                  {structureItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`${styles.structureItem} ${dragOverIndex === index ? styles.dragOver : ''} ${draggedIndex === index ? styles.itemDragging : ''} ${selectedItemId === item.id ? styles.selected : ''}`}
                      draggable
                      onDragStart={() => handleItemDragStart(index)}
                      onDragOver={(e) => handleItemDragOver(e, index)}
                      onDrop={() => handleItemDrop(index)}
                      onDragEnd={handleItemDragEnd}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <div 
                        className={styles.structureItemRow}
                        style={{ paddingLeft: `${item.indent * 24 + 8}px` }}
                      >
                        <div className={styles.dragHandle}>
                          <GripVertical size={14} />
                        </div>

                        <button
                          className={`${styles.typeToggle} ${item.type === 'folder' ? styles.typeFolder : styles.typeFile}`}
                          onClick={(e) => { e.stopPropagation(); toggleItemType(item.id); }}
                          title={`Click to change to ${item.type === 'folder' ? 'file' : 'folder'}`}
                        >
                          {item.type === 'folder' ? <Folder size={14} /> : <FileText size={14} />}
                        </button>

                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={saveEditing}
                            onClick={(e) => e.stopPropagation()}
                            className={styles.nameInput}
                            autoFocus
                          />
                        ) : (
                          <span 
                            className={styles.structureItemName}
                            onDoubleClick={(e) => { e.stopPropagation(); startEditing(item); }}
                          >
                            {item.name}
                          </span>
                        )}

                        {item.content && item.type === 'file' && (
                          <span className={styles.contentBadge}>
                            {item.content.length > 1000 
                              ? `${Math.round(item.content.length / 1000)}k`
                              : item.content.length} chars
                          </span>
                        )}

                        <div className={styles.itemActions}>
                          {editingId === item.id ? (
                            <button className={styles.actionButton} onClick={(e) => { e.stopPropagation(); saveEditing(); }} title="Save">
                              <Check size={14} />
                            </button>
                          ) : (
                            <button className={styles.actionButton} onClick={(e) => { e.stopPropagation(); startEditing(item); }} title="Rename">
                              <Pencil size={14} />
                            </button>
                          )}
                          <button 
                            className={styles.actionButton} 
                            onClick={(e) => { e.stopPropagation(); outdentItem(item.id); }} 
                            title="Move left"
                            disabled={item.indent === 0}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button 
                            className={styles.actionButton} 
                            onClick={(e) => { e.stopPropagation(); indentItem(item.id); }} 
                            title="Move right (nest)"
                            disabled={index === 0}
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button 
                            className={`${styles.actionButton} ${styles.deleteButton}`} 
                            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} 
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {structureItems.length === 0 && (
                    <div className={styles.emptyState}>
                      <p>No items yet. Add folders and files to build your project structure.</p>
                    </div>
                  )}
                </div>

                {/* Content Preview Panel */}
                <div className={styles.previewPanel}>
                  {selectedItem ? (
                    <>
                      <div className={styles.previewHeader}>
                        <div className={styles.previewTitle}>
                          {selectedItem.type === 'folder' ? <Folder size={16} /> : <FileText size={16} />}
                          <span>{selectedItem.name}</span>
                        </div>
                        <span className={styles.previewType}>
                          {selectedItem.type === 'folder' ? 'Folder' : 'File'}
                        </span>
                      </div>
                      <div className={styles.previewContent}>
                        {selectedItem.type === 'folder' ? (
                          <p className={styles.previewEmpty}>Folders don't have content. They organize files beneath them.</p>
                        ) : selectedItem.content ? (
                          <>
                            <div className={styles.previewStats}>
                              <span>{selectedItem.content.length.toLocaleString()} characters</span>
                              <span>~{Math.ceil(getPlainTextPreview(selectedItem.content).split(/\s+/).length)} words</span>
                            </div>
                            <div className={styles.previewText}>
                              {getPlainTextPreview(selectedItem.content).slice(0, 1000)}
                              {selectedItem.content.length > 1000 && '...'}
                            </div>
                          </>
                        ) : (
                          <p className={styles.previewEmpty}>This file has no content yet.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className={styles.previewPlaceholder}>
                      <FileText size={32} strokeWidth={1} />
                      <p>Select an item to preview its content</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.structureLegend}>
                <span><Folder size={14} /> Folder - contains nested items</span>
                <span><FileText size={14} /> File - contains content</span>
              </div>
            </>
          )}

          {step === 'configure' && (
            <>
              <button 
                className={styles.backButton} 
                onClick={() => setStep(importType === 'html' ? 'structure' : 'upload')}
              >
                ← Back
              </button>

              <div className={styles.successBox}>
                {importType === 'json' ? <FileJson size={24} /> : <FileType size={24} />}
                <div>
                  <div className={styles.successTitle}>Ready to import</div>
                  <div className={styles.successDesc}>
                    {importType === 'json' 
                      ? `${jsonData?.items?.length || 0} items`
                      : `${structureItems.length} items`}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className={styles.input}
                  autoFocus
                />
              </div>
            </>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <footer className={styles.footer}>
          <Button onClick={handleClose} variant="secondary" disabled={importing}>
            Cancel
          </Button>
          {step === 'structure' && (
            <Button onClick={() => setStep('configure')} disabled={structureItems.length === 0}>
              Continue
            </Button>
          )}
          {step === 'configure' && (
            <Button onClick={handleImport} disabled={!projectName.trim() || importing}>
              {importing ? 'Importing...' : 'Import Project'}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
