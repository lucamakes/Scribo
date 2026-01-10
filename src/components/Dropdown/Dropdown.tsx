import React, { useEffect, useRef } from 'react';
import styles from './Dropdown.module.css';

interface DropdownProps {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  align?: 'left' | 'right';
  direction?: 'horizontal' | 'vertical';
}

export default function Dropdown({ 
  children, 
  onClose, 
  className = '', 
  align = 'right',
  direction = 'horizontal'
}: DropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add a small delay to prevent immediate closing when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const alignClass = align === 'left' ? styles.alignLeft : styles.alignRight;
  const directionClass = direction === 'vertical' ? styles.vertical : styles.horizontal;

  return (
    <div className={`${styles.dropdown} ${alignClass}`} ref={dropdownRef}>
      <div className={`${styles.content} ${directionClass} ${className}`}>
        {children}
      </div>
    </div>
  );
}
