'use client';

import { Telescope, MoreHorizontal, X } from 'lucide-react';
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
            <Telescope size={18} strokeWidth={1.5} />
          </IconButton>
        )}
        <IconButton
          onClick={() => setShowMenu(!showMenu)}
          title={showMenu ? "Close Menu" : "Menu"}
          size="medium"
          active={showMenu}
        >
          {showMenu ? <X size={18} strokeWidth={1.5} /> : <MoreHorizontal size={18} strokeWidth={1.5} />}
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
