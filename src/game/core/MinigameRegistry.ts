import definitions from '../../content/minigames.json';
import type { MinigameDefinition } from './types';
export const minigameRegistry: readonly MinigameDefinition[] = definitions;
export const stationById = (id: string) => minigameRegistry.find(station => station.id === id);
