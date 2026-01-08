/**
 * Version history types for tracking document changes.
 */

/**
 * Version row from database
 */
export interface VersionRow {
  id: string;
  item_id: string;
  version_number: number;
  content: string;
  word_count: number;
  created_at: string;
}

/**
 * Version insert payload
 */
export interface VersionInsert {
  item_id: string;
  version_number?: number;
  content: string;
  word_count?: number;
}

/**
 * Version with formatted display data
 */
export interface VersionDisplay extends VersionRow {
  /** Formatted date string */
  formattedDate: string;
  /** Time ago string (e.g., "2 hours ago") */
  timeAgo: string;
  /** Whether this is the current/latest version */
  isCurrent: boolean;
}
