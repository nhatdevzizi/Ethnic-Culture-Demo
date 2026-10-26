import { expect, it } from 'vitest';
import decorations from '../../src/content/biome-decorations.json';
import { decorationFrame } from '../../src/game/core/BiomeDecorations';
import layout from '../../src/content/scenery-layout.json';

it('keeps all supplied frames inside their atlas and resolves every biome decoration', () => {
  const ids = decorations.frames.map(frame => frame.id);
  expect(new Set(ids).size).toBe(ids.length);
  const usedAtlases = new Set<string>();
  for (const frame of decorations.frames) {
    expect(decorations.atlases.some(atlas => atlas.key === frame.atlas)).toBe(true);
    usedAtlases.add(frame.atlas);
    const [x, y, width, height] = frame.bounds;
    expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
    expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0);
    expect(x + width).toBeLessThanOrEqual(decorations.referenceWidth); expect(y + height).toBeLessThanOrEqual(decorations.referenceHeight);
    expect(frame.width).toBeGreaterThan(0); expect(frame.height).toBeGreaterThan(0);
  }
  for (const theme of ['meadow', 'wetland', 'woodland', 'highland'] as const) {
    for (const kind of ['plant', 'landmark'] as const) {
      const pool = decorations.biomes[theme][kind];
      expect(pool.length).toBeGreaterThan(0);
      for (const id of pool) {
        const frame = decorations.frames.find(frame => frame.id === id);
        expect(frame).toBeDefined(); usedAtlases.add(frame!.atlas);
      }
      expect(decorationFrame(pool[0]).id).toBe(pool[0]);
    }
  }
  expect(usedAtlases.size).toBe(decorations.atlases.length);
  for (const id of Object.values(decorations.terrain)) expect(decorations.atlases.some(atlas => atlas.key === decorationFrame(id).atlas)).toBe(true);
  for (const prop of layout.props) expect(decorationFrame(prop.frameId)).toBeDefined();
  expect(() => decorationFrame('missing')).toThrow(/Unknown/);
});
