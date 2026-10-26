import { minigameRegistry, stationById } from './MinigameRegistry';
import type { GameMode, Locale, MinigameResult, Position, SessionState } from './types';
import hubMap from '../../../public/assets/maps/hub.json';
type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;
const saveKey = 'cultural-trails-v1';
const contentVersion = 'fictional-demo-1';
const fresh = (): SessionState => ({
  schemaVersion: 1, contentVersion, hubLayoutVersion: 2, mode: 'presentation', locale: 'vi',
  statuses: Object.fromEntries(minigameRegistry.map(s => [s.id, 'not-started'])),
  passportStamps: [], learnedFactIds: [], hubReturnPosition: { ...hubMap.spawn },
});
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export const isValidPosition = (p: unknown): p is Position => isRecord(p) &&
  typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y) &&
  p.x >= 48 && p.x <= hubMap.width * hubMap.tileSize - 48 && p.y >= 48 && p.y <= hubMap.height * hubMap.tileSize - 48;

export function validateMinigameResult(result: unknown): asserts result is MinigameResult {
  if (!isRecord(result) || typeof result.id !== 'string') throw new Error('Invalid minigame result');
  const definition = stationById(result.id);
  if (!definition?.enabled || typeof result.outcome !== 'string' || !['completed', 'skipped', 'abandoned'].includes(result.outcome) ||
    typeof result.score !== 'number' || !Number.isFinite(result.score) || result.score < 0 ||
    typeof result.attempts !== 'number' || !Number.isInteger(result.attempts) || result.attempts < 0 ||
    !Array.isArray(result.learnedFactIds) || !result.learnedFactIds.every(id => typeof id === 'string' && definition.factIds.includes(id))) {
    throw new Error('Invalid minigame result');
  }
}

export class SessionStore {
  state = fresh();
  storageAvailable = true;
  constructor(private storage?: SaveStorage) {
    if (!storage) { this.storageAvailable = false; return; }
    let raw: string | null;
    try { raw = storage.getItem(saveKey); }
    catch { this.storageAvailable = false; return; }
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return;
      const value = parsed as Partial<SessionState>;
      const statuses = value.statuses, stamps = value.passportStamps, learned = value.learnedFactIds;
      if (value.schemaVersion !== 1 || value.contentVersion !== contentVersion ||
        (value.hubLayoutVersion !== undefined && value.hubLayoutVersion !== 1 && value.hubLayoutVersion !== 2) ||
        !['vi', 'en'].includes(value.locale ?? '') || !['presentation', 'explore'].includes(value.mode ?? '') ||
        !isValidPosition(value.hubReturnPosition) || !isRecord(statuses) ||
        Object.keys(statuses).some(id => !stationById(id)) ||
        !minigameRegistry.every(s => ['not-started', 'in-progress', 'completed', 'skipped'].includes(statuses[s.id])) ||
        minigameRegistry.some(s => !s.enabled && statuses[s.id] !== 'not-started') ||
        !Array.isArray(stamps) || !stamps.every(id => stationById(id)?.enabled && statuses[id] === 'completed') ||
        !Array.isArray(learned) || !learned.every(id => minigameRegistry.some(s => statuses[s.id] === 'completed' && s.factIds.includes(id))) ||
        minigameRegistry.some(s => statuses[s.id] === 'completed' && !stamps.includes(s.id))) return;
      const valid = value as SessionState;
      this.state = {
        schemaVersion: 1, contentVersion, hubLayoutVersion: 2, mode: valid.mode, locale: valid.locale,
        statuses: Object.fromEntries(minigameRegistry.map(s => [s.id, valid.statuses[s.id]])),
        passportStamps: [...new Set(valid.passportStamps)], learnedFactIds: [...new Set(valid.learnedFactIds)],
        hubReturnPosition: value.hubLayoutVersion === 2 ? { x: valid.hubReturnPosition.x, y: valid.hubReturnPosition.y } : { ...hubMap.spawn },
      };
      for (const id of Object.keys(this.state.statuses)) if (this.state.statuses[id] === 'in-progress') this.state.statuses[id] = 'not-started';
    } catch { /* Invalid saved data recovers fresh without declaring a storage outage. */ }
  }
  configure(mode: GameMode, locale: Locale) { this.state.mode = mode; this.state.locale = locale; this.save(); }
  reset() { const { mode, locale } = this.state; this.state = { ...fresh(), mode, locale }; this.save(); }
  setPosition(position: Position) {
    if (!isValidPosition(position)) throw new Error('Invalid hub return position');
    this.state.hubReturnPosition = { ...position }; this.save();
  }
  begin(id: string, position: Position) {
    if (!stationById(id)?.enabled) throw new Error('Unknown or disabled station');
    this.setPosition(position);
    if (!['completed', 'skipped'].includes(this.state.statuses[id])) this.state.statuses[id] = 'in-progress';
    this.save();
  }
  applyResult(result: MinigameResult, returnPosition?: Position) {
    validateMinigameResult(result);
    if (returnPosition !== undefined && !isValidPosition(returnPosition)) throw new Error('Invalid hub return position');
    if (result.outcome === 'completed') {
      this.state.statuses[result.id] = 'completed';
      this.state.passportStamps = [...new Set([...this.state.passportStamps, result.id])];
      this.state.learnedFactIds = [...new Set([...this.state.learnedFactIds, ...result.learnedFactIds])];
    } else if (this.state.statuses[result.id] !== 'completed') {
      this.state.statuses[result.id] = result.outcome === 'skipped' || this.state.statuses[result.id] === 'skipped' ? 'skipped' : 'not-started';
    }
    if (returnPosition) this.state.hubReturnPosition = { x: returnPosition.x, y: returnPosition.y };
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
