import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  title,
  type = 'button',
}: ButtonProps) {
  const variantClass = variant === 'secondary' ? styles.secondary : styles.primary;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${styles.button} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}
