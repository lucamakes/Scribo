'use client';

import { Telescope, MoreHorizontal } from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import { SidebarMenu } from '../SidebarMenu/SidebarMenu';
import IconButton from '@/components/IconButton/IconButton';
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
          <IconButton
            onClick={onToggleBlankView}
            title="Constellation View"
            size="medium"
          >
            <Telescope size={18} strokeWidth={1} />
          </IconButton>
        )}
        <IconButton
          onClick={() => setShowMenu(prev => !prev)}
          title="Menu"
          size="medium"
        >
          <MoreHorizontal size={18} strokeWidth={1} />
        </IconButton>
        
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
