export class StoryPractice {
  private _evidence = new Set<string>();
  public readonly evidence: ReadonlySet<string> = this._evidence;
  public attempts = 0;
  public completed = false;
  private readonly requiredEvidence: ReadonlyArray<string>;

  constructor(requiredEvidence: readonly string[]) {
    if (!requiredEvidence || requiredEvidence.length === 0) throw new Error('Required evidence cannot be empty');
    const unique = [...new Set(requiredEvidence)];
    if (unique.length !== requiredEvidence.length) throw new Error('Required evidence contains duplicates');
    for (const id of requiredEvidence) {
      if (typeof id !== 'string' || id.trim() === '') throw new Error('Required evidence must be non-empty strings');
    }
    this.requiredEvidence = [...requiredEvidence];
  }

  choose(evidenceId: string | null): void {
    if (evidenceId === null) { this.attempts++; return; }
    if (!this.requiredEvidence.includes(evidenceId)) throw new Error(`Unknown evidence ID: ${evidenceId}`);
    this.attempts++;
    this._evidence.add(evidenceId);
  }

  plan(correct: boolean): 'missing' | 'reconsider' | 'complete' {
    this.attempts++;
    if (!this.requiredEvidence.every(id => this._evidence.has(id))) return 'missing';
    if (!correct) return 'reconsider';
    this.completed = true;
    return 'complete';
  }

  reset(): void {
    this._evidence.clear();
    this.attempts = 0;
    this.completed = false;
  }
}
