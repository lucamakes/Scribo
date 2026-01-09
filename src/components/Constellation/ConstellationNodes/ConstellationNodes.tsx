'use client';

import { useConstellation } from '../ConstellationContext';
import { ConstellationRootNode } from '../ConstellationRootNode/ConstellationRootNode';
import { ConstellationChildNode } from '../ConstellationChildNode/ConstellationChildNode';
import styles from './ConstellationNodes.module.css';

export function ConstellationNodes() {
  const { nodes, nodePositions, isAnyHovered, isAnimating } = useConstellation();

  return (
    <div className={`${styles.container} ${isAnimating ? styles.fadeOut : styles.fadeIn}`}>
      <ConstellationRootNode />
      
      {nodes.map((node, index) => {
        const position = nodePositions[index] ?? { x: 0, y: 0 };
        return (
          <ConstellationChildNode
            key={`${node.data.id}-${index}`}
            node={node}
            index={index}
            position={position}
          />
        );
      })}
    </div>
  );
}
