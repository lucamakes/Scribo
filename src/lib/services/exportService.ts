import { saveAs } from 'file-saver';
import type { ItemRow, ProjectRow, GoalProgressRow } from '@/types/database';

export type ExportFormat = 'json' | 'markdown';

interface ExportOptions {
  project: ProjectRow;
  items: ItemRow[];
  goalProgress?: GoalProgressRow[];
  format: ExportFormat;
}

interface ProjectExportData {
  version: string;
  exportedAt: string;
  project: {
    name: string;
    word_count_goal: number | null;
    time_goal_minutes: number | null;
    goal_period: string;
  };
  items: Array<{
    id: string;
    parent_id: string | null;
    name: string;
    type: string;
    content: string;
    sort_order: number;
  }>;
  goalProgress?: Array<{
    date: string;
    words_written: number;
    time_spent_minutes: number;
  }>;
}

/**
 * Build a tree structure from flat items array
 */
function buildItemTree(items: ItemRow[]): (ItemRow & { children?: ItemRow[] })[] {
  const itemMap = new Map<string, ItemRow & { children?: ItemRow[] }>();
  const rootItems: (ItemRow & { children?: ItemRow[] })[] = [];

  // First pass: create map
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree
  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id === null) {
      rootItems.push(node);
    } else {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  // Sort by sort_order
  const sortItems = (items: (ItemRow & { children?: ItemRow[] })[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order);
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortItems(item.children);
      }
    });
  };
  sortItems(rootItems);

  return rootItems;
}

/**
 * Export project to JSON format
 */
