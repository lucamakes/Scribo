/**
 * Represents a project with its root folder.
 */
export interface Project {
  /** Unique identifier */
  readonly id: string;
  /** Project name (becomes root folder name) */
  readonly name: string;
  /** Creation timestamp */
  readonly createdAt: string;
}

/**
 * Project state discriminated union
 */
export type ProjectState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'created'; project: Project };

