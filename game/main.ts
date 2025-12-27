
import * as Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

export function initPhaserGame(parent: string) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parent,
    physics: {
      default: 'arcade',
      arcade: {
        // Fix: Added required 'x' property to gravity Vector2Like
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    input: {
      gamepad: true
    },
    scene: [GameScene],
    backgroundColor: '#050505',
    pixelArt: true,
  };

  return new Phaser.Game(config);
}
