import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import type { ItemRow } from '@/types/database';

export type ExportFormat = 'docx' | 'pdf' | 'epub' | 'txt' | 'md' | 'html';

interface ExportOptions {
  projectId: string;
  projectName: string;
  items: ItemRow[];
  format: ExportFormat;
  includeStructure: boolean;
}

/**
 * Build a tree structure from flat items array
 */
function buildItemTree(items: ItemRow[]): ItemRow[] {
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
 * Convert HTML to plain text
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/blockquote>/gi, '\n')
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
 * Convert HTML to Markdown
 */
function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u>(.*?)<\/u>/gi, '_$1_')
    .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
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
 * Flatten tree to ordered content array
 */
function flattenTreeToContent(
  items: (ItemRow & { children?: ItemRow[] })[],
  includeStructure: boolean,
  depth: number = 0
): { name: string; content: string; type: 'file' | 'folder'; depth: number }[] {
  const result: { name: string; content: string; type: 'file' | 'folder'; depth: number }[] = [];

  items.forEach(item => {
    if (item.type === 'folder') {
      if (includeStructure) {
        result.push({ name: item.name, content: '', type: 'folder', depth });
      }
      if (item.children && item.children.length > 0) {
        result.push(...flattenTreeToContent(item.children, includeStructure, depth + 1));
      }
    } else {
      result.push({ name: item.name, content: item.content || '', type: 'file', depth });
    }
  });

  return result;
}


/**
 * Export to DOCX format
 */
async function exportToDocx(projectName: string, contentItems: { name: string; content: string; type: 'file' | 'folder'; depth: number }[]): Promise<void> {
  const children: (Paragraph)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: projectName,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  contentItems.forEach(item => {
    if (item.type === 'folder') {
      // Folder as heading
      const headingLevel = item.depth === 0 ? HeadingLevel.HEADING_1 : 
                          item.depth === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      children.push(
        new Paragraph({
          text: item.name,
          heading: headingLevel,
          spacing: { before: 400, after: 200 },
        })
      );
    } else {
      // File content
      const plainText = htmlToPlainText(item.content);
      const paragraphs = plainText.split('\n\n').filter(p => p.trim());
      
      paragraphs.forEach(para => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para })],
            spacing: { after: 200 },
          })
        );
      });

      // Add spacing between files
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${projectName}.docx`);
}

/**
 * Export to PDF format
 */
async function exportToPdf(projectName: string, contentItems: { name: string; content: string; type: 'file' | 'folder'; depth: number }[]): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Title
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(projectName, maxWidth);
  addNewPageIfNeeded(titleLines.length * 10);
  pdf.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 10;

  contentItems.forEach(item => {
    if (item.type === 'folder') {
      // Folder as heading
      const fontSize = item.depth === 0 ? 18 : item.depth === 1 ? 16 : 14;
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold');
      
      const headingLines = pdf.splitTextToSize(item.name, maxWidth);
      addNewPageIfNeeded(headingLines.length * (fontSize / 2.5) + 8);
      pdf.text(headingLines, margin, yPosition);
      yPosition += headingLines.length * (fontSize / 2.5) + 8;
    } else {
      // File content
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const plainText = htmlToPlainText(item.content);
      const lines = pdf.splitTextToSize(plainText, maxWidth);
      
      lines.forEach((line: string) => {
        addNewPageIfNeeded(6);
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });
      
      yPosition += 8; // Space between files
    }
  });

  pdf.save(`${projectName}.pdf`);
}

/**
 * Export to EPUB format (via server API)
 */
async function exportToEpub(projectName: string, projectId: string, includeStructure: boolean): Promise<void> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      projectName,
      format: 'epub',
      includeStructure,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'EPUB export failed');
  }

  const blob = await response.blob();
  saveAs(blob, `${projectName}.epub`);
}


/**
 * Export to plain text format
 */
function exportToTxt(projectName: string, contentItems: { name: string; content: string; type: 'file' | 'folder'; depth: number }[]): void {
  let text = `${projectName}\n${'='.repeat(projectName.length)}\n\n`;

  contentItems.forEach(item => {
    if (item.type === 'folder') {
      const prefix = '#'.repeat(item.depth + 1);
      text += `${prefix} ${item.name}\n\n`;
    } else {
      text += htmlToPlainText(item.content) + '\n\n';
    }
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${projectName}.txt`);
}

/**
 * Export to Markdown format
 */
function exportToMd(projectName: string, contentItems: { name: string; content: string; type: 'file' | 'folder'; depth: number }[]): void {
  let markdown = `# ${projectName}\n\n`;

  contentItems.forEach(item => {
    if (item.type === 'folder') {
      const prefix = '#'.repeat(Math.min(item.depth + 2, 6));
      markdown += `${prefix} ${item.name}\n\n`;
    } else {
      markdown += htmlToMarkdown(item.content) + '\n\n';
    }
  });

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${projectName}.md`);
}

/**
 * Export to HTML format
 */
function exportToHtml(projectName: string, contentItems: { name: string; content: string; type: 'file' | 'folder'; depth: number }[]): void {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { font-size: 2.5em; margin-bottom: 1em; }
    h2 { font-size: 2em; margin-top: 1.5em; }
    h3 { font-size: 1.5em; margin-top: 1.2em; }
    h4 { font-size: 1.2em; margin-top: 1em; }
    p { margin: 1em 0; }
    blockquote {
      border-left: 3px solid #ccc;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>${projectName}</h1>
`;

  contentItems.forEach(item => {
    if (item.type === 'folder') {
      const level = Math.min(item.depth + 2, 6);
      html += `  <h${level}>${item.name}</h${level}>\n`;
    } else {
      html += `  <div class="content">${item.content || ''}</div>\n`;
    }
  });

  html += `</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${projectName}.html`);
}

/**
 * Main export function
 */
export async function exportProject(options: ExportOptions): Promise<void> {
  const { projectId, projectName, items, format, includeStructure } = options;

  // EPUB is handled server-side
  if (format === 'epub') {
    await exportToEpub(projectName, projectId, includeStructure);
    return;
  }

  // Build tree and flatten to ordered content for client-side formats
  const tree = buildItemTree(items);
  const contentItems = flattenTreeToContent(tree, includeStructure);

  switch (format) {
    case 'docx':
      await exportToDocx(projectName, contentItems);
      break;
    case 'pdf':
      await exportToPdf(projectName, contentItems);
      break;
    case 'txt':
      exportToTxt(projectName, contentItems);
      break;
    case 'md':
      exportToMd(projectName, contentItems);
      break;
    case 'html':
      exportToHtml(projectName, contentItems);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
