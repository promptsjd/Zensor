import { MAX_LEVEL, STORAGE_KEY } from './constants';
import type { SaveState } from './types';

export function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { currentLevel: 1, totalPilesCompleted: 0 };

    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const currentLevel =
      typeof parsed.currentLevel === 'number' && Number.isInteger(parsed.currentLevel)
        ? Math.max(1, Math.min(MAX_LEVEL, parsed.currentLevel))
        : 1;
    const totalPilesCompleted =
      typeof parsed.totalPilesCompleted === 'number' &&
      Number.isInteger(parsed.totalPilesCompleted) &&
      parsed.totalPilesCompleted >= 0
        ? parsed.totalPilesCompleted
        : 0;

    return { currentLevel, totalPilesCompleted };
  } catch {
    return { currentLevel: 1, totalPilesCompleted: 0 };
  }
}

export function persistSave(state: SaveState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private browsing errors gracefully
  }
}
