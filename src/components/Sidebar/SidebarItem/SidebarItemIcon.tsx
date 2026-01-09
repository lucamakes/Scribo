'use client';

import { Folder, File, Layout } from 'lucide-react';
import type { SidebarItemType } from '@/types/sidebar';
import styles from './SidebarItem.module.css';

interface SidebarItemIconProps {
  type: SidebarItemType;
  isRoot?: boolean;
}

export function SidebarItemIcon({ type, isRoot }: SidebarItemIconProps) {
  const iconClass = type === 'folder' 
    ? styles.folderIcon 
    : type === 'canvas' 
    ? styles.canvasIcon 
    : styles.fileIcon;

  return (
    <span className={`${styles.icon} ${iconClass} ${isRoot ? styles.rootIcon : ''}`}>
      {type === 'folder' ? (
        <Folder size={14} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
      ) : type === 'canvas' ? (
        <Layout size={14} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
      ) : (
        <File size={14} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
      )}
    </span>
  );
}
