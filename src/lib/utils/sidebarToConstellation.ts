import type { ItemRow } from '@/types/database';
import type { ChildData } from '@/components/Constellation/types';

/**
 * Strips HTML tags from content string.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Counts words in content string.
 * Returns 0 for empty content.
 */
function countWords(content: string): number {
  if (!content || !content.trim()) return 0;
  const plainText = stripHtml(content);
  if (!plainText) return 0;
  const words = plainText.split(/\s+/).filter(Boolean);
  return words.length;
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
      : childItems.reduce((sum, child) => sum + child.words, 0);

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

