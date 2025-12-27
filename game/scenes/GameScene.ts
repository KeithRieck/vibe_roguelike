

import * as Phaser from 'phaser';
import { DungeonGenerator } from '../logic/DungeonGenerator';
import { TileType, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, Position, Entity } from '../../types';

export class GameScene extends Phaser.Scene {
  private generator: DungeonGenerator;
  private player: Entity | null = null;
  private enemies: Entity[] = [];
  private mapSprites: Phaser.GameObjects.Sprite[][] = [];
  private playerSprite: Phaser.GameObjects.Sprite | null = null;
  private enemySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private fovLayer: Phaser.GameObjects.Rectangle[][] = [];
  
  private isPlayerTurn: boolean = true;
  private lastInputTime: number = 0;
  private moveDelay: number = 150; // ms

  private level: number = 1;
  private uiText: Phaser.GameObjects.Text | null = null;
  private gameOver: boolean = false;

  constructor() {
    super('GameScene');
    this.generator = new DungeonGenerator();
  }

  preload() {
    // Use the Scene's 'make' property to create graphics objects.
    // Fix: Removed 'add' property which is not supported in GraphicsCreatorConfig.
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Wall texture
    graphics.fillStyle(0x112233);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.lineStyle(2, 0x00ffff, 0.3);
    graphics.strokeRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8);
    graphics.generateTexture('wall', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Floor texture
    graphics.fillStyle(0x0a0a0a);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.lineStyle(1, 0x00ffff, 0.05);
    graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.generateTexture('floor', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Stairs texture
    graphics.fillStyle(0x0a0a0a);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.lineStyle(2, 0xffff00, 0.8);
    graphics.strokeRect(8, 8, TILE_SIZE - 16, TILE_SIZE - 16);
    graphics.generateTexture('stairs', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Player texture (Triangle/Neon)
    graphics.fillStyle(0x00ffff);
    graphics.fillTriangle(TILE_SIZE / 2, 4, 4, TILE_SIZE - 4, TILE_SIZE - 4, TILE_SIZE - 4);
    graphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Enemy texture (Diamond/Red)
    graphics.fillStyle(0xff0055);
    graphics.fillRect(8, 8, TILE_SIZE - 16, TILE_SIZE - 16);
    graphics.generateTexture('enemy', TILE_SIZE, TILE_SIZE);
    graphics.clear();
  }

  create() {
    this.startLevel();
    
    // Use the Scene's 'add' property to create UI text.
    this.uiText = this.add.text(20, 20, '', {
      fontSize: '18px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(100);

    this.updateUI();
  }

  startLevel() {
    this.gameOver = false;
    this.enemies = [];
    this.enemySprites.forEach(s => s.destroy());
    this.enemySprites.clear();
    
    const { spawn, exit } = this.generator.generate();
    
    // Clear old map
    this.mapSprites.forEach(row => row.forEach(s => s.destroy()));
    this.mapSprites = [];
    this.fovLayer.forEach(row => row.forEach(r => r.destroy()));
    this.fovLayer = [];

    // Draw map using the Scene's 'add' property for sprites and rectangles.
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.mapSprites[y] = [];
      this.fovLayer[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        let tex = 'wall';
        if (this.generator.tiles[y][x] === TileType.FLOOR) tex = 'floor';
        if (this.generator.tiles[y][x] === TileType.STAIRS) tex = 'stairs';
        
        const sprite = this.add.sprite(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, tex);
        this.mapSprites[y][x] = sprite;

        // Dark fog for FOV
        const fov = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, 0x000000, 0.8);
        fov.setDepth(10);
        this.fovLayer[y][x] = fov;
      }
    }

    // Player
    if (!this.player) {
      this.player = {
        id: 'player',
        type: 'player',
        pos: spawn,
        hp: 100,
        maxHp: 100,
        damage: 20
      };
    } else {
      this.player.pos = spawn;
    }

    if (!this.playerSprite) {
      this.playerSprite = this.add.sprite(spawn.x * TILE_SIZE + TILE_SIZE/2, spawn.y * TILE_SIZE + TILE_SIZE/2, 'player');
      this.playerSprite.setDepth(5);
    } else {
      this.playerSprite.setPosition(spawn.x * TILE_SIZE + TILE_SIZE/2, spawn.y * TILE_SIZE + TILE_SIZE/2);
    }

    // Spawn Enemies
    for (let i = 0; i < 5 + this.level; i++) {
      const ex = Math.floor(Math.random() * MAP_WIDTH);
      const ey = Math.floor(Math.random() * MAP_HEIGHT);
      if (this.generator.tiles[ey][ex] === TileType.FLOOR && (Math.abs(ex - spawn.x) > 5 || Math.abs(ey - spawn.y) > 5)) {
        const id = `enemy_${i}`;
        const enemy: Entity = {
          id,
          type: 'enemy',
          pos: { x: ex, y: ey },
          hp: 30 + this.level * 5,
          maxHp: 30 + this.level * 5,
          damage: 5 + this.level
        };
        this.enemies.push(enemy);
        const s = this.add.sprite(ex * TILE_SIZE + TILE_SIZE/2, ey * TILE_SIZE + TILE_SIZE/2, 'enemy');
        s.setDepth(4);
        this.enemySprites.set(id, s);
      }
    }

    this.updateFOV();
    // Use the Scene's 'cameras' property for camera controls.
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
  }

  update(time: number) {
    if (this.gameOver) {
      // Use the Scene's 'input' property for keyboard handling.
      if (this.input.keyboard?.addKey('SPACE').isDown) {
        this.level = 1;
        this.player!.hp = this.player!.maxHp;
        this.startLevel();
        this.updateUI();
      }
      return;
    }

    if (this.isPlayerTurn && time > this.lastInputTime + this.moveDelay) {
      const dx = this.handleInputX();
      const dy = this.handleInputY();
      const wait = this.input.keyboard?.addKey('SPACE').isDown;

      if (dx !== 0 || dy !== 0 || wait) {
        if (!wait) {
          this.tryMovePlayer(dx, dy);
        }
        this.isPlayerTurn = false;
        this.lastInputTime = time;
        this.onTurnEnd();
      }
    }
  }

  handleInputX(): number {
    const kb = this.input.keyboard;
    const pad = this.input.gamepad?.getPad(0);

    if (kb?.addKey('A').isDown || kb?.addKey('LEFT').isDown || (pad?.axes[0].value ?? 0) < -0.5 || (pad?.buttons[14]?.pressed)) return -1;
    if (kb?.addKey('D').isDown || kb?.addKey('RIGHT').isDown || (pad?.axes[0].value ?? 0) > 0.5 || (pad?.buttons[15]?.pressed)) return 1;
    return 0;
  }

  handleInputY(): number {
    const kb = this.input.keyboard;
    const pad = this.input.gamepad?.getPad(0);

    if (kb?.addKey('W').isDown || kb?.addKey('UP').isDown || (pad?.axes[1].value ?? 0) < -0.5 || (pad?.buttons[12]?.pressed)) return -1;
    if (kb?.addKey('S').isDown || kb?.addKey('DOWN').isDown || (pad?.axes[1].value ?? 0) > 0.5 || (pad?.buttons[13]?.pressed)) return 1;
    return 0;
  }

  tryMovePlayer(dx: number, dy: number) {
    if (!this.player) return;
    const nx = this.player.pos.x + dx;
    const ny = this.player.pos.y + dy;

    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return;

    // Check for wall
    if (this.generator.tiles[ny][nx] === TileType.WALL) return;

    // Check for enemy
    const enemy = this.enemies.find(e => e.pos.x === nx && e.pos.y === ny);
    if (enemy) {
      this.attack(this.player, enemy);
      return;
    }

    // Move
    this.player.pos.x = nx;
    this.player.pos.y = ny;
    this.playerSprite?.setPosition(nx * TILE_SIZE + TILE_SIZE/2, ny * TILE_SIZE + TILE_SIZE/2);

    // Check for stairs
    if (this.generator.tiles[ny][nx] === TileType.STAIRS) {
      this.level++;
      this.startLevel();
      this.updateUI();
    }
  }

  attack(attacker: Entity, target: Entity) {
    target.hp -= attacker.damage;
    
    // Simple visual feedback using the Scene's 'tweens' property.
    const sprite = target.type === 'player' ? this.playerSprite : this.enemySprites.get(target.id);
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        alpha: 0.5,
        duration: 50,
        yoyo: true
      });
    }

