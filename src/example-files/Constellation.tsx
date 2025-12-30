'use client';

import { useRef } from 'react';
import styles from './Constellation.module.css';
import { DEFAULT_CHILDREN, ROOT_SIZE } from './constants';
import { type ConstellationProps } from './types';
import { useConstellation } from './useConstellation';
import { calculateReadingTime } from './utils';

/**
 * Story Constellation visualization component.
 * Displays an interactive orbital diagram with a root node and orbiting child nodes.
 * Now includes zoom, drag, hierarchical navigation, and dynamic orbit generation.
 */
export default function Constellation({
  children: childrenData = DEFAULT_CHILDREN,
  onFileClick,
}: ConstellationProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    centerX,
    centerY,
    nodePositions,
    hoveredIndex,
    isRootHovered,
    zoom,
    isDragging,
    nodes,
    currentLevelName,
    canNavigateBack,
    showOnlyTwoCircles,
    handleWheel,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleRootMouseEnter,
    handleRootMouseLeave,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    navigateInto,
    navigateBack,
    toggleShowOnlyTwoCircles,
  } = useConstellation(childrenData, canvasRef);

  const isAnyHovered = hoveredIndex !== null || isRootHovered;

  return (
    <section
      className={`${styles.visualizationSection} ${
        isDragging ? styles.dragging : ''
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className={styles.controls}>
        <button 
          className={styles.toggleButton} 
          onClick={(e) => {
            e.stopPropagation();
            toggleShowOnlyTwoCircles();
          }}
          type="button"
          aria-label={showOnlyTwoCircles ? 'Show All Orbits' : 'Simplify View (2 Orbits)'}
          title={showOnlyTwoCircles ? 'Show All Orbits' : 'Simplify View (2 Orbits)'}
        >
          {showOnlyTwoCircles ? '🔍' : '⚡'}
        </button>
      </div>

      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.container}>
        {/* Root Node */}
        <div
          className={`${styles.node} ${styles.rootNode} ${
            hoveredIndex !== null ? styles.dimmed : ''
          } ${canNavigateBack ? styles.canGoBack : ''}`}
          style={{
            width: ROOT_SIZE * zoom,
            height: ROOT_SIZE * zoom,
            transform: `translate(${centerX - (ROOT_SIZE * zoom) / 2}px, ${
              centerY - (ROOT_SIZE * zoom) / 2
            }px)`,
          }}
          onMouseEnter={handleRootMouseEnter}
          onMouseLeave={handleRootMouseLeave}
          onClick={() => canNavigateBack && navigateBack()}
          aria-label={canNavigateBack ? "Go back to parent" : "Root folder"}
        >
          <div
            className={styles.nodeTitle}
            style={{ fontSize: 12 * zoom }}
          >
            {currentLevelName}
          </div>
          {canNavigateBack && (
            <span
              className={styles.nodeLabel}
              style={{ fontSize: 11 * zoom, top: `calc(100% + ${4 * zoom}px)` }}
            >
              Click to go back
            </span>
          )}
          {!canNavigateBack && (
            <span
              className={styles.nodeLabel}
              style={{ fontSize: 13 * zoom, top: `calc(100% + ${12 * zoom}px)` }}
            >
              Main Story Collection
            </span>
          )}
        </div>

        {/* Child Nodes */}
        {nodes.map((node, index) => {
          const position = nodePositions[index] ?? { x: 0, y: 0 };
          const isDimmed = isAnyHovered && hoveredIndex !== index;
          const scaledSize = node.size * zoom;
          const hasChildren = node.data.children && node.data.children.length > 0;
          const isFolder = node.data.color === 'blue' && hasChildren;
          const isFile = node.data.color === 'yellow' || !isFolder;

          return (
            <div
              key={`${node.data.id}-${index}`}
              className={`${styles.node} ${styles.childNode} ${
                styles[node.data.color]
              } ${isDimmed ? styles.dimmed : ''} ${isFolder ? styles.isFolder : ''}`}
              style={{
                width: scaledSize,
                height: scaledSize,
                transform: `translate(${position.x - scaledSize / 2}px, ${
                  position.y - scaledSize / 2
                }px)`,
              }}
              onMouseEnter={() => handleNodeMouseEnter(index)}
              onMouseLeave={handleNodeMouseLeave}
              onClick={(e) => {
                e.stopPropagation();
                if (isFolder) {
                  navigateInto(node.data);
                } else if (isFile && onFileClick) {
                  onFileClick(node.data.id);
                }
              }}
              aria-label={isFolder ? `Open ${node.data.name}` : node.data.name}
            >
              <div
                className={styles.nodeTitle}
                style={{ fontSize: node.textSize * zoom }}
              >
                {node.data.name}
              </div>
              <div
                className={styles.nodeLabel}
                style={{
                  fontSize: 13 * zoom,
                  top: `calc(100% + ${12 * zoom}px)`,
                }}
              >
                <div>{node.data.words.toLocaleString()} words</div>
                <div>{calculateReadingTime(node.data.words)} min read</div>
                {isFolder && (
                  <div>{node.data.children?.length ?? 0} file{node.data.children?.length !== 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
