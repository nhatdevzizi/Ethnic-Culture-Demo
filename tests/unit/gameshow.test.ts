import { describe, it, expect, beforeEach } from 'vitest';
import { GameshowEngine } from '../../src/game/core/GameshowEngine';

describe('GameshowEngine', () => {
  let engine: GameshowEngine;

  beforeEach(() => {
    engine = new GameshowEngine(['Đội 1', 'Đội 2', 'Đội 3', 'Đội 4']);
  });

  it('initializes teams correctly', () => {
    expect(engine.teams.length).toBe(4);
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
  });
});
