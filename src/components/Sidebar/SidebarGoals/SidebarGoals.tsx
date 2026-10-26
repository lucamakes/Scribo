'use client';

import { useSidebar } from '../SidebarContext';
import { GoalProgress } from '@/components/GoalProgress/GoalProgress';
import { countWordsInHtml } from '@/lib/editor/wordCount';
import styles from './SidebarGoals.module.css';

export function SidebarGoals() {
  const { project, items } = useSidebar();

  const currentWordCount = items.reduce((sum, item) => {
    if (item.type === 'file' && item.content) {
      return sum + countWordsInHtml(item.content);
    }
    return sum;
  }, 0);

  return (
    <div className={styles.goalSection}>
      <GoalProgress 
        projectId={project.id} 
        currentWordCount={currentWordCount}
      />
    </div>
  );
}
