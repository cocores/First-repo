import { ELEMENT_ORDER, type ElementType } from '../types';
import { ELEMENT_LAYOUT } from './spec';

/** The element type that follows `type` when the writer presses Enter. */
const NEXT_ON_ENTER: Record<ElementType, ElementType> = {
  scene_heading: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'character',
  transition: 'scene_heading',
  shot: 'action',
};

export function nextTypeOnEnter(current: ElementType): ElementType {
  return NEXT_ON_ENTER[current];
}

export function cycleType(current: ElementType, direction: 1 | -1): ElementType {
  const idx = ELEMENT_ORDER.indexOf(current);
  const next = (idx + direction + ELEMENT_ORDER.length) % ELEMENT_ORDER.length;
  return ELEMENT_ORDER[next];
}

export function shouldUppercase(type: ElementType): boolean {
  return ELEMENT_LAYOUT[type].uppercase;
}

export function transformText(type: ElementType, text: string): string {
  return shouldUppercase(type) ? text.toUpperCase() : text;
}
