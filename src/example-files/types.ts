/** Represents a child node's data */
export interface ChildData {
  readonly id: string;
  readonly name: string;
  readonly words: number;
  readonly color: 'blue' | 'yellow';
  readonly children?: readonly ChildData[];
}

/** Internal state for each orbiting node */
export interface NodeState {
  readonly data: ChildData;
  readonly size: number;
  readonly textSize: number;
  readonly originalIndex: number;
  radius: number;
  speed: number;
  angle: number;
  isDecelerating: boolean;
}

/** Props for the Constellation component */
export interface ConstellationProps {
  /** Optional array of child node data. Uses default chapters if not provided. */
  readonly children?: readonly ChildData[];
  /** Callback when a file node is clicked */
  onFileClick?: (fileId: string) => void;
}
