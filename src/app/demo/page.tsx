'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DemoProvider, useDemo } from '@/lib/context/DemoContext';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { DemoSidebar } from '@/components/DemoSidebar/DemoSidebar';
import { DemoDetailPanel } from '@/components/DemoDetailPanel/DemoDetailPanel';
import Constellation from '@/example-files/Constellation';
import { itemsToChildData } from '@/lib/utils/sidebarToConstellation';
import { X } from 'lucide-react';
import styles from './DemoPage.module.css';

function DemoPageContent() {
  const router = useRouter();
  const { project, items, updateItem } = useDemo();
  const [selectedItem, setSelectedItem] = useState<SidebarItemData | null>(null);
  const [showConstellation, setShowConstellation] = useState(false);
  const [openInFullscreen, setOpenInFullscreen] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // Select first file on mount if none selected
  useEffect(() => {
    if (!selectedItem && items.length > 0) {
      const firstFile = items.find(i => i.type === 'file');
      if (firstFile) {
        setSelectedItem({
          id: firstFile.id,
          name: firstFile.name,
          type: firstFile.type,
          parentId: firstFile.parent_id,
          content: firstFile.content,
          order: firstFile.sort_order,
          createdAt: firstFile.created_at,
          updatedAt: firstFile.updated_at,
        });
      }
    }
  }, [items, selectedItem]);

  const constellationData = useMemo(() => {
    return itemsToChildData(items);
  }, [items]);

  const handleSelectItem = useCallback((item: SidebarItemData | null) => {
    setSelectedItem(item);
    if (item) {
      setShowDetailOnMobile(true);
    }
  }, []);

  const handleContentSaved = useCallback((itemId: string, content: string) => {
    updateItem(itemId, { content });
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem(prev => prev ? { ...prev, content } : null);
    }
  }, [selectedItem, updateItem]);

  const toggleConstellation = useCallback(() => {
    setShowConstellation(prev => !prev);
  }, []);

  const handleConstellationFileClick = useCallback((fileId: string) => {
    const clickedItem = items.find(item => item.id === fileId);
    if (clickedItem && clickedItem.type === 'file') {
      const sidebarItem: SidebarItemData = {
        id: clickedItem.id,
        name: clickedItem.name,
        type: clickedItem.type,
        parentId: clickedItem.parent_id,
        content: clickedItem.content,
        order: clickedItem.sort_order,
        createdAt: clickedItem.created_at,
        updatedAt: clickedItem.updated_at,
      };
      setOpenInFullscreen(true);
      setSelectedItem(sidebarItem);
      setShowConstellation(false);
      setShowDetailOnMobile(true);
    }
  }, [items]);

  const handleBackToMaster = useCallback(() => {
    setShowDetailOnMobile(false);
  }, []);

  const handleSignUp = useCallback(() => {
    router.push('/auth/signup');
  }, [router]);

  if (showConstellation) {
    return (
      <div className={styles.constellationView}>
        <button
          onClick={toggleConstellation}
          className={styles.closeButton}
          type="button"
          aria-label="Close constellation view"
        >
          <X size={18} strokeWidth={1} />
        </button>
        <Constellation
          children={constellationData}
          onFileClick={handleConstellationFileClick}
          rootName={project.name}
        />
      </div>
    );
  }

  return (
    <main className={styles.main}>
      {showBanner && (
        <div className={styles.demoBanner}>
          <span>
            <strong>Demo mode</strong> — Write up to 15,000 words free. Your work is saved in your browser. 
            Create a free account to save permanently.
          </span>
          <button onClick={handleSignUp} className={styles.bannerButton}>
            Create Free Account
          </button>
          <button onClick={() => setShowBanner(false)} className={styles.bannerClose} aria-label="Dismiss">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}
      <div className={styles.workspace}>
        <DemoSidebar
          selectedItemId={selectedItem?.id ?? null}
          onSelectItem={handleSelectItem}
          onToggleConstellation={toggleConstellation}
        />
        <section className={`${styles.content} ${showDetailOnMobile ? styles.showDetail : ''}`}>
          <DemoDetailPanel
            selectedItem={selectedItem}
            onContentSaved={handleContentSaved}
            openInFullscreen={openInFullscreen}
            onFullscreenOpened={() => setOpenInFullscreen(false)}
            onBackToMaster={handleBackToMaster}
          />
        </section>
      </div>
    </main>
  );
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoPageContent />
    </DemoProvider>
  );
}
