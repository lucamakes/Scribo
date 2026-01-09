'use client';

import { useConstellation } from '../ConstellationContext';
import styles from './ConstellationCanvas.module.css';

export function ConstellationCanvas() {
  const { canvasRef, isAnyHovered, isAnimating } = useConstellation();

  return (
    <canvas 
      ref={canvasRef} 
      className={`${styles.canvas} ${isAnyHovered ? styles.dimmed : ''} ${isAnimating ? styles.fadeOut : styles.fadeIn}`} 
    />
  );
}
