import Link from 'next/link';
import styles from './Logo.module.css';

interface LogoProps {
  /**
   * Whether the logo should be a link to home page
   * @default false
   */
  asLink?: boolean;
  /**
   * Size variant of the logo
   * @default 'default'
   */
  size?: 'default' | 'small';
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Reusable Logo component for Scribo branding
 * Can be rendered as a link or plain text with different sizes
 */
export function Logo({ asLink = false, size = 'default', className }: LogoProps) {
  const logoClasses = `${styles.logo} ${styles[size]} ${className || ''}`.trim();
  const logoText = <span className={styles.logoText}>Scribo</span>;

  if (asLink) {
    return (
      <Link href="/" className={logoClasses}>
        {logoText}
      </Link>
    );
  }

  return (
    <div className={logoClasses}>
      {logoText}
    </div>
  );
}

