'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ItemRow, ItemType } from '@/types/database';

const DEMO_STORAGE_KEY = 'scribe_demo_data';
const DEMO_PROJECT_ID = 'demo-project';

interface DemoProject {
  id: string;
  name: string;
  created_at: string;
}

interface DemoData {
  project: DemoProject;
  items: ItemRow[];
}

interface DemoContextType {
  isDemo: true;
  project: DemoProject;
  items: ItemRow[];
  createItem: (parentId: string | null, name: string, type: ItemType) => ItemRow;
  updateItem: (id: string, updates: Partial<ItemRow>) => void;
  deleteItem: (id: string) => void;
  restoreItem: (id: string) => void;
  permanentDeleteItem: (id: string) => void;
  getTrashItems: () => ItemRow[];
  emptyTrash: () => void;
  reloadItems: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Static default data with fixed IDs to avoid hydration mismatch
const DEFAULT_ITEM_ID = 'demo-default-chapter-1';

function getDefaultDemoData(): DemoData {
  const now = new Date().toISOString();
  return {
    project: {
      id: DEMO_PROJECT_ID,
      name: 'My Demo Project',
      created_at: now,
    },
    items: [
      {
        id: DEFAULT_ITEM_ID,
        project_id: DEMO_PROJECT_ID,
        parent_id: null,
        name: 'Chapter 1',
        type: 'file',
        content: '<p>It was a dark and stormy night...</p><p>Start writing your story here. This is a demo — your work is saved locally in your browser.</p>',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ],
  };
}

function loadDemoData(): DemoData | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load demo data:', e);
  }
  
  return null;
}

function saveDemoData(data: DemoData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save demo data:', e);
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  // Start with null to indicate "not yet loaded from client"
  const [data, setData] = useState<DemoData | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = loadDemoData();
    if (stored) {
      setData(stored);
    } else {
      // No stored data, create default
      const defaultData = getDefaultDemoData();
      setData(defaultData);
      saveDemoData(defaultData);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever data changes (after hydration)
  useEffect(() => {
    if (isHydrated && data) {
      saveDemoData(data);
    }
  }, [data, isHydrated]);

  const createItem = useCallback((parentId: string | null, name: string, type: ItemType): ItemRow => {
    const now = new Date().toISOString();
    const currentItems = data?.items || [];
    const siblings = currentItems.filter(i => i.parent_id === parentId && !i.deleted_at);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.sort_order)) : -1;
    
    const newItem: ItemRow = {
      id: generateId(),
      project_id: DEMO_PROJECT_ID,
      parent_id: parentId,
      name,
      type,
      content: '',
      sort_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    setData(prev => prev ? {
      ...prev,
      items: [...prev.items, newItem],
    } : null);

    return newItem;
  }, [data?.items]);

  const updateItem = useCallback((id: string, updates: Partial<ItemRow>) => {
    setData(prev => prev ? {
      ...prev,
      items: prev.items.map(item =>
        item.id === id
          ? { ...item, ...updates, updated_at: new Date().toISOString() }
          : item
      ),
    } : null);
  }, []);

  const deleteItem = useCallback((id: string) => {
    const now = new Date().toISOString();
    setData(prev => prev ? {
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, deleted_at: now } : item
      ),
    } : null);
  }, []);

  const restoreItem = useCallback((id: string) => {
    setData(prev => prev ? {
      ...prev,
      items: prev.items.map(item =>
        item.id === id ? { ...item, deleted_at: null } : item
      ),
    } : null);
  }, []);

  const permanentDeleteItem = useCallback((id: string) => {
    setData(prev => prev ? {
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    } : null);
  }, []);

  const getTrashItems = useCallback(() => {
    return data?.items.filter(item => item.deleted_at !== null) || [];
  }, [data?.items]);

  const emptyTrash = useCallback(() => {
    setData(prev => prev ? {
      ...prev,
      items: prev.items.filter(item => item.deleted_at === null),
    } : null);
  }, []);

  const reloadItems = useCallback(() => {
    const stored = loadDemoData();
    if (stored) {
      setData(stored);
    }
  }, []);

  // Show loading state until hydrated
  if (!isHydrated || !data) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #e5e7eb',
          borderTopColor: '#1565a8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const value: DemoContextType = {
    isDemo: true,
    project: data.project,
    items: data.items.filter(i => !i.deleted_at),
    createItem,
    updateItem,
    deleteItem,
    restoreItem,
    permanentDeleteItem,
    getTrashItems,
    emptyTrash,
    reloadItems,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

export function useDemoOptional() {
  return useContext(DemoContext);
}
