'use client';

import { Info, CircleDot, Orbit, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useConstellation } from '../ConstellationContext';
import styles from './ConstellationInfoPanel.module.css';

export function ConstellationInfoPanel() {
  const { showInfo, setShowInfo } = useConstellation();

  return (
    <>
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
      )}
    </>
  );
}
