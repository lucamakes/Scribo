'use client';

import { useRef, useState } from 'react';
import { Orbit, CircleDot, ZoomIn, ZoomOut, RotateCcw, ChevronRight, Info } from 'lucide-react';
import styles from './Constellation.module.css';
import { DEFAULT_CHILDREN, ROOT_SIZE } from './constants';
import { type ConstellationProps } from './types';
import { useConstellation } from './useConstellation';
import { calculateReadingTime, calculateTotalWords } from './utils';

/**
 * Story Constellation visualization component.
 * Displays an interactive orbital diagram with a root node and orbiting child nodes.
 * Now includes zoom, drag, hierarchical navigation, and dynamic orbit generation.
 */
export default function Constellation({
  children: childrenData = DEFAULT_CHILDREN,
  onFileClick,
  rootName = 'Root Folder',
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
    isAnimating,
    nodes,
    currentLevelName,
    canNavigateBack,
    showOnlyTwoCircles,
    currentChildren,
    navigationStack,
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
    navigateToLevel,
    toggleShowOnlyTwoCircles,
    zoomIn,
    zoomOut,
    resetView,
  } = useConstellation(childrenData, canvasRef, rootName);

  const [showInfo, setShowInfo] = useState(false);

  const isAnyHovered = hoveredIndex !== null || isRootHovered;
  
  // Calculate total words for current level
  const totalWords = calculateTotalWords(currentChildren);
  const totalReadingTime = calculateReadingTime(totalWords);

  return (
    <section
      className={`${styles.visualizationSection} ${isDragging ? styles.dragging : ''
        }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
          {showOnlyTwoCircles ? <Orbit size={16} strokeWidth={1} /> : <CircleDot size={16} strokeWidth={1} />}
        </button>

        <div className={styles.divider} />

        <button
          className={styles.toggleButton}
          onClick={(e) => {
            e.stopPropagation();
            zoomIn();
          }}
          type="button"
          aria-label="Zoom In"
          title="Zoom In"
        >
          <ZoomIn size={16} strokeWidth={1} />
        </button>

        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>

        <button
          className={styles.toggleButton}
          onClick={(e) => {
            e.stopPropagation();
            zoomOut();
          }}
          type="button"
          aria-label="Zoom Out"
          title="Zoom Out"
        >
          <ZoomOut size={16} strokeWidth={1} />
        </button>

        <button
          className={styles.toggleButton}
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          type="button"
          aria-label="Reset View"
          title="Reset View"
        >
          <RotateCcw size={16} strokeWidth={1} />
        </button>
      </div>

      <div className={styles.infoButton}>
        <button
          className={styles.toggleButton}
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(!showInfo);
          }}
          type="button"
          aria-label="Information"
          title="Information"
        >
          <Info size={16} strokeWidth={1} />
        </button>
      </div>

      {showInfo && (
        <div className={styles.infoPanel}>
          <h3 className={styles.infoTitle}>Constellation View</h3>
          <p className={styles.infoText}>
            Get a different kind of overview of your project. This visual representation helps you see the big picture and identify areas that need attention.
          </p>
          <p className={styles.infoText}>
            <strong>Orb sizes:</strong> Smaller orbs represent files or folders with fewer words, while larger orbs contain more content. This makes it easy to spot which parts of your project need more work.
          </p>
          <ul className={styles.infoList}>
            <li><strong>Navigate:</strong> Click folders to explore deeper levels</li>
            <li><strong>Open files:</strong> Click file orbs to open them in the editor</li>
            <li><strong>Zoom:</strong> Use mouse wheel or zoom buttons</li>
            <li><strong>Pan:</strong> Click and drag to move around</li>
            <li><strong>Go back:</strong> Click the center orb or use breadcrumbs</li>
          </ul>
        </div>
      )}

      <canvas ref={canvasRef} className={`${styles.canvas} ${isAnyHovered ? styles.dimmed : ''} ${isAnimating ? styles.fadeOut : styles.fadeIn}`} />
      <div className={`${styles.container} ${isAnimating ? styles.fadeOut : styles.fadeIn}`}>
        {/* Root Node */}
        <div
          className={`${styles.node} ${styles.rootNode} ${hoveredIndex !== null ? styles.dimmed : ''
            } ${canNavigateBack ? styles.canGoBack : ''}`}
          style={{
            width: ROOT_SIZE * zoom,
            height: ROOT_SIZE * zoom,
            transform: `translate(${centerX - (ROOT_SIZE * zoom) / 2}px, ${centerY - (ROOT_SIZE * zoom) / 2
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
              <div>{totalWords.toLocaleString()} words</div>
              <div>{totalReadingTime} min read</div>
              <div>{currentChildren.length} item{currentChildren.length !== 1 ? 's' : ''}</div>
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
              className={`${styles.node} ${styles.childNode} ${styles[node.data.color]
                } ${isDimmed ? styles.dimmed : ''} ${isFolder ? styles.isFolder : ''}`}
              style={{
                width: scaledSize,
                height: scaledSize,
                transform: `translate(${position.x - scaledSize / 2}px, ${position.y - scaledSize / 2
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
