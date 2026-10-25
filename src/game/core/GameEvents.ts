import type Phaser from 'phaser';
import { session } from './SessionStore';
import type { MinigamePayload, MinigameResult } from './types';

export function emitMinigameResult(scene: Phaser.Scene, payload: MinigamePayload, result: MinigameResult, destination = 'Hub') {
  if (result.id !== payload.minigameId) throw new Error('Station result does not match its input');
  session.applyResult(result);
  session.setPosition(payload.returnPosition);
  scene.scene.start(destination);
}
