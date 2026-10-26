type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'cultural-trails-accessibility-v1';

export class AccessibilityPreferences {
  private choice?: boolean;
  constructor(private storage?: PreferenceStorage, private systemReducedMotion = false) {
    try {
      const saved = storage?.getItem(key);
      if (saved === 'low-motion' || saved === 'full-motion') this.choice = saved === 'low-motion';
    } catch { /* Use the system preference when browser storage is unavailable. */ }
  }
  get lowMotion() { return this.choice ?? this.systemReducedMotion; }
  setLowMotion(value: boolean) {
    this.choice = value;
    try { this.storage?.setItem(key, value ? 'low-motion' : 'full-motion'); }
    catch { /* The current page still keeps the player's choice. */ }
  }
}
