'use client';

import { ConstellationProvider, useConstellation } from './ConstellationContext';
import { ConstellationBreadcrumb } from './ConstellationBreadcrumb/ConstellationBreadcrumb';
import { ConstellationControls } from './ConstellationControls/ConstellationControls';
import { ConstellationInfoPanel } from './ConstellationInfoPanel/ConstellationInfoPanel';
import { ConstellationCanvas } from './ConstellationCanvas/ConstellationCanvas';
import { ConstellationNodes } from './ConstellationNodes/ConstellationNodes';
import type { ConstellationProps } from './types';
import styles from './Constellation.module.css';

function ConstellationInner() {
  const {
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useConstellation();

  return (
    <section
      className={`${styles.visualizationSection} ${isDragging ? styles.dragging : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <ConstellationBreadcrumb />
      <ConstellationControls />
      <ConstellationInfoPanel />
      <ConstellationCanvas />
      <ConstellationNodes />
    </section>
  );
}

export default function Constellation({
  children: childrenData = [],
  onFileClick,
  rootName = 'Root Folder',
}: ConstellationProps) {
  return (
    <ConstellationProvider
      childrenData={childrenData}
      rootName={rootName}
      onFileClick={onFileClick}
    >
      <ConstellationInner />
    </ConstellationProvider>
  );
}
