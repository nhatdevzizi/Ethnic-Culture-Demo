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
import './styles/fonts.css';

let game: Phaser.Game | undefined;
ui.onFatalError = () => { game?.scene.getScenes(true).forEach(scene => scene.scene.pause()); };
const showError = () => { ui.error(ui.t('fatalErrorNote')); };
window.addEventListener('error', showError);
window.addEventListener('unhandledrejection', showError);

async function startGame() {
  ui.toast(ui.t('loading'));
  const fontDescriptors = [
    '400 16px "Be Vietnam Pro"',
    '600 16px "Be Vietnam Pro"',
    '700 16px "Be Vietnam Pro"',
    '800 16px "Be Vietnam Pro"',
    '500 16px "Lora"'
  ];
  await Promise.allSettled(fontDescriptors.map(font => document.fonts.load(font,'Tiếng Việt Đặng Ắ ặ Ỡ ự')));

  try {
    const errors = validateFacts(facts, minigameRegistry.filter(s => s.enabled).flatMap(s => s.factIds), false);
    if (errors.length) throw new Error(errors.join('\n'));
    if (ui.hasError) return;
    const createdGame = new Phaser.Game(gameConfig); game = createdGame;
    if (ui.hasError) { ui.onFatalError?.(); return; }
    if (import.meta.env.DEV) {
      const debugWindow = window as unknown as { render_game_to_text: () => string; advanceTime: (ms: number) => void };
      debugWindow.render_game_to_text = () => {
        const active = createdGame.scene.getScenes(true)[0] ?? createdGame.scene.getScenes(false).find(scene => scene.sys.isPaused());
        const hub = active?.scene.key === 'Hub' ? active as HubScene : undefined;
        const camera = hub?.cameras.main;
        const studio = active?.scene.key === 'PatternStudio' ? active as PatternStudioScene : undefined;
        return JSON.stringify({
          coordinateSystem: 'pixels; origin top-left; x right; y down', scene: active?.scene.key,
          player: hub?.player ? { x: hub.player.x, y: hub.player.y } : undefined,
          camera: camera ? {
            x: camera.scrollX, y: camera.scrollY,
            worldView: { x: camera.worldView.x, y: camera.worldView.y, width: camera.worldView.width, height: camera.worldView.height },
            viewport: { x: camera.x, y: camera.y, width: camera.width, height: camera.height },
          } : undefined,
          virtualSize: { width: createdGame.scale.width, height: createdGame.scale.height },
          ...hub?.layoutSnapshot(),
          nearby: hub?.nearby?.id, stamps: session.state.passportStamps, statuses: session.state.statuses,
          returnPosition: session.state.hubReturnPosition, mode: session.state.mode, locale: session.state.locale,
          paused: ui.blocked, hasError: ui.hasError, lowMotion: ui.lowMotion, puzzle: studio?.puzzle ? { slots: studio.puzzle.slots, attempts: studio.puzzle.attempts } : undefined,
        });
      };
      debugWindow.advanceTime = ms => {
        if (!Number.isFinite(ms) || ms < 0 || ms > 10000) throw new Error('advanceTime expects 0–10000 ms');
        createdGame.loop.sleep();
        for (let remaining = ms; remaining > 0; remaining -= 1000 / 60) createdGame.step(performance.now(), Math.min(remaining, 1000 / 60));
        createdGame.loop.wake();
      };
    }
  } catch { showError(); }
}

void startGame().catch(showError);
