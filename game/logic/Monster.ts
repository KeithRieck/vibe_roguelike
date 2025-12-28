
import * as Phaser from 'phaser';
import { Creature } from './Creature';
import { Position, TileType } from '../types';

export enum MonsterType {
  STALKER = 'STALKER',   // Aggressive, follows player
  WANDERER = 'WANDERER', // Moves randomly
  SENTINEL = 'SENTINEL'  // Stays put until player is close
}

export class Monster extends Creature {
  public monsterType: MonsterType;

  constructor(
    scene: Phaser.Scene,
    id: string,
    pos: Position,
    level: number,
    mType: MonsterType
  ) {
    // Determine stats based on type and level
    let hp = 20 + level * 5;
    let damage = 4 + level;
    
    if (mType === MonsterType.SENTINEL) {
      hp *= 2;
      damage *= 1.5;
    } else if (mType === MonsterType.STALKER) {
      damage *= 1.2;
    }

    super(scene, id, 'enemy', pos, Math.floor(hp), Math.floor(damage), 'enemy');
    this.monsterType = mType;

    // Visual distinction
    if (mType === MonsterType.SENTINEL) this.sprite.setTint(0xcc00ff); // Purple
    if (mType === MonsterType.WANDERER) this.sprite.setTint(0x00ff88); // Green
    if (mType === MonsterType.STALKER) this.sprite.setTint(0xff3300);  // Bright Red
  }

  public updateAI(playerPos: Position, tiles: TileType[][], otherMonsters: Monster[]): Position | null {
    const dist = Phaser.Math.Distance.Between(this.pos.x, this.pos.y, playerPos.x, playerPos.y);
    
    let move: Position | null = null;

    switch (this.monsterType) {
      case MonsterType.STALKER:
        if (dist < 8) {
          move = this.getStepTowards(playerPos);
        }
        break;
      
      case MonsterType.SENTINEL:
        if (dist < 4) {
          move = this.getStepTowards(playerPos);
        }
        break;

      case MonsterType.WANDERER:
        if (Math.random() < 0.3) {
          const dirs = [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}];
          const d = dirs[Math.floor(Math.random()*dirs.length)];
          move = { x: this.pos.x + d.x, y: this.pos.y + d.y };
        }
        break;
    }

    if (move && this.canMoveTo(move.x, move.y, tiles, otherMonsters, playerPos)) {
      return move;
    }
    
    return null;
  }

  private getStepTowards(target: Position): Position {
    const dx = Math.sign(target.x - this.pos.x);
    const dy = Math.sign(target.y - this.pos.y);
    // Simple greed: try X then Y
    if (dx !== 0 && Math.random() > 0.5) return { x: this.pos.x + dx, y: this.pos.y };
    if (dy !== 0) return { x: this.pos.x, y: this.pos.y + dy };
    return { x: this.pos.x + dx, y: this.pos.y };
  }

  private canMoveTo(nx: number, ny: number, tiles: TileType[][], monsters: Monster[], playerPos: Position): boolean {
    if (nx < 0 || ny < 0 || nx >= tiles[0].length || ny >= tiles.length) return false;
    if (tiles[ny][nx] === TileType.WALL) return false;
    // Don't step on other monsters
    if (monsters.some(m => m !== this && m.pos.x === nx && m.pos.y === ny)) return false;
    return true;
  }
}
