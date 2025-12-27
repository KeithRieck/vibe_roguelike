
export enum TileType {
  WALL = 0,
  FLOOR = 1,
  DOOR = 2,
  STAIRS = 3
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: 'player' | 'enemy' | 'item';
  pos: Position;
  hp: number;
  maxHp: number;
  damage: number;
}

export const TILE_SIZE = 32;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;
