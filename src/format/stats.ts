import type { ScriptBlock } from '../types';
import { paginate } from '../pdf/exportPdf';

export interface ScriptStats {
  pageCount: number;
  sceneCount: number;
  wordCount: number;
  estimatedMinutes: number;
}

export function computeStats(blocks: ScriptBlock[]): ScriptStats {
  const sceneCount = blocks.filter((b) => b.type === 'scene_heading' && b.text.trim().length > 0).length;
  const wordCount = blocks.reduce((total, b) => {
    const words = b.text.trim().split(/\s+/).filter(Boolean);
    return total + words.length;
  }, 0);
  const pageCount = paginate(blocks).length;
  // Screen time convention: one script page is roughly one minute of screen time.
  const estimatedMinutes = pageCount;

  return { pageCount, sceneCount, wordCount, estimatedMinutes };
}
