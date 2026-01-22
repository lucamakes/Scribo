'use client';

import type { DataService, ServiceResult } from './dataService';
import type { SidebarItemType } from '@/types/sidebar';
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

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

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
        id: 'demo-default-chapter-1',
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

function loadDemoData(): DemoData {
  if (typeof window === 'undefined') {
    return getDefaultDemoData();
  }
  
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load demo data:', e);
  }
  
  const defaultData = getDefaultDemoData();
  saveDemoData(defaultData);
  return defaultData;
}

function saveDemoData(data: DemoData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save demo data:', e);
  }
}

/**
 * Demo implementation of DataService.
 * Stores all data in localStorage.
 */
export function createDemoDataService(): DataService {
  return {
    isDemo: true,

    async getItems(_projectId: string): Promise<ServiceResult<ItemRow[]>> {
      const data = loadDemoData();
      const items = data.items.filter(item => !item.deleted_at);
      return { success: true, data: items };
    },

    async getItem(itemId: string): Promise<ServiceResult<ItemRow>> {
      const data = loadDemoData();
      const item = data.items.find(i => i.id === itemId);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }
      return { success: true, data: item };
    },

    async createItem(_projectId: string, parentId: string | null, name: string, type: SidebarItemType): Promise<ServiceResult<ItemRow>> {
      const data = loadDemoData();
      const now = new Date().toISOString();
      
      const siblings = data.items.filter(i => i.parent_id === parentId && !i.deleted_at);
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.sort_order)) : -1;
      
      const newItem: ItemRow = {
        id: generateId(),
        project_id: DEMO_PROJECT_ID,
        parent_id: parentId,
        name,
        type: type as ItemType,
        content: type === 'canvas' ? '{"nodes":[],"connections":[]}' : '',
        sort_order: maxOrder + 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      data.items.push(newItem);
      saveDemoData(data);
      
      return { success: true, data: newItem };
    },

    async updateItem(itemId: string, updates: Partial<ItemRow>): Promise<ServiceResult<ItemRow>> {
      const data = loadDemoData();
      const index = data.items.findIndex(i => i.id === itemId);
      
      if (index === -1) {
        return { success: false, error: 'Item not found' };
      }

      data.items[index] = {
        ...data.items[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      saveDemoData(data);
      return { success: true, data: data.items[index] };
    },

    async renameItem(itemId: string, name: string): Promise<ServiceResult<ItemRow>> {
      const data = loadDemoData();
      const index = data.items.findIndex(i => i.id === itemId);
      
      if (index === -1) {
        return { success: false, error: 'Item not found' };
      }

      data.items[index] = {
        ...data.items[index],
        name,
        updated_at: new Date().toISOString(),
      };
      
      saveDemoData(data);
      return { success: true, data: data.items[index] };
    },

    async moveItem(itemId: string, parentId: string | null, _projectId: string, sortOrder: number): Promise<ServiceResult<ItemRow>> {
      const data = loadDemoData();
      const index = data.items.findIndex(i => i.id === itemId);
      
      if (index === -1) {
        return { success: false, error: 'Item not found' };
      }

      data.items[index] = {
        ...data.items[index],
        parent_id: parentId,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      };
      
      saveDemoData(data);
      return { success: true, data: data.items[index] };
    },

    async updateContent(itemId: string, content: string): Promise<ServiceResult<ItemRow>> {
      const data = loadDemoData();
      const index = data.items.findIndex(i => i.id === itemId);
      
      if (index === -1) {
        return { success: false, error: 'Item not found' };
      }

      data.items[index] = {
        ...data.items[index],
        content,
        updated_at: new Date().toISOString(),
      };
      
      saveDemoData(data);
      return { success: true, data: data.items[index] };
    },

    async softDelete(itemId: string): Promise<ServiceResult<void>> {
      const data = loadDemoData();
      const now = new Date().toISOString();
      
      // Soft delete the item and all its children
      const idsToDelete = new Set<string>();
      const collectChildren = (parentId: string) => {
        idsToDelete.add(parentId);
        data.items.filter(i => i.parent_id === parentId).forEach(child => collectChildren(child.id));
      };
      collectChildren(itemId);

      data.items = data.items.map(item => 
        idsToDelete.has(item.id) ? { ...item, deleted_at: now } : item
      );
      
      saveDemoData(data);
      return { success: true, data: undefined };
    },

    async getTrash(_projectId: string): Promise<ServiceResult<ItemRow[]>> {
      const data = loadDemoData();
      const items = data.items.filter(item => item.deleted_at !== null);
      return { success: true, data: items };
    },

    async restore(itemId: string): Promise<ServiceResult<void>> {
      const data = loadDemoData();
      const index = data.items.findIndex(i => i.id === itemId);
      
      if (index === -1) {
        return { success: false, error: 'Item not found' };
      }

      data.items[index] = {
        ...data.items[index],
        deleted_at: null,
      };
      
      saveDemoData(data);
      return { success: true, data: undefined };
    },

    async permanentDelete(itemId: string): Promise<ServiceResult<void>> {
      const data = loadDemoData();
      data.items = data.items.filter(item => item.id !== itemId);
      saveDemoData(data);
      return { success: true, data: undefined };
    },

    async emptyTrash(_projectId: string): Promise<ServiceResult<void>> {
      const data = loadDemoData();
      data.items = data.items.filter(item => item.deleted_at === null);
      saveDemoData(data);
      return { success: true, data: undefined };
    },
  };
}

// Export singleton for demo
export const demoDataService = createDemoDataService();

// Export helper to get demo project info
export function getDemoProject(): DemoProject {
  const data = loadDemoData();
  return data.project;
}
