'use client';

import { Telescope, MoreHorizontal } from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import { SidebarMenu } from '../SidebarMenu/SidebarMenu';
import styles from './SidebarHeader.module.css';

interface SidebarHeaderProps {
  onToggleBlankView?: () => void;
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}

export function SidebarHeader({ onToggleBlankView, onBackToProjects, onOpenSettings }: SidebarHeaderProps) {
  const { project, showMenu, setShowMenu } = useSidebar();

  return (
    <header className={styles.header}>
      <span className={styles.title}>{project.name}</span>
      <div className={styles.headerActions}>
        {onToggleBlankView && (
          <button
            onClick={onToggleBlankView}
            className={styles.iconButton}
            type="button"
            aria-label="Constellation View"
            title="Constellation View"
          >
            <Telescope size={18} strokeWidth={1} />
          </button>
        )}
        <button 
          className={styles.iconButton} 
          title="Menu" 
          aria-label="Menu"
          onClick={() => setShowMenu(prev => !prev)}
        >
          <MoreHorizontal size={18} strokeWidth={1} />
        </button>
        
        {showMenu && (
          <SidebarMenu
            onBackToProjects={onBackToProjects}
            onOpenSettings={onOpenSettings}
          />
        )}
      </div>
    </header>
  );
}
