import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
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
  const variantClasses: Record<string, string> = {
    primary: styles.primary,
    secondary: styles.secondary,
    ghost: styles.ghost,
  };
  const variantClass = variantClasses[variant] || styles.primary;
  
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
