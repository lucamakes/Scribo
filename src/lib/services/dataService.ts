'use client';

import { createContext, useContext } from 'react';
import type { SidebarItem as SidebarItemData, SidebarItemType } from '@/types/sidebar';
import type { ItemRow } from '@/types/database';

// ============================================
// Data Service Interface
// ============================================

export interface DataServiceResult<T> {
  success: true;
  data: T;
}

export interface DataServiceError {
  success: false;
  error: string;
}

export type ServiceResult<T> = DataServiceResult<T> | DataServiceError;

export interface DataService {
  // Mode identifier
  isDemo: boolean;

  // Item operations
  getItems(projectId: string): Promise<ServiceResult<ItemRow[]>>;
  getItem(itemId: string): Promise<ServiceResult<ItemRow>>;
  createItem(projectId: string, parentId: string | null, name: string, type: SidebarItemType): Promise<ServiceResult<ItemRow>>;
  updateItem(itemId: string, updates: Partial<ItemRow>): Promise<ServiceResult<ItemRow>>;
  renameItem(itemId: string, name: string): Promise<ServiceResult<ItemRow>>;
  moveItem(itemId: string, parentId: string | null, projectId: string, sortOrder: number): Promise<ServiceResult<ItemRow>>;
  updateContent(itemId: string, content: string): Promise<ServiceResult<ItemRow>>;
  
  // Trash operations
  softDelete(itemId: string): Promise<ServiceResult<void>>;
  getTrash(projectId: string): Promise<ServiceResult<ItemRow[]>>;
  restore(itemId: string): Promise<ServiceResult<void>>;
  permanentDelete(itemId: string): Promise<ServiceResult<void>>;
  emptyTrash(projectId: string): Promise<ServiceResult<void>>;
}

// ============================================
// Context
// ============================================

export const DataServiceContext = createContext<DataService | null>(null);

export function useDataService(): DataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error('useDataService must be used within a DataServiceProvider');
  }
  return context;
}

export function useDataServiceOptional(): DataService | null {
  return useContext(DataServiceContext);
}
