import { type ChildData } from './types';

export const DEFAULT_CHILDREN: readonly ChildData[] = [];

export const ROOT_SIZE = 100;
export const MIN_NODE_SIZE = 60;
export const MAX_NODE_SIZE = 160;
export const BASE_SPEED = 0.000035;
export const DECELERATION_FACTOR = 0.92;
export const MIN_SPEED_THRESHOLD = 0.000001;

// Dynamic circle generation
export const INITIAL_RADIUS = 200;
export const RADIUS_STEP = 150;
export const INITIAL_NODE_LIMIT = 6;
export const LIMIT_STEP = 2;

export const MIN_GAP_BETWEEN_NODES = 40;

export const ZOOM_SENSITIVITY = 0.001;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;

// Reading time calculation (average reading speed: 225 words per minute)
export const WORDS_PER_MINUTE = 225;
