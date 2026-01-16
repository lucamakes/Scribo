'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DemoProvider, useDemo } from '@/lib/context/DemoContext';
import { DemoDataProvider } from '@/lib/context/DataServiceProvider';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import Constellation from '@/example-files/Constellation';
import { itemsToChildData } from '@/lib/utils/sidebarToConstellation';
import IconButton from '@/components/IconButton/IconButton';
import { X } from 'lucide-react';
import styles from './DemoPage.module.css';

function DemoPageContent() {
  const router = useRouter();
  const { project, items: rawItems, updateItem } = useDemo();
  const [selectedItem, setSelectedItem] = useState<SidebarItemData | null>(null);
  const [showConstellation, setShowConstellation] = useState(false);
  const [openInFullscreen, setOpenInFullscreen] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // Convert DemoContext project to Project type
  const projectData = useMemo(() => ({
    id: project.id,
    name: project.name,
    createdAt: project.created_at,
  }), [project]);

  // Convert raw items to SidebarItem format for constellation
  const items = useMemo(() => {
    return rawItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type as 'file' | 'folder' | 'canvas',
      parentId: item.parent_id === null ? project.id : item.parent_id,
      content: item.content,
      order: item.sort_order,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }, [rawItems, project.id]);

  // Select first file on mount if none selected
  useEffect(() => {
    if (!selectedItem && rawItems.length > 0) {
      const firstFile = rawItems.find(i => i.type === 'file');
      if (firstFile) {
        setSelectedItem({
          id: firstFile.id,
          name: firstFile.name,
          type: firstFile.type as 'file',
          parentId: firstFile.parent_id === null ? project.id : firstFile.parent_id,
          content: firstFile.content,
          order: firstFile.sort_order,
          createdAt: firstFile.created_at,
          updatedAt: firstFile.updated_at,
        });
      }
    }
  }, [rawItems, selectedItem, project.id]);

  const constellationData = useMemo(() => {
    return itemsToChildData(rawItems);
  }, [rawItems]);

  const handleSelectItem = useCallback((item: SidebarItemData | null) => {
    setSelectedItem(item);
    if (item && item.type !== 'folder') {
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
    const clickedItem = rawItems.find(item => item.id === fileId);
    if (clickedItem && clickedItem.type === 'file') {
      const sidebarItem: SidebarItemData = {
        id: clickedItem.id,
        name: clickedItem.name,
        type: clickedItem.type as 'file',
        parentId: clickedItem.parent_id === null ? project.id : clickedItem.parent_id,
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
  }, [rawItems, project.id]);

  const handleBackToMaster = useCallback(() => {
    setShowDetailOnMobile(false);
  }, []);

  const handleSignUp = useCallback(() => {
    router.push('/auth/signup');
  }, [router]);

  if (showConstellation) {
    return (
      <div className={styles.constellationView}>
        <IconButton
          onClick={toggleConstellation}
          className={styles.closeButton}
          title="Close constellation view"
        >
          <X size={18} strokeWidth={1.5} />
        </IconButton>
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
            <strong>Demo mode</strong> — Your work is saved in your browser. 
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
        <Sidebar
          project={projectData}
          selectedItemId={selectedItem?.id ?? null}
          onSelectItem={handleSelectItem}
          onToggleBlankView={toggleConstellation}
        />
        <section className={`${styles.content} ${showDetailOnMobile ? styles.showDetail : ''}`}>
          <DetailPanel
            selectedItem={selectedItem}
            projectId={project.id}
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
      <DemoDataProvider>
        <DemoPageContent />
      </DemoDataProvider>
    </DemoProvider>
  );
}
