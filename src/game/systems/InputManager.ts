import Phaser from 'phaser';
export class InputManager {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  constructor(scene: Phaser.Scene) {
    // Only the focused playfield suppresses browser keys; native controls retain arrow-key input.
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT', false) as Record<string, Phaser.Input.Keyboard.Key>;
    const prevent = (event: KeyboardEvent) => {
      if (event.target === scene.game.canvas || (event.target as HTMLElement)?.id === 'game-container') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      }
    };
    const reset = () => { Object.values(this.keys).forEach(key => key.reset()); };
    const visibility = () => { if (document.hidden) reset(); };
    document.addEventListener('keydown', prevent);
    window.addEventListener('blur', reset); document.addEventListener('visibilitychange', visibility); scene.events.on('pause', reset);
    scene.events.once('shutdown', () => {
      document.removeEventListener('keydown', prevent); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', visibility); scene.events.off('pause', reset);
      scene.input.keyboard?.removeAllKeys(true);
    });
  }
  movement() {
    const k = this.keys;
    const x = Number(k.D.isDown || k.RIGHT.isDown) - Number(k.A.isDown || k.LEFT.isDown);
    const y = Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown);
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }
}
