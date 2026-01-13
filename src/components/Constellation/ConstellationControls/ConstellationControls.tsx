'use client';

import { Orbit, CircleDot, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useConstellation } from '../ConstellationContext';
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
      <button
        className={styles.controlButton}
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

      <div className={styles.zoomControls}>
        <button
          className={styles.controlButton}
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

        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>

        <button
          className={styles.controlButton}
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
      </div>

      <div className={styles.divider} />

      <button
        className={styles.controlButton}
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
  );
}
