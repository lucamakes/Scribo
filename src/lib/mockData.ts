import type { SidebarItem } from '@/types/sidebar';

/**
 * Mock data simulating database records.
 * Uses UUID-like IDs and timestamps for realism.
 */
export const initialSidebarData: readonly SidebarItem[] = [
  // Root level folders
  {
    id: 'f1a2b3c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o',
    name: 'Documents',
    type: 'folder',
    parentId: null,
    order: 0,
    createdAt: '2024-01-15T08:30:00Z',
    updatedAt: '2024-01-15T08:30:00Z',
  },
  {
    id: 'a9b8c7d6-5e4f-3g2h-1i0j-9k8l7m6n5o4p',
    name: 'Projects',
    type: 'folder',
    parentId: null,
    order: 1,
    createdAt: '2024-02-20T14:15:00Z',
    updatedAt: '2024-02-20T14:15:00Z',
  },
  {
    id: 'x1y2z3a4-5b6c-7d8e-9f0g-1h2i3j4k5l6m',
    name: 'notes.txt',
    type: 'file',
    parentId: null,
    order: 2,
    content: 'Quick notes and reminders...',
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-03-10T09:00:00Z',
  },
  // Inside Documents folder
  {
    id: 'doc1-a2b3-c4d5-e6f7-g8h9i0j1k2l3',
    name: 'Work',
    type: 'folder',
    parentId: 'f1a2b3c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o',
    order: 0,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    id: 'doc2-b3c4-d5e6-f7g8-h9i0j1k2l3m4',
    name: 'Personal',
    type: 'folder',
    parentId: 'f1a2b3c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o',
    order: 1,
    createdAt: '2024-01-16T10:05:00Z',
    updatedAt: '2024-01-16T10:05:00Z',
  },
  {
    id: 'doc3-c4d5-e6f7-g8h9-i0j1k2l3m4n5',
    name: 'readme.md',
    type: 'file',
    parentId: 'f1a2b3c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o',
    order: 2,
    content: '# Readme\n\nThis is a sample readme file.',
    createdAt: '2024-01-17T11:30:00Z',
    updatedAt: '2024-01-17T11:30:00Z',
  },
  // Inside Work folder (nested)
  {
    id: 'work1-d5e6-f7g8-h9i0-j1k2l3m4n5o6',
    name: 'report.pdf',
    type: 'file',
    parentId: 'doc1-a2b3-c4d5-e6f7-g8h9i0j1k2l3',
    order: 0,
    content: 'Monthly report content...',
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-18T09:00:00Z',
  },
  {
    id: 'work2-e6f7-g8h9-i0j1-k2l3m4n5o6p7',
    name: 'presentation.pptx',
    type: 'file',
    parentId: 'doc1-a2b3-c4d5-e6f7-g8h9i0j1k2l3',
    order: 1,
    content: 'Presentation slides content...',
    createdAt: '2024-01-19T14:00:00Z',
    updatedAt: '2024-01-19T14:00:00Z',
  },
  // Inside Projects folder
  {
    id: 'proj1-f7g8-h9i0-j1k2-l3m4n5o6p7q8',
    name: 'website',
    type: 'folder',
    parentId: 'a9b8c7d6-5e4f-3g2h-1i0j-9k8l7m6n5o4p',
    order: 0,
    createdAt: '2024-02-21T10:00:00Z',
    updatedAt: '2024-02-21T10:00:00Z',
  },
  {
    id: 'proj2-g8h9-i0j1-k2l3-m4n5o6p7q8r9',
    name: 'config.json',
    type: 'file',
    parentId: 'a9b8c7d6-5e4f-3g2h-1i0j-9k8l7m6n5o4p',
    order: 1,
    content: '{\n  "version": "1.0.0",\n  "settings": {}\n}',
    createdAt: '2024-02-22T11:00:00Z',
    updatedAt: '2024-02-22T11:00:00Z',
  },
  // Inside website folder (deeply nested)
  {
    id: 'web1-h9i0-j1k2-l3m4-n5o6p7q8r9s0',
    name: 'index.html',
    type: 'file',
    parentId: 'proj1-f7g8-h9i0-j1k2-l3m4n5o6p7q8',
    order: 0,
    content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Website</title>\n</head>\n<body>\n  <h1>Welcome</h1>\n</body>\n</html>',
    createdAt: '2024-02-23T09:00:00Z',
    updatedAt: '2024-02-23T09:00:00Z',
  },
  {
    id: 'web2-i0j1-k2l3-m4n5-o6p7q8r9s0t1',
    name: 'styles.css',
    type: 'file',
    parentId: 'proj1-f7g8-h9i0-j1k2-l3m4n5o6p7q8',
    order: 1,
    content: 'body {\n  margin: 0;\n  padding: 0;\n  font-family: sans-serif;\n}',
    createdAt: '2024-02-23T09:05:00Z',
    updatedAt: '2024-02-23T09:05:00Z',
  },
  // Empty folder for testing drag into empty
  {
    id: 'empty1-j1k2-l3m4-n5o6-p7q8r9s0t1u2',
    name: 'Archive',
    type: 'folder',
    parentId: null,
    order: 3,
    createdAt: '2024-03-01T12:00:00Z',
    updatedAt: '2024-03-01T12:00:00Z',
  },
] as const;

