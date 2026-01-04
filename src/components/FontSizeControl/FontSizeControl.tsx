'use client';

import { Type } from 'lucide-react';
import styles from './FontSizeControl.module.css';

interface FontSizeControlProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const FONT_SIZES = [
  { value: 12, label: 'Small' },
  { value: 14, label: 'Default' },
  { value: 16, label: 'Medium' },
  { value: 18, label: 'Large' },
  { value: 20, label: 'Extra Large' },
  { value: 24, label: 'Huge' },
];

export function FontSizeControl({ fontSize, onFontSizeChange }: FontSizeControlProps) {
  return (
    <div className={styles.container}>
      <Type size={16} strokeWidth={1} className={styles.icon} />
      <select
        value={fontSize}
        onChange={(e) => onFontSizeChange(Number(e.target.value))}
        className={styles.select}
        aria-label="Font size"
      >
        {FONT_SIZES.map((size) => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>
    </div>
  );
}
