import React from 'react';
import styles from './IconButton.module.css';

interface IconButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'medium';
}

export default function IconButton({
  onClick,
  children,
  className = '',
  disabled = false,
  title,
  type = 'button',
  size = 'medium',
}: IconButtonProps) {
  const sizeClass = size === 'small' ? styles.small : styles.medium;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${styles.iconButton} ${sizeClass} ${className}`}
    >
      {children}
    </button>
  );
}
