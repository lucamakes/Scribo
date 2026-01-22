'use client';

import { useSidebar } from '../SidebarContext';
import { GoalProgress } from '@/components/GoalProgress/GoalProgress';
import styles from './SidebarGoals.module.css';

export function SidebarGoals() {
  const { project, items } = useSidebar();

  const currentWordCount = items.reduce((sum, item) => {
    if (item.type === 'file' && item.content) {
      const plainText = item.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return sum + (plainText ? plainText.split(/\s+/).filter(Boolean).length : 0);
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