    if (target.hp <= 0) {
      if (target.type === 'enemy') {
        this.enemies = this.enemies.filter(e => e.id !== target.id);
        const s = this.enemySprites.get(target.id);
        s?.destroy();
        this.enemySprites.delete(target.id);
      } else {
        this.gameOver = true;
        this.updateUI();
      }
    }
  }

  onTurnEnd() {
    // Enemy turn logic
    this.enemies.forEach(enemy => {
      const dist = Phaser.Math.Distance.Between(enemy.pos.x, enemy.pos.y, this.player!.pos.x, this.player!.pos.y);
      if (dist < 6) {
        const dx = Math.sign(this.player!.pos.x - enemy.pos.x);
        const dy = Math.sign(this.player!.pos.y - enemy.pos.y);
        
        // Try move X then Y
        if (dx !== 0 && this.canEnemyMoveTo(enemy.pos.x + dx, enemy.pos.y)) {
          this.moveEnemy(enemy, dx, 0);
        } else if (dy !== 0 && this.canEnemyMoveTo(enemy.pos.x, enemy.pos.y + dy)) {
          this.moveEnemy(enemy, 0, dy);
        }
      }
    });

    this.updateFOV();
    this.updateUI();
    this.isPlayerTurn = true;
  }

  canEnemyMoveTo(nx: number, ny: number): boolean {
    if (this.generator.tiles[ny][nx] === TileType.WALL) return false;
    if (this.player!.pos.x === nx && this.player!.pos.y === ny) return true; // Can attack
    if (this.enemies.some(e => e.pos.x === nx && e.pos.y === ny)) return false;
    return true;
  }

  moveEnemy(enemy: Entity, dx: number, dy: number) {
    const nx = enemy.pos.x + dx;
    const ny = enemy.pos.y + dy;

    if (this.player!.pos.x === nx && this.player!.pos.y === ny) {
      this.attack(enemy, this.player!);
      return;
    }

    enemy.pos.x = nx;
    enemy.pos.y = ny;
    const s = this.enemySprites.get(enemy.id);
    s?.setPosition(nx * TILE_SIZE + TILE_SIZE/2, ny * TILE_SIZE + TILE_SIZE/2);
  }

  updateFOV() {
    const radius = 6;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const dist = Phaser.Math.Distance.Between(x, y, this.player!.pos.x, this.player!.pos.y);
        const fov = this.fovLayer[y][x];
        const sprite = this.mapSprites[y][x];
        
        if (dist < radius) {
          fov.setAlpha(0);
          sprite.setAlpha(1);
        } else {
          fov.setAlpha(0.7);
          sprite.setAlpha(0.3);
        }
        
        // Hide enemies outside FOV
        this.enemies.forEach(e => {
          const s = this.enemySprites.get(e.id);
          const eDist = Phaser.Math.Distance.Between(e.pos.x, e.pos.y, this.player!.pos.x, this.player!.pos.y);
          s?.setVisible(eDist < radius);
        });
      }
    }
  }

  updateUI() {
    if (!this.player) return;
    if (this.gameOver) {
      this.uiText?.setText(`[ SYSTEM FAILURE ]\nDEPTH: ${this.level}\nPRESS SPACE TO REBOOT`);
      this.uiText?.setColor('#ff0055');
    } else {
      this.uiText?.setText(`HP: ${this.player.hp}/${this.player.maxHp}\nLVL: ${this.level}\nENEMIES: ${this.enemies.length}`);
      this.uiText?.setColor('#00ffff');
    }
  }
}
