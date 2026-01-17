import { saveAs } from 'file-saver';
import type { ItemRow, ProjectRow, GoalProgressRow } from '@/types/database';

export type ExportFormat = 'json';

interface ExportOptions {
  project: ProjectRow;
  items: ItemRow[];
  goalProgress?: GoalProgressRow[];
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
 * Main export function
 */
export async function exportProject(options: ExportOptions): Promise<void> {
  exportToJson(options);
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
