import type { Position } from '../core/types';
export type Interactable = Position & { id: string; label: string; activate: () => void };
export function nearestInteraction(player: Position, objects: Interactable[], range = 78) {
  let nearest: Interactable | undefined;
  let distance = range;
  for (const object of objects) {
    const next = Math.hypot(object.x - player.x, object.y - player.y);
    if (next < distance) { nearest = object; distance = next; }
  }
  return nearest;
}
