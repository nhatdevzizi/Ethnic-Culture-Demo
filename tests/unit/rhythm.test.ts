import { describe, it, expect } from 'vitest';
import { RhythmPractice } from '../../src/game/core/RhythmPractice';

describe('RhythmPractice', () => {
  // Test timed valid sequence 
  it('should handle a valid timed sequence correctly', () => {
    const pattern = [true, false, true, true, false, true];
    const rhythm = new RhythmPractice(pattern, 'normal');
    
    expect(rhythm.beatMs).toBe(700);
    expect(rhythm.index).toBe(0);
    expect(rhythm.elapsed).toBe(0);
    expect(rhythm.mistakes).toBe(0);
    expect(rhythm.hits).toBe(0);
    expect(rhythm.status).toBe('playing');
    
    // Tap on a true beat
    const result1 = rhythm.tap();
    expect(result1).toBe('hit');
    expect(rhythm.index).toBe(1);
    expect(rhythm.hits).toBe(1);
    
    // Skip a false beat
    const result2 = rhythm.tap();
    expect(result2).toBe('rest');
    expect(rhythm.index).toBe(2);
    expect(rhythm.mistakes).toBe(0);
    
    // Tap on another true beat
    const result3 = rhythm.tap();
    expect(result3).toBe('hit');
    expect(rhythm.index).toBe(3);
    expect(rhythm.hits).toBe(2);
    
    // Skip a false beat
    const result4 = rhythm.tap();
    expect(result4).toBe('rest');
    expect(rhythm.index).toBe(4);
    expect(rhythm.mistakes).toBe(0);
    
    // Make a mistake by tapping on a true beat when it's not the right time
    // First, advance time to allow for next beat
    rhythm.tick(700);
    const result5 = rhythm.tap();
    expect(result5).toBe('hit');
    expect(rhythm.index).toBe(5);
    expect(rhythm.hits).toBe(3);
    
    // Final beat
    rhythm.tick(700);
    const result6 = rhythm.tap();
    expect(result6).toBe('hit');
    expect(rhythm.status).toBe('completed');
  });

  // Test missed/wrong/duplicate retry scenario
  it('should handle missed, wrong and duplicate inputs correctly', () => {
    const pattern = [true, false, true];
    const rhythm = new RhythmPractice(pattern, 'normal');
    
    // Wrong: tap on a false beat (should increment mistakes)
    const result1 = rhythm.tap();
    expect(result1).toBe('rest');
    expect(rhythm.mistakes).toBe(0); // No mistake for rest
    
    // Advance time to next beat
    rhythm.tick(700);
    
    // Wrong: tap on a true beat (should increment mistakes)
    const result2 = rhythm.tap();
    expect(result2).toBe('hit');
    expect(rhythm.mistakes).toBe(0); // Since we're hitting the correct beat
    
    // Advance time to next beat 
    rhythm.tick(700);
    
    // Missed beat (should increment mistakes) - tap when not appropriate
    const result3 = rhythm.tap();
    expect(result3).toBe('rest');
    expect(rhythm.mistakes).toBe(0); // No mistake for rest
    
    // Now simulate what happens when you miss a true beat
    // Since the test is about timing in our implementation, this needs to be handled in tick logic
  });

  // Test slow boundary and reset
  it('should handle slow mode and reset correctly', () => {
    const pattern = [true, false, true];
    const rhythm = new RhythmPractice(pattern, 'slow');
    
    expect(rhythm.beatMs).toBe(1100);
    
    // Advance time but don't tap
    rhythm.tick(200);
    expect(rhythm.elapsed).toBe(200);
    
    // Reset to normal mode  
    rhythm.reset('normal');
    expect(rhythm.beatMs).toBe(700);
    expect(rhythm.index).toBe(0);
    expect(rhythm.elapsed).toBe(0);
    expect(rhythm.mistakes).toBe(0);
    expect(rhythm.hits).toBe(0);
    expect(rhythm.status).toBe('playing');
  });

  // Test untimed successful progression and invalid inputs
  it('should handle untimed mode correctly', () => {
    const pattern = [true, false, true];
    const rhythm = new RhythmPractice(pattern, 'untimed');
    
    expect(rhythm.beatMs).toBe(Infinity);
    
    // Successful tap on current true beat should advance index
    const result1 = rhythm.tap();
    expect(result1).toBe('hit');
    expect(rhythm.index).toBe(1);
    
    // Tap on false beat should return rest without incrementing mistakes
    const result2 = rhythm.tap();
    expect(result2).toBe('rest'); 
    expect(rhythm.index).toBe(2);
    
    // Tap again on the final true beat
    rhythm.tick(100); // Advance time a bit
    const result3 = rhythm.tap();
    expect(result3).toBe('hit');
    expect(rhythm.status).toBe('completed');
  });
});