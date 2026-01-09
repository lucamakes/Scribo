'use client';

import { ArrowLeft, Download, Search, Trash2, Settings } from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import styles from './SidebarMenu.module.css';

interface SidebarMenuProps {
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}

export function SidebarMenu({ onBackToProjects, onOpenSettings }: SidebarMenuProps) {
  const { setShowMenu, setShowSearch, setShowExport, setShowTrash, isDemo } = useSidebar();

  const closeMenu = () => setShowMenu(false);

  return (
    <div className={styles.menuDropdown}>
      <div className={styles.menuBackdrop} onClick={closeMenu} />
      <div className={styles.menuContent}>
        {onBackToProjects && !isDemo && (
          <button
            onClick={() => { onBackToProjects(); closeMenu(); }}
            className={styles.menuItem}
          >
            <ArrowLeft size={16} strokeWidth={1} />
            <span>Back to Projects</span>
          </button>
        )}
        <button
          onClick={() => { setShowSearch(true); closeMenu(); }}
          className={styles.menuItem}
        >
          <Search size={16} strokeWidth={1} />
          <span>Search</span>
        </button>
        <button
          onClick={() => { setShowExport(true); closeMenu(); }}
          className={styles.menuItem}
        >
          <Download size={16} strokeWidth={1} />
          <span>Export</span>
        </button>
        <button
          onClick={() => { setShowTrash(true); closeMenu(); }}
          className={styles.menuItem}
        >
          <Trash2 size={16} strokeWidth={1} />
          <span>Trash</span>
        </button>
        {onOpenSettings && (
          <button
            onClick={() => { onOpenSettings(); closeMenu(); }}
            className={styles.menuItem}
          >
            <Settings size={16} strokeWidth={1} />
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
