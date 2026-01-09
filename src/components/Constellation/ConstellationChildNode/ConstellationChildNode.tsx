'use client';

import { useConstellation } from '../ConstellationContext';
import { calculateReadingTime } from '../utils';
import type { NodeState } from '../types';
import styles from './ConstellationChildNode.module.css';

interface ConstellationChildNodeProps {
  node: NodeState;
  index: number;
  position: { x: number; y: number };
}

export function ConstellationChildNode({ node, index, position }: ConstellationChildNodeProps) {
  const {
    zoom,
    isAnyHovered,
    hoveredIndex,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    navigateInto,
    onFileClick,
  } = useConstellation();

  const isDimmed = isAnyHovered && hoveredIndex !== index;
  const scaledSize = node.size * zoom;
  const hasChildren = node.data.children && node.data.children.length > 0;
  const isFolder = node.data.color === 'blue' && hasChildren;
  const isFile = node.data.color === 'yellow' || !isFolder;

  return (
    <div
      className={`${styles.childNode} ${styles[node.data.color]} ${isDimmed ? styles.dimmed : ''} ${isFolder ? styles.isFolder : ''}`}
      style={{
        width: scaledSize,
        height: scaledSize,
        transform: `translate(${position.x - scaledSize / 2}px, ${position.y - scaledSize / 2}px)`,
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
      <div className={styles.nodeTitle} style={{ fontSize: node.textSize * zoom }}>
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
}
