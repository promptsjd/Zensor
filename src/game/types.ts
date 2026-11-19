import type Matter from 'matter-js';

export type GrainType = 'white' | 'black';

export interface BowlConfig {
  cx: number;
  rimY: number;
  baseY: number;
  rx: number;
  rimRy: number;
  baseRx: number;
  baseRy: number;
  colorType: GrainType;
  label: string;
}

export interface DuneSlice {
  z: number;
  layers: number[];
}

export interface PileGrain {
  id: number;
  type: GrainType;
  rx: number;
  ry: number;
  z: number;
  zScale: number;
  sliceGroup: number;
  shade: number;
  redPulse: number;
  body: Matter.Body;
}

export interface FlyingGrain {
  type: GrainType;
  rx: number;
  ry: number;
  shade: number;
  startX: number;
  startY: number;
  startAngle: number;
  controlX: number;
  controlY: number;
  targetX: number;
  targetY: number;
  targetAngle: number;
  elapsed: number;
  duration: number;
}

export interface BowlGrain {
  type: GrainType;
  rx: number;
  ry: number;
  shade: number;
  body: Matter.Body;
}

export interface RedPulse {
  x: number;
  y: number;
  progress: number;
}

export interface ViewTransform {
  dpr: number;
  cssW: number;
  cssH: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface SaveState {
  currentLevel: number;
  totalPilesCompleted: number;
}

export interface GameHudState {
  activeLevel: number;
  maxLevel: number;
  sortedWhite: number;
  sortedBlack: number;
  targetPerColor: number;
  remaining: number;
}

export interface CompletionStats {
  finishedLevel: number;
  totalGrains: number;
  wasMaxLevel: boolean;
  timeFormatted: string;
  accuracy: number;
}
