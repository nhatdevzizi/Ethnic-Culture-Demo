import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../../src/game/systems/AudioManager';

function media() {
  const clips: { src: string; volume: number; currentTime: number; preload: string; load: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; listeners: Map<string, () => void> }[] = [];
  const manager = new AudioManager(src => {
    const listeners = new Map<string, () => void>();
    const clip = { src, volume: 1, currentTime: 0, preload: '', load: vi.fn(), pause: vi.fn(), play: vi.fn(() => Promise.resolve()), listeners,
      addEventListener: (name: string, callback: () => void) => listeners.set(name, callback) };
    clips.push(clip);
    return clip as unknown as HTMLAudioElement;
  });
  return { manager, clips };
}

afterEach(() => vi.unstubAllGlobals());

describe('optional local cue audio', () => {
  it('requires opt-in, updates volume, and cuts prior cues on pause, mute, and scene cleanup', async () => {
    const { manager, clips } = media();
    expect(manager.muted).toBe(true);
    manager.play('tap');
    expect(clips).toHaveLength(0);
    manager.setVolume(0.25);
    await manager.toggleMute();
    expect(manager.muted).toBe(false);
    expect(clips).toHaveLength(3);
    expect(clips.map(clip => clip.src)).toEqual(expect.arrayContaining([
      expect.stringMatching(/assets\/audio\/tap\.wav$/), expect.stringMatching(/assets\/audio\/rest\.wav$/), expect.stringMatching(/assets\/audio\/stamp\.wav$/),
    ]));
    expect(clips.every(clip => clip.volume === 0.25)).toBe(true);
    const tap = clips.find(clip => clip.src.endsWith('tap.wav'))!;
    const rest = clips.find(clip => clip.src.endsWith('rest.wav'))!;
    manager.play('tap');
    expect(tap.play).toHaveBeenCalledTimes(1);
    tap.currentTime = 0.05;
    manager.play('rest');
    expect(tap.currentTime).toBe(0);
    expect(tap.pause).toHaveBeenCalled();
    expect(rest.play).toHaveBeenCalledTimes(1);
    manager.setPaused(true);
    manager.play('tap');
    expect(tap.play).toHaveBeenCalledTimes(1);
    manager.setPaused(false);
    expect(tap.play).toHaveBeenCalledTimes(1);
    manager.play('tap');
    expect(tap.play).toHaveBeenCalledTimes(2);
    vi.stubGlobal('document', { hidden: true });
    manager.play('tap');
    expect(tap.play).toHaveBeenCalledTimes(2);
    vi.stubGlobal('document', { hidden: false });
    await manager.toggleMute();
    manager.play('tap');
    expect(tap.play).toHaveBeenCalledTimes(2);
    manager.stopAll();
    expect(clips.every(clip => clip.currentTime === 0)).toBe(true);
    manager.setVolume(2); expect(manager.volume).toBe(1);
    manager.setVolume(-1); expect(manager.volume).toBe(0);
    manager.setVolume(Number.NaN); expect(manager.volume).toBe(0);
  });

  it('keeps missing or rejected audio optional and never throws to the game', async () => {
    const { manager, clips } = media();
    await manager.toggleMute();
    const tap = clips.find(clip => clip.src.endsWith('tap.wav'))!;
    tap.play.mockRejectedValueOnce(new Error('codec unavailable'));
    expect(() => manager.play('tap')).not.toThrow();
    await Promise.resolve();
    expect(manager.unavailable).toBe(true);
    expect(clips.every(clip => clip.currentTime === 0)).toBe(true);
    manager.play('tap');
    expect(tap.play).toHaveBeenCalledTimes(1);

    const missing = media();
    await missing.manager.toggleMute();
    missing.clips[0].listeners.get('error')!();
    expect(missing.manager.unavailable).toBe(true);
    expect(() => missing.manager.play('tap')).not.toThrow();
  });

  it('notifies the UI once for real failures and ignores an interrupted stale playback rejection', async () => {
    const { manager, clips } = media();
    const unavailable = vi.fn();
    manager.onUnavailable = unavailable;
    await manager.toggleMute();
    let rejectPending!: (error: Error) => void;
    clips[0].play.mockReturnValueOnce(new Promise<void>((_resolve, reject) => { rejectPending = reject; }));
    manager.play('tap');
    manager.setPaused(true);
    rejectPending(new Error('interrupted by pause'));
    await Promise.resolve();
    expect(manager.unavailable).toBe(false);
    expect(unavailable).not.toHaveBeenCalled();
    clips[0].listeners.get('error')!();
    clips[1].listeners.get('error')!();
    expect(unavailable).toHaveBeenCalledTimes(1);
    expect(manager.unavailable).toBe(true);
  });
});
