import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import epub from 'epub-gen-memory';
import type { ItemRow } from '@/types/database';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Build a tree structure from flat items array
 */
function buildItemTree(items: ItemRow[]): (ItemRow & { children?: ItemRow[] })[] {
  const itemMap = new Map<string, ItemRow & { children?: ItemRow[] }>();
  const rootItems: (ItemRow & { children?: ItemRow[] })[] = [];

  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

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


export async function POST(request: NextRequest) {
  try {
    // Rate limit check (standard - 60 requests per minute)
    const ip = getClientIP(request);
    const rateLimitResponse = await checkRateLimit(`export:${ip}`, 'standard');
    if (rateLimitResponse) return rateLimitResponse;

    const { projectId, projectName, format, includeStructure } = await request.json();

    if (!projectId || !projectName || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only handle EPUB on server side
    if (format !== 'epub') {
      return NextResponse.json(
        { error: 'Only EPUB format is handled server-side' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all items for the project
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch project items' },
        { status: 500 }
      );
    }

    // Build tree and flatten to ordered content
    const tree = buildItemTree(items || []);
    const contentItems = flattenTreeToContent(tree, includeStructure);

    // Build chapters from content
    const chapters: { title: string; content: string }[] = [];
    let currentChapter: { title: string; content: string } | null = null;

    contentItems.forEach(item => {
      if (item.type === 'folder') {
        if (currentChapter && currentChapter.content) {
          chapters.push(currentChapter);
        }
        currentChapter = { title: item.name, content: '' };
      } else {
        const content = item.content || '<p></p>';
        if (currentChapter) {
          currentChapter.content += content;
        } else {
          currentChapter = { title: item.name, content };
        }
      }
    });

    if (currentChapter && currentChapter.content) {
      chapters.push(currentChapter);
    }

    if (chapters.length === 0) {
      const allContent = contentItems
        .filter(item => item.type === 'file')
        .map(item => item.content || '')
        .join('');
      chapters.push({ title: projectName, content: allContent || '<p></p>' });
    }

    const options = {
      title: projectName,
      author: 'Exported from Writing App',
    };

    const epubContent = chapters.map(ch => ({
      title: ch.title,
      content: ch.content,
    }));

    const epubBuffer = await epub(options, epubContent);

    return new NextResponse(epubBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${projectName}.epub"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}
