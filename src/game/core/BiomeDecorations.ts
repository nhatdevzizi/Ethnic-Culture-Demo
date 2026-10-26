import decorations from '../../content/biome-decorations.json' with { type: 'json' };
export function decorationFrame(id: string) {
  const frame = decorations.frames.find(frame => frame.id === id);
  if (!frame) throw new Error(`Unknown supplied decoration ${id}`);
  return frame;
}
