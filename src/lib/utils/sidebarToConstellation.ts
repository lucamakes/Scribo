import type { ItemRow } from '@/types/database';
import type { ChildData } from '@/example-files/types';

/**
 * Counts words in content string.
 * Returns minimum of 50 to ensure every item has some visual presence.
 */
function countWords(content: string): number {
  if (!content || !content.trim()) return 50;
  const words = content.trim().split(/\s+/).filter(Boolean);
  return Math.max(words.length, 50);
}

/**
 * Converts database ItemRow array to ChildData array for Constellation visualization.
 * Builds hierarchical structure based on parent_id relationships.
 * 
 * @param items - Array of database item rows
 * @returns Array of ChildData for Constellation component
 */
export function itemsToChildData(items: readonly ItemRow[]): readonly ChildData[] {
  // Get root-level items (parent_id === null)
  const rootItems = items
    .filter(item => item.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  /**
   * Recursively converts an ItemRow to ChildData with its children
   */
  function convertItem(item: ItemRow): ChildData {
    // Find all children of this item
    const childItems = items
      .filter(child => child.parent_id === item.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(convertItem);

    // Calculate word count:
    // - For files: count words in content
    // - For folders: sum of all children's words
    const words = item.type === 'file'
      ? countWords(item.content)
      : childItems.reduce((sum, child) => sum + child.words, 0) || 50;

    return {
      id: item.id,
      name: item.name,
      words,
      color: item.type === 'folder' ? 'blue' : 'yellow',
      children: childItems.length > 0 ? childItems : undefined,
    };
  }

  return rootItems.map(convertItem);
}

