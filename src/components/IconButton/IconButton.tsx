import React, { forwardRef } from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps {
  onClick?: (e?: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'medium';
  active?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  onClick,
  children,
  className = '',
  disabled = false,
  title,
  type = 'button',
  size = 'medium',
  active = false,
}, ref) {
  const sizeClass = size === 'small' ? styles.small : styles.medium;
  const activeClass = active ? styles.active : '';
  
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${styles.iconButton} ${sizeClass} ${activeClass} ${className}`}
    >
      {children}
    </button>
  );
});

export default IconButton;
