'use client';

import type { DataService, ServiceResult } from './dataService';
import type { SidebarItemType } from '@/types/sidebar';
import type { ItemRow } from '@/types/database';
import { itemService } from './itemService';

/**
 * Supabase implementation of DataService.
 * Uses the existing itemService which connects to Supabase.
 */
export const supabaseDataService: DataService = {
  isDemo: false,

  async getItems(projectId: string): Promise<ServiceResult<ItemRow[]>> {
    return itemService.getByProject(projectId);
  },

  async getItem(itemId: string): Promise<ServiceResult<ItemRow>> {
    return itemService.getById(itemId);
  },

  async createItem(projectId: string, parentId: string | null, name: string, type: SidebarItemType): Promise<ServiceResult<ItemRow>> {
    return itemService.create(projectId, parentId, name, type);
  },

  async updateItem(itemId: string, updates: Partial<ItemRow>): Promise<ServiceResult<ItemRow>> {
    // For general updates, we need to handle different fields
    if (updates.name !== undefined) {
      return itemService.rename(itemId, updates.name);
    }
    if (updates.content !== undefined) {
      return itemService.updateContent(itemId, updates.content);
    }
    // For other updates, return the current item
    return itemService.getById(itemId);
  },

  async renameItem(itemId: string, name: string): Promise<ServiceResult<ItemRow>> {
    return itemService.rename(itemId, name);
  },

  async moveItem(itemId: string, parentId: string | null, projectId: string, sortOrder: number): Promise<ServiceResult<ItemRow>> {
    return itemService.move(itemId, parentId, projectId, sortOrder);
  },

  async updateContent(itemId: string, content: string): Promise<ServiceResult<ItemRow>> {
    return itemService.updateContent(itemId, content);
  },

  async softDelete(itemId: string): Promise<ServiceResult<void>> {
    const result = await itemService.softDelete(itemId);
    if (result.success) {
      return { success: true, data: undefined };
    }
    return result as ServiceResult<void>;
  },

  async getTrash(projectId: string): Promise<ServiceResult<ItemRow[]>> {
    return itemService.getTrash(projectId);
  },

  async restore(itemId: string): Promise<ServiceResult<void>> {
    const result = await itemService.restore(itemId);
    if (result.success) {
      return { success: true, data: undefined };
    }
    return result as ServiceResult<void>;
  },

  async permanentDelete(itemId: string): Promise<ServiceResult<void>> {
    const result = await itemService.permanentDelete(itemId);
    if (result.success) {
      return { success: true, data: undefined };
    }
    return result as ServiceResult<void>;
  },

  async emptyTrash(projectId: string): Promise<ServiceResult<void>> {
    const result = await itemService.emptyTrash(projectId);
    if (result.success) {
      return { success: true, data: undefined };
    }
    return result as ServiceResult<void>;
  },
};
