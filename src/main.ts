import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { session } from './game/core/SessionStore';
import { ui } from './game/ui/OverlayController';
import { validateFacts } from './game/core/ContentValidation';
import { facts } from './game/core/content';
import { minigameRegistry } from './game/core/MinigameRegistry';
import type { HubScene } from './game/scenes/HubScene';
import type { PatternStudioScene } from './game/minigames/PatternStudioScene';
import './styles/main.css';

const showError = (message: string) => {
  ui.error(message);
};
window.addEventListener('error', event => showError(event.message || 'Unexpected game error'));
window.addEventListener('unhandledrejection', event => showError(String(event.reason)));
try {
  const errors = validateFacts(facts, minigameRegistry.filter(s => s.enabled).flatMap(s => s.factIds), false);
  if (errors.length) throw new Error(errors.join('\n'));
  const game = new Phaser.Game(gameConfig);
  if (import.meta.env.DEV) {
    const debugWindow = window as unknown as { render_game_to_text: () => string; advanceTime: (ms: number) => void };
    debugWindow.render_game_to_text = () => {
      const active = game.scene.getScenes(true)[0];
      const hub = active?.scene.key === 'Hub' ? active as HubScene : undefined;
      const studio = active?.scene.key === 'PatternStudio' ? active as PatternStudioScene : undefined;
      return JSON.stringify({
        coordinateSystem: 'pixels; origin top-left; x right; y down', scene: active?.scene.key,
        player: hub?.player ? { x: hub.player.x, y: hub.player.y } : undefined,
        camera: hub ? { x: hub.cameras.main.scrollX, y: hub.cameras.main.scrollY } : undefined,
        nearby: hub?.nearby?.id, stamps: session.state.passportStamps, statuses: session.state.statuses,
        returnPosition: session.state.hubReturnPosition, mode: session.state.mode, locale: session.state.locale,
        paused: ui.blocked, puzzle: studio?.puzzle ? { slots: studio.puzzle.slots, attempts: studio.puzzle.attempts } : undefined,
      });
    };
    debugWindow.advanceTime = ms => {
      if (!Number.isFinite(ms) || ms < 0 || ms > 10000) throw new Error('advanceTime expects 0–10000 ms');
      game.loop.sleep();
      for (let remaining = ms; remaining > 0; remaining -= 1000 / 60) game.step(performance.now(), Math.min(remaining, 1000 / 60));
      game.loop.wake();
    };
  }
} catch (error) { showError(String(error)); }
