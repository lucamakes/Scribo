import { type ChildData } from './types';

export const DEFAULT_CHILDREN: readonly ChildData[] = [
  {
    id: 'ch1',
    name: 'Chapter 1',
    words: 2500,
    color: 'blue',
    children: [
      { id: 'ch1-s1', name: 'Scene 1.1', words: 800, color: 'yellow' },
      { id: 'ch1-s2', name: 'Scene 1.2', words: 1200, color: 'yellow' },
      { id: 'ch1-s3', name: 'Scene 1.3', words: 500, color: 'yellow' },
    ],
  },
  { id: 'ch2', name: 'Chapter 2', words: 5000, color: 'yellow' },
  {
    id: 'ch3',
    name: 'Chapter 3',
    words: 8000,
    color: 'blue',
    children: [
      { id: 'ch3-s1', name: 'Scene 3.1', words: 2000, color: 'yellow' },
      { id: 'ch3-s2', name: 'Scene 3.2', words: 3000, color: 'yellow' },
      { id: 'ch3-s3', name: 'Scene 3.3', words: 1500, color: 'yellow' },
      { id: 'ch3-s4', name: 'Scene 3.4', words: 1500, color: 'yellow' },
    ],
  },
  { id: 'ch4', name: 'Chapter 4', words: 2500, color: 'yellow' },
  {
    id: 'ch5',
    name: 'Chapter 5',
    words: 10000,
    color: 'blue',
    children: [
      { id: 'ch5-s1', name: 'Intro', words: 1000, color: 'yellow' },
      { id: 'ch5-s2', name: 'Climax', words: 7000, color: 'yellow' },
      { id: 'ch5-s3', name: 'Outro', words: 2000, color: 'yellow' },
    ],
  },
  { id: 'ch6', name: 'Chapter 6', words: 3500, color: 'yellow' },
  { id: 'ch7', name: 'Chapter 7', words: 7500, color: 'blue' },
  { id: 'ch8', name: 'Chapter 8', words: 12000, color: 'yellow' },
  { id: 'ch9', name: 'Chapter 9', words: 4500, color: 'blue' },
  { id: 'ch10', name: 'Chapter 10', words: 6000, color: 'yellow' },
  { id: 'ch11', name: 'Chapter 11', words: 9000, color: 'blue' },
  { id: 'ch12', name: 'Chapter 12', words: 3000, color: 'yellow' },
  { id: 'ch13', name: 'Chapter 13', words: 11000, color: 'blue' },
  { id: 'ch14', name: 'Chapter 14', words: 5500, color: 'yellow' },
  { id: 'ch15', name: 'Chapter 15', words: 7200, color: 'blue' },
  { id: 'ch16', name: 'Chapter 16', words: 4800, color: 'yellow' },
  {
    id: 'ch17',
    name: 'Chapter 17',
    words: 9500,
    color: 'blue',
    children: [
      { id: 'ch17-s1', name: 'Scene 17.1', words: 3000, color: 'yellow' },
      { id: 'ch17-s2', name: 'Scene 17.2', words: 4000, color: 'yellow' },
      { id: 'ch17-s3', name: 'Scene 17.3', words: 2500, color: 'yellow' },
    ],
  },
  { id: 'ch18', name: 'Chapter 18', words: 3800, color: 'yellow' },
  { id: 'ch19', name: 'Chapter 19', words: 10500, color: 'blue' },
  { id: 'ch20', name: 'Chapter 20', words: 6200, color: 'yellow' },
  {
    id: 'ch21',
    name: 'Chapter 21',
    words: 8800,
    color: 'blue',
    children: [
      { id: 'ch21-s1', name: 'Scene 21.1', words: 2800, color: 'yellow' },
      { id: 'ch21-s2', name: 'Scene 21.2', words: 3500, color: 'yellow' },
      { id: 'ch21-s3', name: 'Scene 21.3', words: 2500, color: 'yellow' },
    ],
  },
  { id: 'ch22', name: 'Chapter 22', words: 4100, color: 'yellow' },
  { id: 'ch23', name: 'Chapter 23', words: 7800, color: 'blue' },
  { id: 'ch24', name: 'Chapter 24', words: 5200, color: 'yellow' },
  { id: 'epilogue', name: 'Epilogue', words: 5000, color: 'blue' },
] as const;

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
