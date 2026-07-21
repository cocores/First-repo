import type { ElementType, ScriptBlock } from '../types';

// Only element types where writers repeat the same handful of values over
// and over benefit from predictive completion.
const SUGGESTIBLE_TYPES = new Set<ElementType>(['character', 'scene_heading']);

/**
 * Finds the most recently used value of `type` (excluding `currentBlockId`)
 * that starts with `currentText`, for inline auto-complete. Returns null
 * when the type isn't suggestible, the field is empty, or nothing matches.
 */
export function getSuggestion(
  blocks: ScriptBlock[],
  currentBlockId: string,
  type: ElementType,
  currentText: string,
): string | null {
  const needle = currentText.trim();
  if (!needle || !SUGGESTIBLE_TYPES.has(type)) return null;

  const needleUpper = needle.toUpperCase();
  const seen = new Set<string>();

  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block.id === currentBlockId || block.type !== type) continue;
    const candidate = block.text.trim();
    if (!candidate) continue;
    const candidateUpper = candidate.toUpperCase();
    if (seen.has(candidateUpper)) continue;
    seen.add(candidateUpper);
    if (candidateUpper !== needleUpper && candidateUpper.startsWith(needleUpper)) {
      return candidate;
    }
  }
  return null;
}
