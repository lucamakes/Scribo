'use client';

import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useConstellation } from '../ConstellationContext';
import styles from './ConstellationBreadcrumb.module.css';

const MOBILE_MAX_BREADCRUMBS = 3;

export function ConstellationBreadcrumb() {
  const { navigationStack, navigateToLevel } = useConstellation();

  // Calculate which items to show on mobile (last 3)
  const showEllipsis = navigationStack.length > MOBILE_MAX_BREADCRUMBS;
  const mobileStartIndex = showEllipsis ? navigationStack.length - MOBILE_MAX_BREADCRUMBS : 0;

  return (
    <div className={styles.breadcrumb}>
      {/* Ellipsis for truncated items on mobile */}
      {showEllipsis && (
        <div className={`${styles.breadcrumbItem} ${styles.ellipsisItem}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToLevel(0);
            }}
            className={styles.ellipsisButton}
            type="button"
            title="Go to root"
          >
            <MoreHorizontal size={14} strokeWidth={1.5} />
          </button>
          <ChevronRight size={14} strokeWidth={1.5} className={styles.breadcrumbSeparator} />
        </div>
      )}
      
      {navigationStack.map((level, index) => {
        // On mobile, hide items before mobileStartIndex
        const isMobileHidden = showEllipsis && index < mobileStartIndex;
        
        return (
          <div 
            key={index} 
            className={`${styles.breadcrumbItem} ${isMobileHidden ? styles.mobileHidden : ''}`}
          >
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
        );
      })}
    </div>
  );
}
