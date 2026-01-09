'use client';

import { useConstellation } from '../ConstellationContext';
import { calculateReadingTime, calculateTotalWords } from '../utils';
import { ROOT_SIZE } from '../constants';
import styles from './ConstellationRootNode.module.css';

export function ConstellationRootNode() {
  const {
    centerX,
    centerY,
    zoom,
    hoveredIndex,
    currentLevelName,
    currentChildren,
    canNavigateBack,
    handleRootMouseEnter,
    handleRootMouseLeave,
    navigateBack,
  } = useConstellation();

  const totalWords = calculateTotalWords(currentChildren);
  const totalReadingTime = calculateReadingTime(totalWords);

  return (
    <div
      className={`${styles.rootNode} ${hoveredIndex !== null ? styles.dimmed : ''} ${canNavigateBack ? styles.canGoBack : ''}`}
      style={{
        width: ROOT_SIZE * zoom,
        height: ROOT_SIZE * zoom,
        transform: `translate(${centerX - (ROOT_SIZE * zoom) / 2}px, ${centerY - (ROOT_SIZE * zoom) / 2}px)`,
      }}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onClick={() => canNavigateBack && navigateBack()}
      aria-label={canNavigateBack ? "Go back to parent" : "Root folder"}
    >
      <div className={styles.nodeTitle} style={{ fontSize: 12 * zoom }}>
        {currentLevelName}
      </div>
      {canNavigateBack && (
        <span className={styles.nodeLabel} style={{ fontSize: 11 * zoom, top: `calc(100% + ${4 * zoom}px)` }}>
          Click to go back
        </span>
      )}
      {!canNavigateBack && (
        <span className={styles.nodeLabel} style={{ fontSize: 13 * zoom, top: `calc(100% + ${12 * zoom}px)` }}>
          <div>{totalWords.toLocaleString()} words</div>
          <div>{totalReadingTime} min read</div>
          <div>{currentChildren.length} item{currentChildren.length !== 1 ? 's' : ''}</div>
        </span>
      )}
    </div>
  );
}
