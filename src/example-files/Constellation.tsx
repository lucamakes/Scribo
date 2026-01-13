'use client';

import { useRef, useState, useEffect } from 'react';
import { Orbit, CircleDot, ZoomIn, ZoomOut, RotateCcw, ChevronRight, Info, X } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isAnyHovered = hoveredIndex !== null || isRootHovered;
  
  // Calculate total words for current level
  const totalWords = calculateTotalWords(currentChildren);
  const totalReadingTime = calculateReadingTime(totalWords);

  // Clear selection when clicking background
  const handleBackgroundClick = () => {
    if (isMobile) {
      setSelectedNodeId(null);
    }
  };

  return (
    <section
      className={`${styles.visualizationSection} ${isDragging ? styles.dragging : ''
        }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBackgroundClick}
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
        <div className={styles.orbToggle}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              toggleShowOnlyTwoCircles();
            }}
            title={showOnlyTwoCircles ? 'Show All Orbits' : 'Simplify View (2 Orbits)'}
          >
            {showOnlyTwoCircles ? <Orbit size={16} strokeWidth={1} /> : <CircleDot size={16} strokeWidth={1} />}
          </IconButton>
        </div>

        <div className={styles.zoomControls}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              zoomOut();
            }}
            title="Zoom Out"
            className={styles.ghostButton}
          >
            <ZoomOut size={16} strokeWidth={1} />
          </IconButton>

          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>

          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              zoomIn();
            }}
            title="Zoom In"
            className={styles.ghostButton}
          >
            <ZoomIn size={16} strokeWidth={1} />
          </IconButton>

          <div className={styles.divider} />

          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              resetView();
            }}
            title="Reset View"
            className={styles.ghostButton}
          >
            <RotateCcw size={16} strokeWidth={1} />
          </IconButton>
        </div>
      </div>

      <div className={styles.infoButton}>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo(!showInfo);
          }}
          title="Information"
        >
          <Info size={16} strokeWidth={1} />
        </IconButton>
      </div>

      {showInfo && (
        <div className={styles.infoOverlay} onClick={() => setShowInfo(false)}>
          <div className={styles.infoPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoPanelHeader}>
              <h3 className={styles.infoTitle}>Constellation View</h3>
              <IconButton
                onClick={() => setShowInfo(false)}
                title="Close"
                size="small"
              >
                <X size={14} strokeWidth={1.5} />
              </IconButton>
            </div>
            <div className={styles.infoPanelContent}>
              <p className={styles.infoText}>
                Get a different kind of overview of your project. This visual representation helps you see the big picture and identify areas that need attention.
              </p>
              <p className={styles.infoText}>
                <strong>Orb sizes:</strong> Smaller orbs represent files or folders with fewer words, while larger orbs contain more content. This makes it easy to spot which parts of your project need more work.
              </p>
              <ul className={styles.infoList}>
                <li><strong>Navigate:</strong> Click folders to explore deeper levels</li>
                <li><strong>Open files:</strong> Click file orbs to open them in the editor</li>
                <li><strong>Go back:</strong> Click the center orb or use breadcrumbs</li>
              </ul>
              <h4 className={styles.infoSubtitle}>Controls</h4>
              <ul className={styles.infoList}>
                <li><span className={styles.infoIcon}><CircleDot size={14} strokeWidth={1.5} /></span> <strong>Simplify view:</strong> Show only 2 orbits for cleaner look</li>
                <li><span className={styles.infoIcon}><Orbit size={14} strokeWidth={1.5} /></span> <strong>Show all orbits:</strong> Display all orbital rings</li>
                <li><span className={styles.infoIcon}><ZoomIn size={14} strokeWidth={1.5} /></span> <strong>Zoom in:</strong> Get a closer look (or use mouse wheel)</li>
                <li><span className={styles.infoIcon}><ZoomOut size={14} strokeWidth={1.5} /></span> <strong>Zoom out:</strong> See more of the view</li>
                <li><span className={styles.infoIcon}><RotateCcw size={14} strokeWidth={1.5} /></span> <strong>Reset view:</strong> Return to default zoom and position</li>
              </ul>
              <p className={styles.infoText}>
                <strong>Tip:</strong> Click and drag anywhere to pan around the constellation.
              </p>
            </div>
          </div>
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
          const isSelected = selectedNodeId === node.data.id;

          return (
            <div
              key={`${node.data.id}-${index}`}
              className={`${styles.node} ${styles.childNode} ${styles[node.data.color]
                } ${isDimmed ? styles.dimmed : ''} ${isFolder ? styles.isFolder : ''} ${isSelected ? styles.nodeSelected : ''}`}
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
                // On mobile: two-tap behavior for both files and folders
                if (isMobile) {
                  if (selectedNodeId === node.data.id) {
                    // Second tap - navigate
                    setSelectedNodeId(null);
                    if (isFolder) {
                      navigateInto(node.data);
                    } else if (isFile && onFileClick) {
                      onFileClick(node.data.id);
                    }
                  } else {
                    // First tap - just select to show word count
                    setSelectedNodeId(node.data.id);
                  }
                } else {
                  // Desktop: navigate immediately
                  if (isFolder) {
                    navigateInto(node.data);
                  } else if (isFile && onFileClick) {
                    onFileClick(node.data.id);
                  }
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
