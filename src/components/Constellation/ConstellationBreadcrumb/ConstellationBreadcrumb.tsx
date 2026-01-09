'use client';

import { ChevronRight } from 'lucide-react';
import { useConstellation } from '../ConstellationContext';
import styles from './ConstellationBreadcrumb.module.css';

export function ConstellationBreadcrumb() {
  const { navigationStack, navigateToLevel } = useConstellation();

  return (
    <div className={styles.breadcrumb}>
      {navigationStack.map((level, index) => (
        <div key={index} className={styles.breadcrumbItem}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (index < navigationStack.length - 1) {
                navigateToLevel(index);
              }
            }}
            className={`${styles.breadcrumbButton} ${index === navigationStack.length - 1 ? styles.breadcrumbCurrent : ''}`}
            type="button"
          >
            {level.name}
          </button>
          {index < navigationStack.length - 1 && (
            <ChevronRight size={14} strokeWidth={1.5} className={styles.breadcrumbSeparator} />
          )}
        </div>
      ))}
    </div>
  );
}
