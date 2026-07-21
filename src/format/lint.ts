import type { ElementType, ScriptBlock } from '../types';

export interface LintIssue {
  id: string;
  blockId: string;
  severity: 'warning' | 'info';
  message: string;
  suggestion: string;
  /** When present, applying the fix replaces the block's text with this. */
  fixedText?: string;
}

const TIME_OF_DAY_WORDS = [
  'DAY',
  'NIGHT',
  'MORNING',
  'EVENING',
  'AFTERNOON',
  'DAWN',
  'DUSK',
  'CONTINUOUS',
  'LATER',
  'SAME TIME',
  'SUNSET',
  'SUNRISE',
];

function toSentenceCase(text: string): string {
  const lower = text.toLowerCase();
  return lower
    .replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (m) => m.toUpperCase())
    .replace(/\bi\b/g, 'I');
}

function checkSceneHeading(block: ScriptBlock): LintIssue[] {
  const text = block.text.trim();
  if (!text) return [];
  const issues: LintIssue[] = [];

  if (!/^(INT|EXT|I\/E)\b/.test(text)) {
    issues.push({
      id: `${block.id}:prefix`,
      blockId: block.id,
      severity: 'warning',
      message: 'Scene heading should start with INT. or EXT.',
      suggestion: 'Add the camera position (INT./EXT./I-E) at the start.',
      fixedText: `INT. ${text}`,
    });
  }

  const hasTimeOfDay = TIME_OF_DAY_WORDS.some((w) => text.includes(w));
  if (!hasTimeOfDay) {
    issues.push({
      id: `${block.id}:time`,
      blockId: block.id,
      severity: 'info',
      message: 'Scene heading is missing a time of day.',
      suggestion: 'Add " - DAY" (or NIGHT, CONTINUOUS, etc.) at the end.',
      fixedText: `${text} - DAY`,
    });
  }
  return issues;
}

function checkTransition(block: ScriptBlock): LintIssue[] {
  const text = block.text.trim();
  if (!text || text.endsWith(':')) return [];
  return [
    {
      id: `${block.id}:colon`,
      blockId: block.id,
      severity: 'warning',
      message: 'Transitions conventionally end with a colon.',
      suggestion: 'Add a colon, e.g. "CUT TO:".',
      fixedText: `${text}:`,
    },
  ];
}

function checkParenthetical(block: ScriptBlock): LintIssue[] {
  const text = block.text.trim();
  if (!text) return [];
  const words = text.replace(/[()]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    return [
      {
        id: `${block.id}:long`,
        blockId: block.id,
        severity: 'info',
        message: 'This parenthetical reads like a full sentence.',
        suggestion:
          'Parentheticals are usually a word or two, e.g. "(quietly)". Consider moving longer direction into action or dialogue.',
      },
    ];
  }
  return [];
}

function checkAccidentalCaps(block: ScriptBlock, label: string): LintIssue[] {
  const text = block.text.trim();
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 8) return [];
  const isAllCaps = text === text.toUpperCase() && text !== text.toLowerCase();
  if (!isAllCaps) return [];
  return [
    {
      id: `${block.id}:caps`,
      blockId: block.id,
      severity: 'warning',
      message: `This ${label} is entirely in capital letters.`,
      suggestion: 'Action and dialogue are normally mixed case — caps are usually reserved for emphasis or sound effects.',
      fixedText: toSentenceCase(text),
    },
  ];
}

function checkLongAction(block: ScriptBlock): LintIssue[] {
  const words = block.text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 70) return [];
  return [
    {
      id: `${block.id}:paragraph-length`,
      blockId: block.id,
      severity: 'info',
      message: 'This action paragraph is quite long.',
      suggestion: 'Screenplay convention favors short action blocks (3-4 lines). Consider splitting it up.',
    },
  ];
}

function checkOrphanedCharacter(block: ScriptBlock, next: ScriptBlock | undefined): LintIssue[] {
  if (!block.text.trim()) return [];
  if (next && (next.type === 'dialogue' || next.type === 'parenthetical')) return [];
  return [
    {
      id: `${block.id}:orphan`,
      blockId: block.id,
      severity: 'warning',
      message: 'This character cue has no dialogue below it.',
      suggestion: 'Add a line of dialogue, or change this to Action if it was a mistake (Ctrl/Cmd+2).',
    },
  ];
}

const LABEL_FOR: Record<ElementType, string> = {
  scene_heading: 'scene heading',
  action: 'action line',
  character: 'character cue',
  parenthetical: 'parenthetical',
  dialogue: 'dialogue',
  transition: 'transition',
  shot: 'shot',
};

export function lintDocument(blocks: ScriptBlock[]): LintIssue[] {
  const issues: LintIssue[] = [];
  blocks.forEach((block, i) => {
    switch (block.type) {
      case 'scene_heading':
        issues.push(...checkSceneHeading(block));
        break;
      case 'transition':
        issues.push(...checkTransition(block));
        break;
      case 'parenthetical':
        issues.push(...checkParenthetical(block));
        break;
      case 'action':
        issues.push(...checkAccidentalCaps(block, LABEL_FOR.action));
        issues.push(...checkLongAction(block));
        break;
      case 'dialogue':
        issues.push(...checkAccidentalCaps(block, LABEL_FOR.dialogue));
        break;
      case 'character':
        issues.push(...checkOrphanedCharacter(block, blocks[i + 1]));
        break;
      default:
        break;
    }
  });
  return issues;
}

export function groupIssuesByBlock(issues: LintIssue[]): Map<string, LintIssue[]> {
  const map = new Map<string, LintIssue[]>();
  for (const issue of issues) {
    const list = map.get(issue.blockId);
    if (list) list.push(issue);
    else map.set(issue.blockId, [issue]);
  }
  return map;
}
