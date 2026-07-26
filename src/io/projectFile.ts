import type { ExportedProjectFile } from '../types';
import { isEmbeddedInIframe } from '../utils/iframe';

export type DownloadMode = 'downloaded' | 'may-be-blocked';

export function downloadProjectFile(file: ExportedProjectFile, filename: string): DownloadMode {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return isEmbeddedInIframe() ? 'may-be-blocked' : 'downloaded';
}

function isScriptBlock(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return typeof b.id === 'string' && typeof b.type === 'string' && typeof b.text === 'string';
}

function isTitlePage(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return typeof t.title === 'string' && typeof t.author === 'string' && typeof t.contact === 'string';
}

// Comments are optional in an imported file (older exports won't have them);
// this only checks the shape of whatever comments array is present.
function hasValidComments(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  return value.every((c) => {
    if (typeof c !== 'object' || c === null) return false;
    const comment = c as Record<string, unknown>;
    return typeof comment.id === 'string' && typeof comment.blockId === 'string' && typeof comment.text === 'string';
  });
}

export function parseProjectFile(jsonText: string): ExportedProjectFile | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const file = parsed as Record<string, unknown>;
  if (typeof file.name !== 'string' || !Array.isArray(file.tabs) || file.tabs.length === 0) return null;

  for (const tab of file.tabs) {
    if (typeof tab !== 'object' || tab === null) return null;
    const t = tab as Record<string, unknown>;
    if (typeof t.name !== 'string') return null;
    if (!isTitlePage(t.titlePage)) return null;
    if (!Array.isArray(t.blocks) || !t.blocks.every(isScriptBlock)) return null;
    if (!hasValidComments(t.comments)) return null;
  }

  return parsed as ExportedProjectFile;
}
