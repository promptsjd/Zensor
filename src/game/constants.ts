import type { BowlConfig, DuneSlice } from './types';

export const WORLD_W = 1440;
export const WORLD_H = 900;

// Level progression: +10% base grains per level up to +50% max (Levels 1..6)
export const MAX_LEVEL = 6;
export const BASE_GRAINS_PER_COLOR = 140; // Level 1 = 280 total
export const LEVEL_STEP_PER_COLOR = 14; // +28 total (+10% of 280) per level -> 420 max
export const STORAGE_KEY = 'zensor_save_v1';

// Tabletop perspective coordinates
export const HORIZON_Y = 262;
export const TABLE_FLOOR_Y = 696;

// Fixed 3D conical dune footprint on the counter (stays identical across Levels 1..6)
export const DUNE_RADIUS_X = 148;
export const DUNE_RADIUS_Z = 63;
export const DUNE_Z_FLOOR_OFFSET = 44;

// Glass bowl placement (left = white grains, right = black grains)
export const LEFT_BOWL: BowlConfig = {
  cx: 280,
  rimY: 568,
  baseY: 716,
  rx: 126,
  rimRy: 26,
  baseRx: 66,
  baseRy: 14,
  colorType: 'white',
  label: 'White · Left-Click',
};

export const RIGHT_BOWL: BowlConfig = {
  cx: 1160,
  rimY: 568,
  baseY: 716,
  rx: 126,
  rimRy: 26,
  baseRx: 66,
  baseRy: 14,
  colorType: 'black',
  label: 'Black · Right-Click / Shift+Click',
};

// Matter.js collision bitmasks for glass bowls
export const CAT_LEFT_BOWL = 0x0004;
export const CAT_LEFT_GRAIN = 0x0008;
export const CAT_RIGHT_BOWL = 0x0010;
export const CAT_RIGHT_GRAIN = 0x0020;

// Exact 9-slice conical dune profiles for Levels 1..6 (280 -> 308 -> 336 -> 364 -> 392 -> 420 grains).
// Base layer remains identical across all levels so the circular footprint stays fixed
// while additional grains stack upward into a taller, steeper cone.
export const LEVEL_DUNE_PROFILES: Record<number, DuneSlice[]> = {
  1: [
    { z: -0.9, layers: [5] },
    { z: -0.68, layers: [9, 2] },
    { z: -0.45, layers: [12, 8, 5, 2] },
    { z: -0.22, layers: [15, 11, 9, 7, 5, 3, 2] },
    { z: 0.0, layers: [17, 14, 12, 10, 9, 7, 6, 5, 4, 3, 2, 1] },
    { z: 0.22, layers: [15, 11, 9, 7, 5, 3, 2] },
    { z: 0.45, layers: [12, 8, 5, 2] },
    { z: 0.68, layers: [9, 2] },
    { z: 0.9, layers: [5] },
  ],
  2: [
    { z: -0.9, layers: [5] },
    { z: -0.68, layers: [9, 4] },
    { z: -0.45, layers: [12, 9, 6, 3, 1] },
    { z: -0.22, layers: [15, 12, 9, 7, 5, 4, 2, 1] },
    { z: 0.0, layers: [17, 15, 13, 11, 10, 8, 7, 6, 4, 3, 3, 2, 1] },
    { z: 0.22, layers: [15, 12, 9, 7, 5, 4, 2, 1] },
    { z: 0.45, layers: [12, 9, 6, 3, 1] },
    { z: 0.68, layers: [9, 4] },
    { z: 0.9, layers: [5] },
  ],
  3: [
    { z: -0.9, layers: [5] },
    { z: -0.68, layers: [9, 5, 1] },
    { z: -0.45, layers: [12, 9, 7, 4, 1] },
    { z: -0.22, layers: [15, 12, 10, 8, 6, 4, 3, 2, 1] },
    { z: 0.0, layers: [17, 15, 13, 12, 10, 9, 8, 7, 5, 4, 3, 2, 2, 1] },
    { z: 0.22, layers: [15, 12, 10, 8, 6, 4, 3, 2, 1] },
    { z: 0.45, layers: [12, 9, 7, 4, 1] },
    { z: 0.68, layers: [9, 5, 1] },
    { z: 0.9, layers: [5] },
  ],
  4: [
    { z: -0.9, layers: [5] },
    { z: -0.68, layers: [9, 5, 2] },
    { z: -0.45, layers: [12, 10, 7, 5, 3, 1] },
    { z: -0.22, layers: [15, 13, 11, 9, 7, 5, 3, 2, 1] },
    { z: 0.0, layers: [17, 15, 13, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1] },
    { z: 0.22, layers: [15, 13, 11, 9, 7, 5, 3, 2, 1] },
    { z: 0.45, layers: [12, 10, 7, 5, 3, 1] },
    { z: 0.68, layers: [9, 5, 2] },
    { z: 0.9, layers: [5] },
  ],
  5: [
    { z: -0.9, layers: [5] },
    { z: -0.68, layers: [9, 6, 2] },
    { z: -0.45, layers: [12, 10, 8, 5, 3, 2] },
    { z: -0.22, layers: [15, 13, 11, 9, 8, 6, 5, 3, 2, 1] },
    { z: 0.0, layers: [17, 15, 14, 12, 11, 10, 9, 8, 7, 5, 4, 3, 3, 2, 1, 1] },
    { z: 0.22, layers: [15, 13, 11, 9, 8, 6, 5, 3, 2, 1] },
    { z: 0.45, layers: [12, 10, 8, 5, 3, 2] },
    { z: 0.68, layers: [9, 6, 2] },
    { z: 0.9, layers: [5] },
  ],
  6: [
    { z: -0.9, layers: [5] },
    { z: -0.68, layers: [9, 6, 2] },
    { z: -0.45, layers: [12, 10, 8, 6, 4, 2] },
    { z: -0.22, layers: [15, 13, 12, 10, 8, 7, 5, 3, 2, 1] },
    { z: 0.0, layers: [17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1] },
    { z: 0.22, layers: [15, 13, 12, 10, 8, 7, 5, 3, 2, 1] },
    { z: 0.45, layers: [12, 10, 8, 6, 4, 2] },
    { z: 0.68, layers: [9, 6, 2] },
    { z: 0.9, layers: [5] },
  ],
};
