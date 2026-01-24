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
function getDefaultDemoData(): DemoData {
  const now = new Date().toISOString();
  return {
    project: {
      id: DEMO_PROJECT_ID,
      name: 'My Novel',
      created_at: now,
    },
    items: [
      // ===== MANUSCRIPT FOLDER =====
      {
        id: 'demo-folder-manuscript',
        project_id: DEMO_PROJECT_ID,
        parent_id: null,
        name: 'Manuscript',
        type: 'folder',
        content: '',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      // Act 1 folder inside Manuscript
      {
        id: 'demo-folder-act1',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-manuscript',
        name: 'Act 1 - The Beginning',
        type: 'folder',
        content: '',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-chapter-1',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-act1',
        name: 'Chapter 1 - The Arrival',
        type: 'file',
        content: '<h1>Chapter 1</h1><p>The train pulled into the station just as the sun dipped below the horizon, painting the sky in shades of amber and violet. Maya stepped onto the platform, her worn leather suitcase in hand, and took her first breath of mountain air.</p><p>She had left everything behind—her job, her apartment, the life she had carefully constructed over the past decade. All of it gone in the span of a single conversation.</p><p><em>"Sometimes you have to lose yourself to find yourself,"</em> her grandmother used to say. Maya had always thought it was just another one of her cryptic sayings. Now she understood.</p><p>The station was nearly empty. A single attendant swept the platform with methodical strokes, paying her no attention. In the distance, she could see the outline of the town—a cluster of lights nestled against the dark mass of the mountains.</p><p>This was it. Her fresh start.</p>',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-chapter-2',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-act1',
        name: 'Chapter 2 - First Impressions',
        type: 'file',
        content: '<h1>Chapter 2</h1><p>The inn was exactly as the photographs had promised—a charming two-story building with flower boxes beneath every window and a hand-painted sign that read "The Wanderer\'s Rest."</p><p>Maya pushed open the heavy wooden door and was immediately enveloped by warmth. A fire crackled in the stone hearth, and the smell of fresh bread hung in the air.</p><p>"You must be our new guest!" A woman emerged from behind the front desk, her silver hair pulled back in a loose bun. Her smile was genuine, crinkling the corners of her eyes. "I\'m Eleanor. Welcome to Pinecrest."</p>',
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-chapter-3',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-act1',
        name: 'Chapter 3 - The Letter',
        type: 'file',
        content: '<h1>Chapter 3</h1><p>The letter arrived on her third morning in Pinecrest.</p><p>Maya recognized the handwriting immediately—her grandmother\'s elegant script, each letter formed with the precision of someone who had learned to write with a fountain pen. But that was impossible. Her grandmother had passed away six months ago.</p><p>With trembling hands, she broke the wax seal.</p><p><em>My dearest Maya,</em></p><p><em>If you\'re reading this, it means you\'ve finally found your way to Pinecrest. I always knew you would, eventually. There are things I need to tell you—things I should have shared long ago...</em></p>',
        sort_order: 2,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      // Act 2 folder inside Manuscript
      {
        id: 'demo-folder-act2',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-manuscript',
        name: 'Act 2 - The Mystery',
        type: 'folder',
        content: '',
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-chapter-4',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-act2',
        name: 'Chapter 4 - Hidden Paths',
        type: 'file',
        content: '<h1>Chapter 4</h1><p>The map her grandmother had included with the letter led Maya deep into the forest behind the inn. Ancient pines towered overhead, their branches intertwining to form a natural cathedral.</p><p>According to the map, there should be a clearing just ahead. And in that clearing...</p><p>"What exactly am I looking for, Grandma?" Maya muttered to herself, pushing through a tangle of ferns.</p><p>Then she saw it. And everything she thought she knew about her family—about herself—changed forever.</p>',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-chapter-5',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-act2',
        name: 'Chapter 5 - Revelations',
        type: 'file',
        content: '<h1>Chapter 5</h1><p>[Continue writing your story here...]</p>',
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },

      // ===== CHARACTERS FOLDER =====
      {
        id: 'demo-folder-characters',
        project_id: DEMO_PROJECT_ID,
        parent_id: null,
        name: 'Characters',
        type: 'folder',
        content: '',
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-char-maya',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-characters',
        name: 'Maya Chen',
        type: 'file',
        content: '<h2>Maya Chen</h2><p><strong>Role:</strong> Protagonist</p><p><strong>Age:</strong> 32</p><p><strong>Occupation:</strong> Former marketing executive, now seeking purpose</p><h3>Background</h3><p>Maya spent her twenties climbing the corporate ladder, only to realize at 32 that she had been building someone else\'s dream. After a pivotal conversation with her dying grandmother, she quit her job and set out to discover the family secrets that had been hidden from her.</p><h3>Personality</h3><ul><li>Analytical but learning to trust her intuition</li><li>Independent to a fault</li><li>Carries guilt about not spending more time with her grandmother</li><li>Secretly romantic, though she\'d never admit it</li></ul><h3>Arc</h3><p>Maya must learn that running away from her old life isn\'t the same as running toward a new one. Her journey in Pinecrest will force her to confront not just family secrets, but her own fears about connection and belonging.</p>',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-char-eleanor',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-characters',
        name: 'Eleanor Wright',
        type: 'file',
        content: '<h2>Eleanor Wright</h2><p><strong>Role:</strong> Supporting Character / Mentor Figure</p><p><strong>Age:</strong> 68</p><p><strong>Occupation:</strong> Innkeeper at The Wanderer\'s Rest</p><h3>Background</h3><p>Eleanor has run the inn for over 40 years. She knew Maya\'s grandmother well—perhaps better than anyone else in town. She holds many of Pinecrest\'s secrets, though she reveals them only when the time is right.</p><h3>Personality</h3><ul><li>Warm and welcoming on the surface</li><li>Observant—notices everything</li><li>Speaks in riddles when it suits her</li><li>Fiercely protective of the town and its history</li></ul>',
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-char-james',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-characters',
        name: 'James Holloway',
        type: 'file',
        content: '<h2>James Holloway</h2><p><strong>Role:</strong> Love Interest / Ally</p><p><strong>Age:</strong> 35</p><p><strong>Occupation:</strong> Local historian and bookshop owner</p><h3>Background</h3><p>James returned to Pinecrest five years ago after his own career burnout in the city. He now runs the town\'s only bookshop and serves as the unofficial town historian. He\'s been researching the same mysteries Maya\'s grandmother hinted at.</p><h3>Personality</h3><ul><li>Quietly passionate about history and stories</li><li>Patient and thoughtful</li><li>Hiding his own secrets about why he really came back</li><li>Dry sense of humor</li></ul>',
        sort_order: 2,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },

      // ===== WORLD BUILDING FOLDER =====
      {
        id: 'demo-folder-world',
        project_id: DEMO_PROJECT_ID,
        parent_id: null,
        name: 'World Building',
        type: 'folder',
        content: '',
        sort_order: 2,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-world-pinecrest',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-world',
        name: 'Pinecrest - Town Guide',
        type: 'file',
        content: '<h2>Pinecrest</h2><p><em>Population: 2,847 | Elevation: 4,200 ft | Founded: 1892</em></p><h3>Overview</h3><p>Nestled in a valley surrounded by ancient pine forests, Pinecrest is the kind of town that time seems to have forgotten—deliberately. The residents like it that way.</p><h3>Key Locations</h3><ul><li><strong>The Wanderer\'s Rest</strong> - The town\'s only inn, run by Eleanor Wright</li><li><strong>Holloway Books</strong> - James\'s bookshop, housed in a converted Victorian</li><li><strong>The Old Mill</strong> - Abandoned since 1952, rumored to be haunted</li><li><strong>Grandmother\'s Cottage</strong> - Maya\'s inheritance, hidden in the forest</li><li><strong>The Standing Stones</strong> - Ancient rock formation in the forest clearing</li></ul><h3>Town Secrets</h3><p>The founding families of Pinecrest made a pact in 1892. The nature of this pact—and its consequences—drives the central mystery of the story.</p>',
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-world-timeline',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-world',
        name: 'Timeline',
        type: 'file',
        content: '<h2>Story Timeline</h2><h3>Past Events</h3><ul><li><strong>1892</strong> - Pinecrest founded by five families</li><li><strong>1892</strong> - The Pact is made at the Standing Stones</li><li><strong>1952</strong> - The Mill Incident; mill abandoned</li><li><strong>1985</strong> - Maya\'s grandmother leaves Pinecrest</li><li><strong>1990</strong> - Maya is born</li><li><strong>Six months ago</strong> - Grandmother passes away</li></ul><h3>Present Day</h3><ul><li><strong>Day 1</strong> - Maya arrives in Pinecrest</li><li><strong>Day 3</strong> - The letter arrives</li><li><strong>Day 5</strong> - Maya discovers the clearing</li><li><strong>Day 7</strong> - [Plot point TBD]</li></ul>',
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },

      // ===== MOODBOARDS (CANVAS) =====
      {
        id: 'demo-folder-moodboards',
        project_id: DEMO_PROJECT_ID,
        parent_id: null,
        name: 'Moodboards',
        type: 'folder',
        content: '',
        sort_order: 3,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-canvas-story',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-moodboards',
        name: 'Story Structure',
        type: 'canvas',
        content: JSON.stringify({
          nodes: [
            { id: 'node-1', x: 100, y: 100, width: 200, height: 120, type: 'note', content: '**ACT 1**\n\nMaya arrives in Pinecrest, receives grandmother\'s letter, begins to uncover family secrets.' },
            { id: 'node-2', x: 350, y: 100, width: 200, height: 120, type: 'note', content: '**ACT 2**\n\nMaya discovers the Standing Stones, learns about the Pact, faces opposition from town elders.' },
            { id: 'node-3', x: 600, y: 100, width: 200, height: 120, type: 'note', content: '**ACT 3**\n\nMaya must choose: honor the Pact or break it forever. Climax at the Standing Stones.' },
            { id: 'node-4', x: 100, y: 280, width: 150, height: 80, type: 'note', content: '**Inciting Incident**\nThe letter arrives' },
            { id: 'node-5', x: 350, y: 280, width: 150, height: 80, type: 'note', content: '**Midpoint**\nTruth about grandmother revealed' },
            { id: 'node-6', x: 600, y: 280, width: 150, height: 80, type: 'note', content: '**Climax**\nThe choice at the Stones' },
          ],
          connections: [
            { id: 'conn-1', from: 'node-1', to: 'node-2' },
            { id: 'conn-2', from: 'node-2', to: 'node-3' },
            { id: 'conn-3', from: 'node-4', to: 'node-1' },
            { id: 'conn-4', from: 'node-5', to: 'node-2' },
            { id: 'conn-5', from: 'node-6', to: 'node-3' },
          ],
        }),
        sort_order: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-canvas-characters',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-moodboards',
        name: 'Character Relationships',
        type: 'canvas',
        content: JSON.stringify({
          nodes: [
            { id: 'char-maya', x: 300, y: 150, width: 140, height: 60, type: 'note', content: '**Maya Chen**\nProtagonist' },
            { id: 'char-eleanor', x: 100, y: 300, width: 140, height: 60, type: 'note', content: '**Eleanor**\nMentor' },
            { id: 'char-james', x: 500, y: 300, width: 140, height: 60, type: 'note', content: '**James**\nLove Interest' },
            { id: 'char-grandma', x: 300, y: 20, width: 140, height: 60, type: 'note', content: '**Grandmother**\nDeceased' },
            { id: 'rel-1', x: 50, y: 150, width: 120, height: 40, type: 'note', content: 'Guides & protects' },
            { id: 'rel-2', x: 530, y: 150, width: 120, height: 40, type: 'note', content: 'Allies & romance' },
            { id: 'rel-3', x: 300, y: 450, width: 140, height: 50, type: 'note', content: '**The Town**\nSecrets & opposition' },
          ],
          connections: [
            { id: 'c1', from: 'char-grandma', to: 'char-maya' },
            { id: 'c2', from: 'char-eleanor', to: 'char-maya' },
            { id: 'c3', from: 'char-james', to: 'char-maya' },
            { id: 'c4', from: 'char-eleanor', to: 'char-grandma' },
          ],
        }),
        sort_order: 1,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-canvas-themes',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-moodboards',
        name: 'Themes & Motifs',
        type: 'canvas',
        content: JSON.stringify({
          nodes: [
            { id: 'theme-1', x: 100, y: 100, width: 180, height: 100, type: 'note', content: '**Identity**\n\nWho are we when stripped of our constructed lives?' },
            { id: 'theme-2', x: 320, y: 100, width: 180, height: 100, type: 'note', content: '**Legacy**\n\nWhat do we inherit from our ancestors? What do we owe them?' },
            { id: 'theme-3', x: 540, y: 100, width: 180, height: 100, type: 'note', content: '**Belonging**\n\nCan we choose our home, or does it choose us?' },
            { id: 'motif-1', x: 100, y: 260, width: 150, height: 70, type: 'note', content: '🌲 **Pine Trees**\nConstancy, shelter' },
            { id: 'motif-2', x: 280, y: 260, width: 150, height: 70, type: 'note', content: '✉️ **Letters**\nConnection across time' },
            { id: 'motif-3', x: 460, y: 260, width: 150, height: 70, type: 'note', content: '🪨 **Stones**\nPermanence, promises' },
            { id: 'motif-4', x: 640, y: 260, width: 150, height: 70, type: 'note', content: '🌅 **Sunsets**\nEndings & beginnings' },
          ],
          connections: [],
        }),
        sort_order: 2,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },

      // ===== RESEARCH FOLDER =====
      {
        id: 'demo-folder-research',
        project_id: DEMO_PROJECT_ID,
        parent_id: null,
        name: 'Research',
        type: 'folder',
        content: '',
        sort_order: 4,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'demo-research-notes',
        project_id: DEMO_PROJECT_ID,
        parent_id: 'demo-folder-research',
        name: 'Research Notes',
        type: 'file',
        content: '<h2>Research Notes</h2><h3>Small Town Dynamics</h3><ul><li>Everyone knows everyone\'s business</li><li>Newcomers are viewed with suspicion</li><li>Old families hold informal power</li><li>Secrets are kept collectively</li></ul><h3>Mountain Towns in the 1890s</h3><ul><li>Often founded around mining, logging, or railroad</li><li>Isolated communities developed unique traditions</li><li>Many had their own local legends and folklore</li></ul><h3>Standing Stones</h3><ul><li>Found throughout Europe and parts of North America</li><li>Often associated with astronomical alignments</li><li>Many cultures believed they held spiritual power</li><li>Some theories suggest they marked sacred gathering places</li></ul>',
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
