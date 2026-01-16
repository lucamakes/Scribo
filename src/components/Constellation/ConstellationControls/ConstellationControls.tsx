'use client';

import { Orbit, CircleDot, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useConstellation } from '../ConstellationContext';
import IconButton from '@/components/IconButton/IconButton';
import styles from './ConstellationControls.module.css';

export function ConstellationControls() {
  const { 
    showOnlyTwoCircles, 
    toggleShowOnlyTwoCircles, 
    zoom, 
    zoomIn, 
    zoomOut, 
    resetView 
  } = useConstellation();

  return (
    <div className={styles.controls}>
      <IconButton
        onClick={(e) => {
          e?.stopPropagation();
          toggleShowOnlyTwoCircles();
        }}
        title={showOnlyTwoCircles ? 'Show All Orbits' : 'Simplify View (2 Orbits)'}
        size="medium"
      >
        {showOnlyTwoCircles ? <Orbit size={16} strokeWidth={1.5} /> : <CircleDot size={16} strokeWidth={1.5} />}
      </IconButton>

      <div className={styles.divider} />

      <div className={styles.zoomControls}>
        <IconButton
          onClick={(e) => {
            e?.stopPropagation();
            zoomOut();
          }}
          title="Zoom Out"
          size="medium"
        >
          <ZoomOut size={16} strokeWidth={1.5} />
        </IconButton>

        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>

        <IconButton
          onClick={(e) => {
            e?.stopPropagation();
            zoomIn();
          }}
          title="Zoom In"
          size="medium"
        >
          <ZoomIn size={16} strokeWidth={1.5} />
        </IconButton>
      </div>

      <div className={styles.divider} />

      <IconButton
        onClick={(e) => {
          e?.stopPropagation();
          resetView();
        }}
        title="Reset View"
        size="medium"
      >
        <RotateCcw size={16} strokeWidth={1.5} />
      </IconButton>
    </div>
  );
}
