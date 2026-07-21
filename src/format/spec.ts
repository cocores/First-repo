import type { ElementType } from '../types';

// Industry-standard screenplay format: US Letter, Courier 12pt.
// Courier 12pt is a fixed 10 characters-per-inch, 6 lines-per-inch font.
export const PAGE_WIDTH_IN = 8.5;
export const PAGE_HEIGHT_IN = 11;
export const MARGIN_TOP_IN = 1;
export const MARGIN_BOTTOM_IN = 1;
export const MARGIN_LEFT_IN = 1.5;
export const MARGIN_RIGHT_IN = 1;

export const CHARS_PER_INCH = 10;
export const LINES_PER_INCH = 6;

export const CONTENT_RIGHT_EDGE_IN = PAGE_WIDTH_IN - MARGIN_RIGHT_IN; // 7.5in from left edge
export const USABLE_HEIGHT_IN = PAGE_HEIGHT_IN - MARGIN_TOP_IN - MARGIN_BOTTOM_IN;
export const LINES_PER_PAGE = Math.floor(USABLE_HEIGHT_IN * LINES_PER_INCH); // 54

interface ElementLayout {
  /** Left edge of the text block, measured in inches from the left edge of the page. */
  leftIn: number;
  /** Right edge of the text block, measured in inches from the left edge of the page. */
  rightIn: number;
  uppercase: boolean;
  align?: 'left' | 'right';
}

export const ELEMENT_LAYOUT: Record<ElementType, ElementLayout> = {
  scene_heading: { leftIn: 1.5, rightIn: 7.5, uppercase: true },
  action: { leftIn: 1.5, rightIn: 7.5, uppercase: false },
  character: { leftIn: 3.7, rightIn: 7.5, uppercase: true },
  parenthetical: { leftIn: 3.1, rightIn: 5.1, uppercase: false },
  dialogue: { leftIn: 2.5, rightIn: 6.0, uppercase: false },
  transition: { leftIn: 4.0, rightIn: 7.5, uppercase: true, align: 'right' },
  shot: { leftIn: 1.5, rightIn: 7.5, uppercase: true },
};

export function maxCharsForElement(type: ElementType): number {
  const layout = ELEMENT_LAYOUT[type];
  return Math.max(1, Math.floor((layout.rightIn - layout.leftIn) * CHARS_PER_INCH));
}

const NO_BLANK_LINE_TRANSITIONS = new Set<string>([
  'character->parenthetical',
  'character->dialogue',
  'parenthetical->dialogue',
  'dialogue->parenthetical',
]);

/** How many blank lines should precede `curr` given the previous element type (null = start of doc). */
export function blankLinesBefore(prev: ElementType | null, curr: ElementType): number {
  if (prev === null) return 0;
  const key = `${prev}->${curr}`;
  return NO_BLANK_LINE_TRANSITIONS.has(key) ? 0 : 1;
}
