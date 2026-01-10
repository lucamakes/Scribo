'use client';

import { ArrowLeft, Download, Search, Trash2, Settings } from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import IconButton from '@/components/IconButton/IconButton';
import Dropdown from '@/components/Dropdown/Dropdown';

interface SidebarMenuProps {
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}

export function SidebarMenu({ onBackToProjects, onOpenSettings }: SidebarMenuProps) {
  const { setShowMenu, setShowSearch, setShowExport, setShowTrash, isDemo } = useSidebar();

  const closeMenu = () => setShowMenu(false);

  return (
    <Dropdown onClose={closeMenu}>
      {onBackToProjects && !isDemo && (
        <IconButton
          onClick={() => { onBackToProjects(); closeMenu(); }}
          size="medium"
          title="Back to Projects"
        >
          <ArrowLeft size={14} strokeWidth={1} />
        </IconButton>
      )}
      <IconButton
        onClick={() => { setShowSearch(true); closeMenu(); }}
        size="medium"
        title="Search"
      >
        <Search size={14} strokeWidth={1} />
      </IconButton>
      <IconButton
        onClick={() => { setShowExport(true); closeMenu(); }}
        size="medium"
        title="Export"
      >
        <Download size={14} strokeWidth={1} />
      </IconButton>
      <IconButton
        onClick={() => { setShowTrash(true); closeMenu(); }}
        size="medium"
        title="Trash"
      >
        <Trash2 size={14} strokeWidth={1} />
      </IconButton>
      {onOpenSettings && (
        <IconButton
          onClick={() => { onOpenSettings(); closeMenu(); }}
          size="medium"
          title="Settings"
        >
          <Settings size={14} strokeWidth={1} />
        </IconButton>
      )}
    </Dropdown>
  );
}
