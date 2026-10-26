import type Phaser from 'phaser';
import { isValidPosition, session, validateMinigameResult } from './SessionStore';
import { stationById } from './MinigameRegistry';
import type { MinigamePayload, MinigameResult } from './types';

export function emitMinigameResult(scene: Phaser.Scene, payload: MinigamePayload, result: MinigameResult, destination = 'Hub') {
  if (!payload || !stationById(payload.minigameId)?.enabled ||
    !['presentation', 'explore'].includes(payload.mode) || payload.mode !== session.state.mode ||
    !isValidPosition(payload.returnPosition) || (payload.seed !== undefined && !Number.isFinite(payload.seed)) ||
    !['Hub', 'Ending'].includes(destination)) throw new Error('Invalid station handoff');
  validateMinigameResult(result);
  if (result.id !== payload.minigameId) throw new Error('Station result does not match its input');
  session.applyResult(result, payload.returnPosition);
  scene.scene.start(destination);
}
