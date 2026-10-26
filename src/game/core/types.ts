export type Locale = 'vi' | 'en';
export type GameMode = 'presentation' | 'explore';
export type StationStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';
export type Position = { x: number; y: number };
export type Localized = { vi: string; en?: string };
export type ReviewStatus = 'draft' | 'verified' | 'approved';
export type LearningFact = {
  id: string; communityIds: string[]; title: Localized; body: Localized;
  context?: { place?: string; period?: string; qualifiers?: string[] };
  sourceUrls: string[]; reviewStatus: ReviewStatus; reviewer?: string;
  permittedAssetIds?: string[]; fictional?: boolean;
};
export type MinigameDefinition = {
  id: string; sceneKey: string; titleKey: string; objectiveKey: string;
  factIds: string[]; estimatedSeconds: number; requiredInPresentation: boolean;
  enabled: boolean; portal: Position; symbol: string;
};
export type MinigamePayload = {
  minigameId: string; mode: GameMode; seed?: number; returnPosition: Position;
};
export type MinigameResult = {
  id: string; outcome: 'completed' | 'skipped' | 'abandoned'; score: number;
  learnedFactIds: string[]; attempts: number;
};
export type SessionState = {
  hubLayoutVersion: number;
  schemaVersion: number; contentVersion: string; mode: GameMode; locale: Locale;
  statuses: Record<string, StationStatus>; passportStamps: string[];
  learnedFactIds: string[]; hubReturnPosition: Position;
};
