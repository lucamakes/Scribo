'use client';

import styles from './TextColorControl.module.css';

interface TextColorControlProps {
  textColor: string;
  onTextColorChange: (color: string) => void;
}

const TEXT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#1a1a1a', label: 'Near Black' },
  { value: '#333333', label: 'Dark Gray' },
  { value: '#4a4a4a', label: 'Medium Dark' },
  { value: '#666666', label: 'Gray' },
  { value: '#808080', label: 'Medium Gray' },
];

export function TextColorControl({ textColor, onTextColorChange }: TextColorControlProps) {
  return (
    <div className={styles.container}>
      {TEXT_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onTextColorChange(color.value)}
          className={`${styles.colorButton} ${textColor === color.value ? styles.selected : ''}`}
          style={{ backgroundColor: color.value }}
          title={color.label}
          aria-label={color.label}
        />
      ))}
    </div>
  );
}
