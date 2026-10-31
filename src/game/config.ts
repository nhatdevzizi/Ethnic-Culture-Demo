import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { HubScene } from './scenes/HubScene';
import { PatternStudioScene } from './minigames/PatternStudioScene';
import { SoundGardenScene } from './minigames/SoundGardenScene';
import { StoryTrailScene } from './minigames/StoryTrailScene';
import { EndingScene } from './scenes/EndingScene';
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, parent: 'game-container', width: 1280, height: 720,
  backgroundColor: '#183b38', pixelArt: true, roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  dom: { createContainer: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { keyboard: { capture: [] } },
  scene: [BootScene, PreloadScene, TitleScene, HubScene, PatternStudioScene, SoundGardenScene, StoryTrailScene, EndingScene],
};
