'use client';

import { useCallback } from 'react';
import { File, Folder, Layout, X } from 'lucide-react';
import type { SidebarItemType } from '@/types/sidebar';
import IconButton from '@/components/IconButton/IconButton';
import styles from './AddItemModal.module.css';

interface AddItemModalProps {
  parentId: string;
  onAdd: (parentId: string, type: SidebarItemType) => void;
  onClose: () => void;
}

export function AddItemModal({ parentId, onAdd, onClose }: AddItemModalProps) {
  const handleAddFile = useCallback(() => {
    onAdd(parentId, 'file');
    onClose();
  }, [onAdd, parentId, onClose]);

  const handleAddFolder = useCallback(() => {
    onAdd(parentId, 'folder');
    onClose();
  }, [onAdd, parentId, onClose]);

  const handleAddCanvas = useCallback(() => {
    onAdd(parentId, 'canvas');
    onClose();
  }, [onAdd, parentId, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Add New</span>
          <IconButton onClick={onClose} size="small" title="Close" variant="ghost">
            <X size={14} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className={styles.options}>
          <button className={styles.option} onClick={handleAddFile}>
            <File size={20} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
            <span>File</span>
          </button>
          <button className={styles.option} onClick={handleAddCanvas}>
            <Layout size={20} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
            <span>Canvas</span>
          </button>
          <button className={styles.option} onClick={handleAddFolder}>
            <Folder size={20} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
            <span>Folder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
