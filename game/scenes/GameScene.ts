import * as Phaser from 'phaser';
import { DungeonGenerator } from '../logic/DungeonGenerator';
import { Creature } from '../logic/Creature';
import { Monster, MonsterType } from '../logic/Monster';
import { TileType, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, Position } from '../types';

export class GameScene extends Phaser.Scene {
  // Fix: Explicitly declare Phaser systems that are injected at runtime to satisfy TypeScript
  public add!: Phaser.GameObjects.GameObjectFactory;
  public make!: Phaser.GameObjects.GameObjectCreator;
  public cameras!: Phaser.Cameras.Scene2D.CameraManager;
  public input!: Phaser.Input.InputPlugin;
  public tweens!: Phaser.Tweens.TweenManager;

  private generator: DungeonGenerator;
  private player: Creature | null = null;
  private monsters: Monster[] = [];
  private mapSprites: Phaser.GameObjects.Sprite[][] = [];
  private fovLayer: Phaser.GameObjects.Rectangle[][] = [];
  
  private isPlayerTurn: boolean = true;
  private lastInputTime: number = 0;
  private moveDelay: number = 150; 

  private level: number = 1;
  private uiText: Phaser.GameObjects.Text | null = null;
  private gameOver: boolean = false;

  // Gamepad cycling state
  private activeGamepadIndex: number = 0;
  private tabKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('GameScene');
    this.generator = new DungeonGenerator();
  }

  preload() {
    // Fix: Using the declared 'make' property
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

    // Player texture
    graphics.fillStyle(0x00ffff);
    graphics.fillTriangle(TILE_SIZE / 2, 4, 4, TILE_SIZE - 4, TILE_SIZE - 4, TILE_SIZE - 4);
    graphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Enemy texture
    graphics.fillStyle(0xffffff); // White base, will be tinted
    graphics.fillRect(8, 8, TILE_SIZE - 16, TILE_SIZE - 16);
    graphics.generateTexture('enemy', TILE_SIZE, TILE_SIZE);
    graphics.clear();
  }

  create() {
    this.startLevel();
    
    // Fix: Using the declared 'add' property
    this.uiText = this.add.text(20, 20, '', {
      fontSize: '18px',
      color: '#00ffff',
      fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(100);

    // Setup Tab key for controller cycling
    if (this.input.keyboard) {
      this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      // Prevent browser from tab-navigating out of the game
      this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    }

    this.updateUI();
  }

  startLevel() {
    this.gameOver = false;
    
    // Cleanup old monsters and their sprites
    this.monsters.forEach(m => m.destroy());
    this.monsters = [];
    
    const { spawn, exit } = this.generator.generate();
    
    // Clear old map sprites
    this.mapSprites.forEach(row => row.forEach(s => s.destroy()));
    this.mapSprites = [];
    this.fovLayer.forEach(row => row.forEach(r => r.destroy()));
    this.fovLayer = [];

    // Draw map
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.mapSprites[y] = [];
      this.fovLayer[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        let tex = 'wall';
        if (this.generator.tiles[y][x] === TileType.FLOOR) tex = 'floor';
        if (this.generator.tiles[y][x] === TileType.STAIRS) tex = 'stairs';
        
        // Fix: Using the declared 'add' property
        const sprite = this.add.sprite(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, tex);
        this.mapSprites[y][x] = sprite;

        // Fix: Using the declared 'add' property
        const fov = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, 0x000000, 0.8);
        fov.setDepth(10);
        this.fovLayer[y][x] = fov;
      }
    }

    // Player instantiation
    if (!this.player) {
      this.player = new Creature(this, 'player', 'player', spawn, 100, 20, 'player');
      this.player.sprite.setDepth(20);
    } else {
      this.player.moveTo(spawn.x, spawn.y);
      this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp); // Small heal on level up
    }

    // Spawn Monsters
    const monsterTypes = [MonsterType.STALKER, MonsterType.WANDERER, MonsterType.SENTINEL];
    for (let i = 0; i < 5 + this.level; i++) {
      const ex = Math.floor(Math.random() * MAP_WIDTH);
      const ey = Math.floor(Math.random() * MAP_HEIGHT);
      
      if (this.generator.tiles[ey][ex] === TileType.FLOOR && 
          Phaser.Math.Distance.Between(ex, ey, spawn.x, spawn.y) > 6) {
        
        const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        const monster = new Monster(this, `mob_${i}_${this.level}`, { x: ex, y: ey }, this.level, type);
        monster.sprite.setDepth(15);
        this.monsters.push(monster);
      }
    }

    this.updateFOV();
    // Fix: Using the declared 'cameras' property
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
  }

  update(time: number) {
    // Handle Gamepad Cycling
    if (Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      const connectedPads = this.input.gamepad?.gamepads.filter(p => p !== null) || [];
      if (connectedPads.length > 0) {
        this.activeGamepadIndex = (this.activeGamepadIndex + 1) % connectedPads.length;
        this.updateUI();
        
        // Visual feedback for switch
        this.tweens.add({
          targets: this.uiText,
          scale: 1.1,
          duration: 100,
          yoyo: true
        });
      }
    }

    if (this.gameOver) {
      // Fix: Using the declared 'input' property
      if (this.input.keyboard?.addKey('SPACE').isDown) {
        this.level = 1;
        if (this.player) {
          this.player.hp = this.player.maxHp;
        }
        this.startLevel();
        this.updateUI();
      }
      return;
    }

    if (this.isPlayerTurn && time > this.lastInputTime + this.moveDelay) {
      const dx = this.handleInputX();
      const dy = this.handleInputY();
      // Fix: Using the declared 'input' property
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

  private getActivePad(): Phaser.Input.Gamepad.Gamepad | null {
    if (!this.input.gamepad) return null;
    const connectedPads = this.input.gamepad.gamepads.filter(p => p !== null);
    if (connectedPads.length === 0) return null;
    return connectedPads[this.activeGamepadIndex % connectedPads.length];
  }

  private isButtonPressed(pad: Phaser.Input.Gamepad.Gamepad | null, index: number): boolean {
    if (!pad || !pad.buttons[index]) return false;
    const button = pad.buttons[index];
    return button.pressed || button.value > 0.1;
  }

  handleInputX(): number {
    const kb = this.input.keyboard;
    const pad = this.getActivePad();
    // LEFT is button 2 or button 14
    if (kb?.addKey('A').isDown || kb?.addKey('LEFT').isDown || this.isButtonPressed(pad, 14) || this.isButtonPressed(pad, 4)) return -1;
    // RIGHT is button 1 or button 15
    if (kb?.addKey('D').isDown || kb?.addKey('RIGHT').isDown || this.isButtonPressed(pad, 15) || this.isButtonPressed(pad, 0)) return 1;
    return 0;
  }

  handleInputY(): number {
    const kb = this.input.keyboard;
    const pad = this.getActivePad();
    // UP is button 3 or button 12
    if (kb?.addKey('W').isDown || kb?.addKey('UP').isDown || this.isButtonPressed(pad, 12) || this.isButtonPressed(pad, 3)) return -1;
    // DOWN is button 0 or button 13
    if (kb?.addKey('S').isDown || kb?.addKey('DOWN').isDown || this.isButtonPressed(pad, 13) || this.isButtonPressed(pad, 1)) return 1;
    return 0;
  }

  tryMovePlayer(dx: number, dy: number) {
    if (!this.player) return;
    const nx = this.player.pos.x + dx;
    const ny = this.player.pos.y + dy;

    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return;
    if (this.generator.tiles[ny][nx] === TileType.WALL) return;

    // Check for combat
    const target = this.monsters.find(m => m.pos.x === nx && m.pos.y === ny);
    if (target) {
      this.resolveCombat(this.player, target);
      return;
    }

    this.player.moveTo(nx, ny);

    // Stairs logic
    if (this.generator.tiles[ny][nx] === TileType.STAIRS) {
      this.level++;
      this.startLevel();
    }
  }

  resolveCombat(attacker: Creature, defender: Creature) {
    const isDead = defender.takeDamage(attacker.damage);
    
    // Feedback
    // Fix: Using the declared 'tweens' property
    this.tweens.add({
      targets: defender.sprite,
      alpha: 0.3,
      duration: 50,
      yoyo: true
    });

    if (isDead) {
      if (defender.type === 'enemy') {
        this.monsters = this.monsters.filter(m => m !== defender);
        defender.destroy();
      } else {
        this.gameOver = true;
      }
    }
  }

  onTurnEnd() {
    if (!this.player) return;

    // Process all monsters AI
    this.monsters.forEach(m => {
      const move = m.updateAI(this.player!.pos, this.generator.tiles, this.monsters);
      
      if (move) {
        // Check if monster hits player
        if (move.x === this.player!.pos.x && move.y === this.player!.pos.y) {
          this.resolveCombat(m, this.player!);
        } else {
          m.moveTo(move.x, move.y);
        }
      }
    });

    this.updateFOV();
    this.updateUI();
    this.isPlayerTurn = true;
  }

  updateFOV() {
    if (!this.player) return;
    const radius = 6;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const dist = Phaser.Math.Distance.Between(x, y, this.player.pos.x, this.player.pos.y);
        const fov = this.fovLayer[y][x];
        const sprite = this.mapSprites[y][x];
        
        if (dist < radius) {
          fov.setAlpha(0);
          sprite.setAlpha(1);
        } else {
          fov.setAlpha(0.75);
          sprite.setAlpha(0.25);
        }
      }
    }

    // Toggle monster visibility
    this.monsters.forEach(m => {
      const dist = Phaser.Math.Distance.Between(m.pos.x, m.pos.y, this.player!.pos.x, this.player!.pos.y);
      m.sprite.setVisible(dist < radius);
    });
  }

  updateUI() {
    if (!this.player) return;
    if (this.gameOver) {
      this.uiText?.setText(`[ PROTOCOL TERMINATED ]\nDEPTH REACHED: ${this.level}\nSPACE: REBOOT`);
      this.uiText?.setColor('#ff3300');
    } else {
      const connectedPads = this.input.gamepad?.gamepads.filter(p => p !== null) || [];
      const padInfo = connectedPads.length > 0 
        ? `\nCONTROLLER: #${this.activeGamepadIndex + 1} (${connectedPads[this.activeGamepadIndex % connectedPads.length]?.id.slice(0, 10)}...)` 
        : '';
      
      this.uiText?.setText(`HP: ${this.player.hp}/${this.player.maxHp}\nDEPTH: ${this.level}\nHOSTILES: ${this.monsters.length}${padInfo}`);
      this.uiText?.setColor('#00ffff');
    }
  }
}
