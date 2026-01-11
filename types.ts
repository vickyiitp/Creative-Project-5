export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export interface Building {
  id: number;
  type: 'skyscraper' | 'tower' | 'block';
  height: number; // 0 to 1 scaling factor
  color: string;
  z: number; // Position on the grid (depth)
  x: number; // Position on the grid (lane)
  isLocked: boolean;
  quality: 'PERFECT' | 'GOOD' | 'MISS' | null;
  hasMissed?: boolean; // Flag to check if it has been missed passively
}

export interface AudioVisualData {
  frequencyData: Uint8Array;
  currentBeat: number; // 0 to 1 progress of current beat
  beatCount: number; // Total integer beats passed
}

export enum BuildingResult {
  PERFECT = 'PERFECT',
  GOOD = 'GOOD',
  MISS = 'MISS',
  NONE = 'NONE'
}