'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Search, Trash2, Settings } from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import styles from './SidebarMenu.module.css';

interface SidebarMenuProps {
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}

export function SidebarMenu({ onBackToProjects, onOpenSettings }: SidebarMenuProps) {
  const router = useRouter();
  const { setShowMenu, setShowSearch, setShowExport, setShowTrash, isDemo } = useSidebar();
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setShowMenu(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBack = () => {
    if (isDemo) {
      router.push('/');
    } else if (onBackToProjects) {
      onBackToProjects();
    }
    closeMenu();
  };

  return (
    <div className={styles.menuDropdown} ref={menuRef}>
      {(onBackToProjects || isDemo) && (
        <button 
          className={styles.menuItem}
          onClick={handleBack}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          <span>{isDemo ? 'Back to Home' : 'Back to Projects'}</span>
        </button>
      )}
      <button 
        className={styles.menuItem}
        onClick={() => { setShowSearch(true); closeMenu(); }}
      >
        <Search size={14} strokeWidth={1.5} />
        <span>Search</span>
      </button>
      <button 
        className={styles.menuItem}
        onClick={() => { setShowExport(true); closeMenu(); }}
      >
        <Download size={14} strokeWidth={1.5} />
        <span>Export</span>
      </button>
      <button 
        className={styles.menuItem}
        onClick={() => { setShowTrash(true); closeMenu(); }}
      >
        <Trash2 size={14} strokeWidth={1.5} />
        <span>Trash</span>
      </button>
      {onOpenSettings && (
        <button 
          className={styles.menuItem}
          onClick={() => { onOpenSettings(); closeMenu(); }}
        >
          <Settings size={14} strokeWidth={1.5} />
          <span>Settings</span>
        </button>
      )}
    </div>
  );
}
