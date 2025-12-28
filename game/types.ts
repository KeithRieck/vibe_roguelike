export enum TileType {
  WALL = 0,
  FLOOR = 1,
  DOOR = 2,
  STAIRS = 3
}

export type Position = {
  x: number;
  y: number;
};

export class Entity {
  id: string;
  type: 'player' | 'enemy' | 'item';
  pos: Position;
  hp: number;
  maxHp: number;
  damage: number;

  constructor(id: string, type: 'player' | 'enemy' | 'item', pos: Position, hp: number, damage: number) {
    this.id = id;
    this.type = type;
    this.pos = { ...pos };
    this.hp = hp;
    this.maxHp = hp;
    this.damage = damage;
  }
}

export const TILE_SIZE = 32;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;
