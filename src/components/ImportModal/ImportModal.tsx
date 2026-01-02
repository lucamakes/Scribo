'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, FileType, BookOpen } from 'lucide-react';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (files: ImportedFile[]) => void;
  projectId: string;
}

export interface ImportedFile {
  name: string;
  content: string;
  type: 'file' | 'folder';
  parentId: string | null;
  children?: ImportedFile[];
}

type ImportSource = 'word' | 'googledocs' | 'scrivener' | null;

export function ImportModal({ isOpen, onClose, onImport, projectId }: ImportModalProps) {
  const [selectedSource, setSelectedSource] = useState<ImportSource>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const importedFiles: ImportedFile[] = [];

      for (const file of files) {
        const content = await readFileContent(file);
        const parsed = parseFileContent(file, content, selectedSource);
        importedFiles.push(...parsed);
      }

      if (importedFiles.length > 0) {
        onImport(importedFiles);
        onClose();
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
          // For binary files like .docx, we'll handle them differently
          resolve(new TextDecoder().decode(result));
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // Read as text for most files
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.html')) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const parseFileContent = (file: File, content: string, source: ImportSource): ImportedFile[] => {
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    
    // Handle different file types
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      // For Word files, extract text (simplified - real implementation would use mammoth.js)
      return [{
        name: fileName,
        content: extractTextFromDocx(content),
        type: 'file',
        parentId: null,
      }];
    }
    
    if (file.name.endsWith('.html')) {
      // For Google Docs HTML export
      return [{
        name: fileName,
        content: extractTextFromHtml(content),
        type: 'file',
        parentId: null,
      }];
    }
    
    if (file.name.endsWith('.rtf')) {
      // For Scrivener RTF exports
      return [{
        name: fileName,
        content: extractTextFromRtf(content),
        type: 'file',
        parentId: null,
      }];
    }
    
    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return [{
        name: fileName,
        content: content,
        type: 'file',
        parentId: null,
      }];
    }

    // Default: treat as plain text
    return [{
      name: fileName,
      content: content,
      type: 'file',
      parentId: null,
    }];
  };

  const extractTextFromDocx = (content: string): string => {
    // Simplified extraction - in production, use mammoth.js
    // This extracts readable text from the XML content
    const textContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textContent || 'Content could not be extracted. Please export as .txt or .html from Word.';
  };

  const extractTextFromHtml = (content: string): string => {
    // Remove HTML tags and decode entities
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.innerHTML = content;
      return div.textContent || div.innerText || '';
    }
    // Fallback for SSR
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
    // Simplified RTF extraction
    return content
      .replace(/\\[a-z]+\d* ?/gi, '')
      .replace(/[{}]/g, '')
      .replace(/\\'[0-9a-f]{2}/gi, '')
      .trim();
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import Files</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {!selectedSource ? (
          <div className={styles.sourceSelection}>
            <p className={styles.subtitle}>Choose your import source</p>
            <div className={styles.sourceGrid}>
              <button
                className={styles.sourceCard}
                onClick={() => setSelectedSource('word')}
              >
                <FileText size={32} strokeWidth={1} />
                <span className={styles.sourceName}>Microsoft Word</span>
                <span className={styles.sourceDesc}>.doc, .docx, .txt, .rtf</span>
              </button>
              
              <button
                className={styles.sourceCard}
                onClick={() => setSelectedSource('googledocs')}
              >
                <FileType size={32} strokeWidth={1} />
                <span className={styles.sourceName}>Google Docs</span>
                <span className={styles.sourceDesc}>.html, .txt, .docx</span>
              </button>
              
              <button
                className={styles.sourceCard}
                onClick={() => setSelectedSource('scrivener')}
              >
                <BookOpen size={32} strokeWidth={1} />
                <span className={styles.sourceName}>Scrivener</span>
                <span className={styles.sourceDesc}>.rtf, .txt, .md</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.uploadSection}>
            <button
              className={styles.backButton}
              onClick={() => setSelectedSource(null)}
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
              <Upload size={48} strokeWidth={1} className={styles.uploadIcon} />
              <p className={styles.dropText}>
                {importing ? 'Importing...' : 'Drag & drop files here'}
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

            {error && (
              <div className={styles.error}>{error}</div>
            )}

            <div className={styles.tips}>
              <h4>Tips for importing from {selectedSource === 'word' ? 'Word' : selectedSource === 'googledocs' ? 'Google Docs' : 'Scrivener'}:</h4>
              {selectedSource === 'word' && (
                <ul>
                  <li>For best results, save as .txt or .docx</li>
                  <li>Complex formatting may not be preserved</li>
                  <li>Images will not be imported</li>
                </ul>
              )}
              {selectedSource === 'googledocs' && (
                <ul>
                  <li>Go to File → Download → Web Page (.html)</li>
                  <li>Or download as Plain Text (.txt)</li>
                  <li>Comments and suggestions won't be imported</li>
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
      </div>
    </div>
  );
}
