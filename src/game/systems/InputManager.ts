import Phaser from 'phaser';
export class InputManager {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene) {
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    const prevent = (event: KeyboardEvent) => {
      if (event.target === scene.game.canvas || (event.target as HTMLElement)?.id === 'game-container') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      }
    };
    document.addEventListener('keydown', prevent);
    scene.events.once('shutdown', () => { document.removeEventListener('keydown', prevent); scene.input.keyboard?.removeAllKeys(true); });
  }
  movement() {
    const k = this.keys;
    const x = Number(k.D.isDown || k.RIGHT.isDown) - Number(k.A.isDown || k.LEFT.isDown);
    const y = Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown);
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }
}
