
import * as Phaser from 'phaser';
import { Entity, Position, TILE_SIZE } from '../types';

export class Creature extends Entity {
  public sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    id: string,
    type: 'player' | 'enemy' | 'item',
    pos: Position,
    hp: number,
    damage: number,
    texture: string
  ) {
    super(id, type, pos, hp, damage);
    
    this.sprite = scene.add.sprite(
      pos.x * TILE_SIZE + TILE_SIZE / 2,
      pos.y * TILE_SIZE + TILE_SIZE / 2,
      texture
    );
  }

  public moveTo(nx: number, ny: number) {
    this.pos.x = nx;
    this.pos.y = ny;
    this.sprite.setPosition(
      nx * TILE_SIZE + TILE_SIZE / 2,
      ny * TILE_SIZE + TILE_SIZE / 2
    );
  }

  public takeDamage(amount: number): boolean {
    this.hp -= amount;
    return this.hp <= 0;
  }

  public destroy() {
    this.sprite.destroy();
  }
}