function exportToJson(options: ExportOptions): void {
  const { project, items, goalProgress } = options;

  const exportData: ProjectExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      word_count_goal: project.word_count_goal,
      time_goal_minutes: project.time_goal_minutes,
      goal_period: project.goal_period,
    },
    items: items.map(item => ({
      id: item.id,
      parent_id: item.parent_id,
      name: item.name,
      type: item.type,
      content: item.content,
      sort_order: item.sort_order,
    })),
  };

  if (goalProgress && goalProgress.length > 0) {
    exportData.goalProgress = goalProgress.map(gp => ({
      date: gp.date,
      words_written: gp.words_written,
      time_spent_minutes: gp.time_spent_minutes,
    }));
  }

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${project.name}.scribo.json`);
}

/**
 * Convert HTML content to Markdown
 */
function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '_$1_')
    .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
    })
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Export to Markdown format with proper nesting
 */
function exportToMarkdown(options: ExportOptions): void {
  const { project, items } = options;

  // Build tree structure
  const tree = buildItemTree(items);
  
  let markdown = `# ${project.name}\n\n`;
  
  // Recursively process tree with proper heading levels
  const processItems = (
    items: (ItemRow & { children?: ItemRow[] })[],
    headingLevel: number = 2
  ): string => {
    let result = '';
    
    items.forEach(item => {
      if (item.type === 'folder') {
        // Folders become headings (max level 6)
        const level = Math.min(headingLevel, 6);
        const prefix = '#'.repeat(level);
        result += `${prefix} ${item.name}\n\n`;
        
        // Process children with increased heading level
        if (item.children && item.children.length > 0) {
          result += processItems(item.children, headingLevel + 1);
        }
      } else if (item.type === 'file') {
        // Files: add name as bold if there are siblings, then content
        const content = htmlToMarkdown(item.content || '');
        if (content) {
          result += `**${item.name}**\n\n`;
          result += content + '\n\n';
        }
      }
      // Skip canvas items
    });
    
    return result;
  };
  
  markdown += processItems(tree);

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${project.name}.md`);
}

/**
 * Main export function
 */
export async function exportProject(options: ExportOptions): Promise<void> {
  if (options.format === 'markdown') {
    exportToMarkdown(options);
  } else {
    exportToJson(options);
  }
}

/**
 * Import project from JSON
 */
export function parseProjectImport(jsonString: string): ProjectExportData {
  try {
    const data = JSON.parse(jsonString) as ProjectExportData;
    
    // Validate structure
    if (!data.version || !data.project || !data.items) {
      throw new Error('Invalid project file format');
    }

    if (data.version !== '1.0') {
      throw new Error(`Unsupported file version: ${data.version}`);
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON file');
    }
    throw error;
  }
}

/**
 * Parsed HTML item for import preview
 */
export interface ParsedHtmlItem {
  id: string;
  name: string;
  content: string;
  suggestedType: 'file' | 'folder';
  level: number;
  isHeading: boolean;
}

/**
 * Parse HTML file (from Google Docs) into structured items
 */
export function parseHtmlImport(htmlString: string): ParsedHtmlItem[] {
  const items: ParsedHtmlItem[] = [];
  
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // Get the title if available
  const title = doc.querySelector('title')?.textContent?.trim();
  
  // Get the body content
  const body = doc.body;
  if (!body) {
    throw new Error('Invalid HTML file: no body content found');
  }

  let currentContent: string[] = [];
  let itemCounter = 0;

  const generateId = () => `html-item-${++itemCounter}`;

  const flushContent = () => {
    const content = currentContent.join('').trim();
    if (content) {
      // Create a file item from accumulated content
      const lastHeading = items.filter(i => i.isHeading).pop();
      items.push({
        id: generateId(),
        name: lastHeading ? `${lastHeading.name} - Content` : 'Document',
        content: content,
        suggestedType: 'file',
        level: lastHeading ? lastHeading.level + 1 : 0,
        isHeading: false,
      });
    }
    currentContent = [];
  };

  // Process all child nodes
  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Check if it's a heading
      if (/^h[1-6]$/.test(tagName)) {
        flushContent();
        const level = parseInt(tagName[1]) - 1;
        const headingText = element.textContent?.trim() || 'Untitled';
        
        // Skip if it's the same as the title (first h1)
        if (!(tagName === 'h1' && items.length === 0 && headingText === title)) {
          items.push({
            id: generateId(),
            name: headingText,
            content: '',
            suggestedType: 'folder',
            level: level,
            isHeading: true,
          });
        }
      } else if (['p', 'div', 'span', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code'].includes(tagName)) {
        // Content elements - preserve HTML
        const html = element.outerHTML;
        if (html.trim()) {
          currentContent.push(html);
        }
      } else if (tagName === 'br') {
        currentContent.push('<br>');
      } else {
        // Process children for other elements
        element.childNodes.forEach(child => processNode(child));
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        currentContent.push(`<p>${text}</p>`);
      }
    }
  };

  // Process body children
  body.childNodes.forEach(child => processNode(child));
  
  // Flush any remaining content
  flushContent();

  // If no items were created, create a single document
  if (items.length === 0) {
    items.push({
      id: generateId(),
      name: title || 'Imported Document',
      content: body.innerHTML,
      suggestedType: 'file',
      level: 0,
      isHeading: false,
    });
  }

  // Clean up: merge consecutive content items at the same level
  const cleanedItems: ParsedHtmlItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.isHeading) {
      cleanedItems.push(item);
    } else {
      // Check if we can merge with previous non-heading item
      const lastItem = cleanedItems[cleanedItems.length - 1];
      if (lastItem && !lastItem.isHeading && lastItem.level === item.level) {
        lastItem.content += item.content;
      } else {
        cleanedItems.push(item);
      }
    }
  }

  return cleanedItems;
}

/**
 * Parse Markdown file into structured items
 */
export function parseMarkdownImport(markdownString: string): ParsedHtmlItem[] {
  const items: ParsedHtmlItem[] = [];
  const lines = markdownString.split('\n');
  
  let itemCounter = 0;
  let currentContent: string[] = [];

  const generateId = () => `md-item-${++itemCounter}`;

  const flushContent = () => {
    const content = currentContent.join('\n').trim();
    if (content) {
      const lastHeading = items.filter(i => i.isHeading).pop();
      items.push({
        id: generateId(),
        name: lastHeading ? `${lastHeading.name} - Content` : 'Document',
        content: `<p>${content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
        suggestedType: 'file',
        level: lastHeading ? lastHeading.level + 1 : 0,
        isHeading: false,
      });
    }
    currentContent = [];
  };

  for (const line of lines) {
    // Check for headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushContent();
      const level = headingMatch[1].length - 1; // 0-indexed
      const headingText = headingMatch[2].trim();
      
      items.push({
        id: generateId(),
        name: headingText,
        content: '',
        suggestedType: 'folder',
        level: level,
        isHeading: true,
      });
    } else if (line.trim()) {
      // Non-empty line - add to current content
      currentContent.push(line);
    } else if (currentContent.length > 0) {
      // Empty line - paragraph break
      currentContent.push('');
    }
  }

  // Flush remaining content
  flushContent();

  // If no items were created, create a single document
  if (items.length === 0) {
    items.push({
      id: generateId(),
      name: 'Imported Document',
      content: `<p>${markdownString.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
      suggestedType: 'file',
      level: 0,
      isHeading: false,
    });
  }

  // Clean up: merge consecutive content items at the same level
  const cleanedItems: ParsedHtmlItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.isHeading) {
      cleanedItems.push(item);
    } else {
      const lastItem = cleanedItems[cleanedItems.length - 1];
      if (lastItem && !lastItem.isHeading && lastItem.level === item.level) {
        lastItem.content += item.content;
      } else {
        cleanedItems.push(item);
      }
    }
  }

  return cleanedItems;
}

/**
 * Convert parsed HTML items to project structure based on user selections
 */
export interface ImportStructureItem {
  id: string;
  name: string;
  content: string;
  type: 'file' | 'folder';
  parentId: string | null;
}

export function convertHtmlItemsToStructure(
  items: ParsedHtmlItem[],
  typeOverrides: Record<string, 'file' | 'folder'>
): ImportStructureItem[] {
  const result: ImportStructureItem[] = [];
  const parentStack: { id: string | null; level: number }[] = [{ id: null, level: -1 }];

  items.forEach(item => {
    const type = typeOverrides[item.id] || item.suggestedType;
    
    // Find the appropriate parent based on level
    while (parentStack.length > 1 && parentStack[parentStack.length - 1].level >= item.level) {
      parentStack.pop();
    }
    
    const parentId = parentStack[parentStack.length - 1].id;
    
    const structureItem: ImportStructureItem = {
      id: item.id,
      name: item.name,
      content: type === 'folder' ? '' : item.content,
      type,
      parentId,
    };
    
    result.push(structureItem);
    
    // If this is a folder, it can be a parent for subsequent items
    if (type === 'folder') {
      parentStack.push({ id: item.id, level: item.level });
    }
  });

  return result;
}
