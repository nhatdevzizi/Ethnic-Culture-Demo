import { minigameRegistry, stationById } from './MinigameRegistry';
import type { GameMode, Locale, MinigameResult, Position, SessionState } from './types';
type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;
const saveKey = 'cultural-trails-v1';
const contentVersion = 'fictional-demo-1';
const fresh = (): SessionState => ({
  schemaVersion: 1, contentVersion, mode: 'presentation', locale: 'vi',
  statuses: Object.fromEntries(minigameRegistry.map(s => [s.id, 'not-started'])),
  passportStamps: [], learnedFactIds: [], hubReturnPosition: { x: 704, y: 672 },
});
const validPosition = (p: Position) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 48 && p.x <= 1488 && p.y >= 48 && p.y <= 1104;

export class SessionStore {
  state = fresh();
  storageAvailable = true;
  constructor(private storage?: SaveStorage) {
    if (!storage) { this.storageAvailable = false; return; }
    try {
      const raw = storage.getItem(saveKey);
      if (!raw) return;
      const value = JSON.parse(raw) as SessionState;
      const knownFacts = minigameRegistry.flatMap(s => s.factIds);
      if (value.schemaVersion !== 1 || value.contentVersion !== contentVersion ||
        !['vi', 'en'].includes(value.locale) || !['presentation', 'explore'].includes(value.mode) ||
        !validPosition(value.hubReturnPosition) || !value.statuses ||
        !minigameRegistry.every(s => ['not-started', 'in-progress', 'completed', 'skipped'].includes(value.statuses[s.id])) ||
        !Array.isArray(value.passportStamps) || !value.passportStamps.every(id => stationById(id)?.enabled && value.statuses[id] === 'completed') ||
        !Array.isArray(value.learnedFactIds) || !value.learnedFactIds.every(id => knownFacts.includes(id)) ||
        minigameRegistry.some(s => value.statuses[s.id] === 'completed' && !value.passportStamps.includes(s.id))) return;
      this.state = { ...value, passportStamps: [...new Set(value.passportStamps)], learnedFactIds: [...new Set(value.learnedFactIds)] };
      for (const id of Object.keys(this.state.statuses)) if (this.state.statuses[id] === 'in-progress') this.state.statuses[id] = 'not-started';
    } catch { this.storageAvailable = false; }
  }
  configure(mode: GameMode, locale: Locale) { this.state.mode = mode; this.state.locale = locale; this.save(); }
  reset() { const { mode, locale } = this.state; this.state = { ...fresh(), mode, locale }; this.save(); }
  setPosition(position: Position) {
    if (!validPosition(position)) throw new Error('Invalid hub return position');
    this.state.hubReturnPosition = { ...position }; this.save();
  }
  begin(id: string, position: Position) {
    if (!stationById(id)?.enabled) throw new Error('Unknown or disabled station');
    this.setPosition(position);
    if (this.state.statuses[id] !== 'completed') this.state.statuses[id] = 'in-progress';
    this.save();
  }
  applyResult(result: MinigameResult) {
    const definition = stationById(result.id);
    if (!definition?.enabled || !['completed', 'skipped', 'abandoned'].includes(result.outcome) ||
      !Number.isFinite(result.score) || result.score < 0 || !Number.isInteger(result.attempts) || result.attempts < 0 ||
      !Array.isArray(result.learnedFactIds) || !result.learnedFactIds.every(id => definition.factIds.includes(id))) throw new Error('Invalid minigame result');
    if (result.outcome === 'completed') {
      this.state.statuses[result.id] = 'completed';
      this.state.passportStamps = [...new Set([...this.state.passportStamps, result.id])];
      this.state.learnedFactIds = [...new Set([...this.state.learnedFactIds, ...result.learnedFactIds])];
    } else if (this.state.statuses[result.id] !== 'completed') {
      this.state.statuses[result.id] = result.outcome === 'skipped' ? 'skipped' : 'not-started';
    }
    this.save();
  }
  private save() {
    try { this.storage?.setItem(saveKey, JSON.stringify(this.state)); }
    catch { this.storageAvailable = false; }
  }
}

let storage: SaveStorage | undefined;
try { storage = typeof window === 'undefined' ? undefined : window.localStorage; } catch { /* In-memory play still works. */ }
export const session = new SessionStore(storage);
