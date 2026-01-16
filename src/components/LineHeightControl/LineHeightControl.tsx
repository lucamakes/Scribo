'use client';

import { AlignJustify } from 'lucide-react';
import styles from './LineHeightControl.module.css';

interface LineHeightControlProps {
  lineHeight: number;
  onLineHeightChange: (height: number) => void;
}

const LINE_HEIGHTS = [
  { value: 1.4, label: 'Compact' },
  { value: 1.5, label: 'Tight' },
  { value: 1.7, label: 'Default' },
  { value: 1.9, label: 'Relaxed' },
  { value: 2.0, label: 'Loose' },
  { value: 2.2, label: 'Extra Loose' },
];

export function LineHeightControl({ lineHeight, onLineHeightChange }: LineHeightControlProps) {
  return (
    <div className={styles.container}>
      <AlignJustify size={16} strokeWidth={1.5} className={styles.icon} />
      <select
        value={lineHeight}
        onChange={(e) => onLineHeightChange(Number(e.target.value))}
        className={styles.select}
        aria-label="Line height"
      >
        {LINE_HEIGHTS.map((height) => (
          <option key={height.value} value={height.value}>
            {height.label}
          </option>
        ))}
      </select>
    </div>
  );
}
