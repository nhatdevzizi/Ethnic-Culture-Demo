import { describe, it, expect, beforeEach } from 'vitest';
import { GameshowEngine } from '../../src/game/core/GameshowEngine';

describe('GameshowEngine', () => {
  let engine: GameshowEngine;

  beforeEach(() => {
    engine = new GameshowEngine();
  });

  it('initializes teams correctly', () => {
    expect(engine.teams.length).toBe(5);
    expect(engine.teams.map((t) => t.name)).toEqual(['Nhóm 1', 'Nhóm 2', 'Nhóm 3', 'Nhóm 5', 'Nhóm 6']);
    expect(engine.teams.map((t) => t.id)).toEqual(['team_1', 'team_2', 'team_3', 'team_5', 'team_6']);
    expect(engine.teams[0].score).toBe(0);
    expect(engine.teams[0].cards.steal_points).toBe(0);
    expect(engine.teams[0].silverTorch).toBe(true);
    expect(engine.teams[0].goldTorch).toBe(true);
  });

  it('modifies scores and logs events', () => {
    engine.modifyScore('team_1', 20, 'Trả lời đúng');
    expect(engine.teams[0].score).toBe(20);
    expect(engine.lastScoreDeltas.length).toBe(1);
    expect(engine.lastScoreDeltas[0].delta).toBe(20);

    engine.modifyScore('team_1', -10, 'Trả lời sai');
    expect(engine.teams[0].score).toBe(10);
  });

  it('awards functional cards and activates steal points card', () => {
    engine.awardCard('team_1', 'steal_points');
    expect(engine.teams[0].cards.steal_points).toBe(1);

    // Give team 2 some points first
    engine.modifyScore('team_2', 50);

    // Team 1 steals 20 pts from Team 2
    const res = engine.useStealPointsCard('team_1', 'team_2');
    expect(res.success).toBe(true);
    expect(res.shielded).toBe(false);
    expect(engine.teams[0].score).toBe(20);
    expect(engine.teams[1].score).toBe(30);
    expect(engine.teams[0].cards.steal_points).toBe(0);
  });

  it('shield negates attack', () => {
    engine.awardCard('team_1', 'steal_points');
    engine.awardCard('team_2', 'shield');
    engine.modifyScore('team_2', 50);

    const res = engine.useStealPointsCard('team_1', 'team_2');
    expect(res.success).toBe(false);
    expect(res.shielded).toBe(true);
    expect(engine.teams[1].score).toBe(50); // no deduction
    expect(engine.teams[1].cards.shield).toBe(0); // consumed
  });

  it('calculates picture guess points based on opened tiles', () => {
    engine.r1AnsweredCount = 1;
    expect(engine.getRound1PictureGuessPoints()).toBe(30);

    engine.r1AnsweredCount = 4;
    expect(engine.getRound1PictureGuessPoints()).toBe(20);

    engine.r1AnsweredCount = 7;
    expect(engine.getRound1PictureGuessPoints()).toBe(10);
  });

  it('tracks key collection and unlocks drum finale only with 4 keys', () => {
    expect(engine.getCollectedKeysCount()).toBe(0);
    expect(engine.hasAllKeys()).toBe(false);

    engine.markStationCompleted('M01');
    expect(engine.getCollectedKeysCount()).toBe(1);
    expect(engine.isStationCompleted('M01')).toBe(true);
    expect(engine.hasAllKeys()).toBe(false);

    engine.markStationCompleted('M02');
    engine.markStationCompleted('M03');
    expect(engine.getCollectedKeysCount()).toBe(3);
    expect(engine.hasAllKeys()).toBe(false);

    // Completing M04 unlocks the 4th key
    engine.markStationCompleted('M04');
    expect(engine.getCollectedKeysCount()).toBe(4);
    expect(engine.hasAllKeys()).toBe(true);

    // Completing the Grand Finale board does not increase keys beyond 4/4
    engine.markStationCompleted('board');
    expect(engine.isStationCompleted('board')).toBe(true);
    expect(engine.getCollectedKeysCount()).toBe(4);
  });
  it('divides Trong Dong into 4 quadrants corresponding to minigames 1 to 4 and lights up individually', () => {
    expect(engine.isQuadrantLit(1)).toBe(false);
    expect(engine.isQuadrantLit(2)).toBe(false);
    expect(engine.isQuadrantLit(3)).toBe(false);
    expect(engine.isQuadrantLit(4)).toBe(false);

    // Giai xong minigame 1 se sang cung phan tu thu nhat
    engine.markStationCompleted('M01');
    expect(engine.isQuadrantLit(1)).toBe(true);
    expect(engine.isQuadrantLit(2)).toBe(false);
    expect(engine.isQuadrantLit(3)).toBe(false);
    expect(engine.isQuadrantLit(4)).toBe(false);

    // Giai xong minigame 3 se sang cung phan tu thu 3 cua trong dong
    engine.markStationCompleted('M03');
    expect(engine.isQuadrantLit(1)).toBe(true);
    expect(engine.isQuadrantLit(2)).toBe(false);
    expect(engine.isQuadrantLit(3)).toBe(true);
    expect(engine.isQuadrantLit(4)).toBe(false);

    // Giai xong minigame 2 va 4 se sang toan bo 4 cung
    engine.markStationCompleted('M02');
    engine.markStationCompleted('M04');
    expect(engine.isQuadrantLit(2)).toBe(true);
    expect(engine.isQuadrantLit(4)).toBe(true);
    expect(engine.hasAllKeys()).toBe(true);
  });

  it('randomly allocates functional cards to a subset of questions and allows claiming once', () => {
    // M01 (9 questions): cardCount = 2 (not every question has one)
    let m01Cards = 0;
    for (let i = 0; i < 9; i++) {
      if (engine.getQuestionCard('M01', i) !== null) m01Cards++;
    }
    expect(m01Cards).toBe(2);

    // M02 (7 questions): cardCount = 2
    let m02Cards = 0;
    for (let i = 0; i < 7; i++) {
      if (engine.getQuestionCard('M02', i) !== null) m02Cards++;
    }
    expect(m02Cards).toBe(2);

    // M03 (4 questions): cardCount = 1
    let m03Cards = 0;
    for (let i = 0; i < 4; i++) {
      if (engine.getQuestionCard('M03', i) !== null) m03Cards++;
    }
    expect(m03Cards).toBe(1);

    // Finding a question with a card in M01 and claiming it
    let targetIdx = -1;
    for (let i = 0; i < 9; i++) {
      if (engine.getQuestionCard('M01', i) !== null) {
        targetIdx = i;
        break;
      }
    }
    expect(targetIdx).toBeGreaterThanOrEqual(0);

    const card = engine.claimQuestionCard('M01', targetIdx);
    expect(card).not.toBeNull();
    // Claiming again returns null
    expect(engine.claimQuestionCard('M01', targetIdx)).toBeNull();
  });
});