export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  PHOTO_VIEW = 'PHOTO_VIEW'
}

export enum GestureType {
  NONE = 'NONE',
  OPEN_HAND = 'OPEN_HAND',
  FIST = 'FIST',
  PINCH = 'PINCH'
}

export interface HandData {
  gesture: GestureType;
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  isPresent: boolean;
}

export interface ParticleData {
  id: string;
  type: 'sphere' | 'cube' | 'candy' | 'photo';
  startPos: [number, number, number];
  treePos: [number, number, number];
  scatterPos: [number, number, number];
  color: string;
  scale: number;
  photoUrl?: string;
}
