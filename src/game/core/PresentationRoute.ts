import { minigameRegistry } from './MinigameRegistry';
import type { StationStatus } from './types';

export function nextPresentationStation(statuses: Record<string, StationStatus>) {
  return minigameRegistry.find(station => station.enabled && station.requiredInPresentation &&
    !['completed', 'skipped'].includes(statuses[station.id]));
}

export class TutorialProgress {
  private memory = false;
  constructor(private storage?: Pick<Storage, 'getItem' | 'setItem'>) {}
  get dismissed() {
    if (this.memory) return true;
    try { return this.storage?.getItem('cultural-trails-tutorial-v1') === 'dismissed'; }
    catch { return false; }
  }
  dismiss() {
    this.memory = true;
    try { this.storage?.setItem('cultural-trails-tutorial-v1', 'dismissed'); }
    catch { /* Dismissal still lasts for this page session. */ }
  }
}
