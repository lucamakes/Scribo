'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, FileType, BookOpen, FolderOpen } from 'lucide-react';
import { projectService } from '@/lib/services/projectService';
import { itemService } from '@/lib/services/itemService';
import { supabase } from '@/lib/supabase';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './ProjectImportModal.module.css';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: { id: string; name: string; createdAt: string }) => void;
}

interface ParsedDocument {
  name: string;
  content: string;
}

type ImportSource = 'word' | 'googledocs' | 'scrivener' | null;

export function ProjectImportModal({ isOpen, onClose, onProjectCreated }: ProjectImportModalProps) {
  const [selectedSource, setSelectedSource] = useState<ImportSource>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);
  const [step, setStep] = useState<'source' | 'upload' | 'configure'>('source');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSelectedSource(null);
    setIsDragging(false);
    setImporting(false);
    setError(null);
    setProjectName('');
    setParsedDocuments([]);
    setStep('source');
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


  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, [selectedSource]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await processFiles(files);
  }, [selectedSource]);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    setImporting(true);
    setError(null);

    try {
      const documents: ParsedDocument[] = [];

      for (const file of files) {
        const content = await readFileContent(file);
        const parsed = parseFileContent(file, content);
        documents.push(parsed);
      }

      if (documents.length > 0) {
        setParsedDocuments(documents);
        // Auto-generate project name from first file
        if (!projectName) {
          setProjectName(documents[0].name);
        }
        setStep('configure');
      } else {
        setError('No content could be extracted from the files.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import files');
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
        } else if (result instanceof ArrayBuffer) {
          resolve(new TextDecoder().decode(result));
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseFileContent = (file: File, content: string): ParsedDocument => {
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      return {
        name: fileName,
        content: extractTextFromDocx(content),
      };
    }
    
    if (file.name.endsWith('.html')) {
      return {
        name: fileName,
        content: extractTextFromHtml(content),
      };
    }
    
    if (file.name.endsWith('.rtf')) {
      return {
        name: fileName,
        content: extractTextFromRtf(content),
      };
    }
    
    return {
      name: fileName,
      content: content,
    };
  };

  const extractTextFromDocx = (content: string): string => {
    const textContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textContent || 'Content could not be extracted. Please export as .txt or .html from Word.';
  };

  const extractTextFromHtml = (content: string): string => {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = content;
      return div.textContent || div.innerText || '';
    }
    return content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  };

  const extractTextFromRtf = (content: string): string => {
    return content
      .replace(/\\[a-z]+\d* ?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\\\'[0-9a-f]{2}/gi, '')
      .trim();
  };


  const handleCreateProject = async () => {
    if (!projectName.trim() || parsedDocuments.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to create a project');
        return;
      }

      // Create the project
      const projectResult = await projectService.create({
        user_id: user.id,
        name: projectName.trim(),
      });

      if (!projectResult.success) {
        setError((projectResult as { success: false; error: string }).error);
        return;
      }

      const project = projectResult.data;

      // Create items for each imported document
      for (let i = 0; i < parsedDocuments.length; i++) {
        const doc = parsedDocuments[i];
        const itemResult = await itemService.create(
          project.id,
          null,
          doc.name,
          'file'
        );

        if (itemResult.success) {
          // Update the content
          await itemService.updateContent(itemResult.data.id, doc.content);
        }
      }

      onProjectCreated({
        id: project.id,
        name: project.name,
        createdAt: project.created_at,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setImporting(false);
    }
  };

  const getAcceptedFileTypes = (): string => {
    switch (selectedSource) {
      case 'word':
        return '.doc,.docx,.txt,.rtf';
      case 'googledocs':
        return '.html,.txt,.docx';
      case 'scrivener':
        return '.rtf,.txt,.md';
      default:
        return '.doc,.docx,.txt,.rtf,.html,.md';
    }
  };

  const removeDocument = (index: number) => {
    const newDocs = parsedDocuments.filter((_, i) => i !== index);
    setParsedDocuments(newDocs);
    if (newDocs.length === 0) {
      setStep('upload');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import Project</h2>
          <IconButton onClick={handleClose} title="Close">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </div>

        {step === 'source' && (
          <div className={styles.sourceSelection}>
            <p className={styles.subtitle}>Import your existing work into a new project</p>
            <div className={styles.sourceGrid}>
              <button
                className={styles.sourceCard}
                onClick={() => { setSelectedSource('word'); setStep('upload'); }}
              >
                <FileText size={32} strokeWidth={1.5} />
                <span className={styles.sourceName}>Microsoft Word</span>
                <span className={styles.sourceDesc}>.doc, .docx, .txt, .rtf</span>
              </button>
              
              <button
                className={styles.sourceCard}
                onClick={() => { setSelectedSource('googledocs'); setStep('upload'); }}
              >
                <FileType size={32} strokeWidth={1.5} />
                <span className={styles.sourceName}>Google Docs</span>
                <span className={styles.sourceDesc}>.html, .txt, .docx</span>
              </button>
              
              <button
                className={styles.sourceCard}
                onClick={() => { setSelectedSource('scrivener'); setStep('upload'); }}
              >
                <BookOpen size={32} strokeWidth={1.5} />
                <span className={styles.sourceName}>Scrivener</span>
                <span className={styles.sourceDesc}>.rtf, .txt, .md</span>
              </button>
            </div>
          </div>
        )}


        {step === 'upload' && (
          <div className={styles.uploadSection}>
            <button
              className={styles.backButton}
              onClick={() => { setSelectedSource(null); setStep('source'); }}
            >
              ← Back to sources
            </button>

            <div
              className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} strokeWidth={1.5} className={styles.uploadIcon} />
              <p className={styles.dropText}>
                {importing ? 'Processing...' : 'Drag & drop files here'}
              </p>
              <p className={styles.dropSubtext}>or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={getAcceptedFileTypes()}
                onChange={handleFileSelect}
                className={styles.fileInput}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.tips}>
              <h4>Tips for importing from {selectedSource === 'word' ? 'Word' : selectedSource === 'googledocs' ? 'Google Docs' : 'Scrivener'}:</h4>
              {selectedSource === 'word' && (
                <ul>
                  <li>For best results, save as .txt or .docx</li>
                  <li>Each file will become a document in your project</li>
                  <li>Complex formatting may not be preserved</li>
                </ul>
              )}
              {selectedSource === 'googledocs' && (
                <ul>
                  <li>Go to File → Download → Web Page (.html)</li>
                  <li>Or download as Plain Text (.txt)</li>
                  <li>Each file will become a document in your project</li>
                </ul>
              )}
              {selectedSource === 'scrivener' && (
                <ul>
                  <li>Use File → Export → Files to export chapters</li>
                  <li>Export as RTF or Plain Text for best results</li>
                  <li>Each file will become a separate document</li>
                </ul>
              )}
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className={styles.configureSection}>
            <button
              className={styles.backButton}
              onClick={() => setStep('upload')}
            >
              ← Back to upload
            </button>

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

            <div className={styles.documentsSection}>
              <label className={styles.label}>
                <FolderOpen size={16} strokeWidth={1.5} />
                Documents to import ({parsedDocuments.length})
              </label>
              <ul className={styles.documentList}>
                {parsedDocuments.map((doc, index) => (
                  <li key={index} className={styles.documentItem}>
                    <FileText size={16} strokeWidth={1.5} />
                    <span className={styles.documentName}>{doc.name}</span>
                    <span className={styles.documentSize}>
                      {doc.content.length > 1000 
                        ? `${Math.round(doc.content.length / 1000)}k chars`
                        : `${doc.content.length} chars`}
                    </span>
                    <button
                      onClick={() => removeDocument(index)}
                      className={styles.removeButton}
                      title="Remove"
                    >
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <Button onClick={handleClose} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!projectName.trim() || importing}>
                {importing ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
