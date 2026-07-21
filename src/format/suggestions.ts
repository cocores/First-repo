import type { ElementType, ScriptBlock } from '../types';

// Only element types where writers repeat the same handful of values over
// and over benefit from predictive completion.
const SUGGESTIBLE_TYPES = new Set<ElementType>(['character', 'scene_heading']);

const MAX_SUGGESTIONS = 6;

/**
 * Finds every previously used value of `type` (excluding `currentBlockId`)
 * that starts with `currentText`, most recently used first, for the
 * type-ahead dropdown. Returns [] when the type isn't suggestible, the
 * field is empty, or nothing matches.
 */
export function getSuggestions(
  blocks: ScriptBlock[],
  currentBlockId: string,
  type: ElementType,
  currentText: string,
): string[] {
  const needle = currentText.trim();
  if (!needle || !SUGGESTIBLE_TYPES.has(type)) return [];

  const needleUpper = needle.toUpperCase();
  const seen = new Set<string>();
  const results: string[] = [];

  for (let i = blocks.length - 1; i >= 0 && results.length < MAX_SUGGESTIONS; i--) {
    const block = blocks[i];
    if (block.id === currentBlockId || block.type !== type) continue;
    const candidate = block.text.trim();
    if (!candidate) continue;
    const candidateUpper = candidate.toUpperCase();
    if (seen.has(candidateUpper)) continue;
    seen.add(candidateUpper);
    if (candidateUpper !== needleUpper && candidateUpper.startsWith(needleUpper)) {
      results.push(candidate);
    }
  }
  return results;
}
