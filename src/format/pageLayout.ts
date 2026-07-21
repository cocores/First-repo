import type { ElementType, ScriptBlock } from '../types';
import { wrapText } from '../pdf/exportPdf';
import { ATTACH_TO_NEXT_TYPES, LINES_PER_PAGE, blankLinesBefore, maxCharsForElement } from './spec';

/**
 * Groups blocks into on-screen pages using the same line budget, orphan
 * grouping, and blank-line rules as the PDF exporter's paginate(), so the
 * live editor's page breaks land in the same place the exported PDF's do.
 *
 * Two differences from the exporter, both because this is the *editing*
 * view rather than the printed one: every block is kept (including empty
 * ones — there's always a block the writer can click into), and a block is
 * never split mid-way for (MORE)/(CONT'D) — a single textarea can't
 * visually straddle two page boxes, so an oversized block just stays
 * whole on the page it starts on (the exported PDF remains exact either
 * way, since that goes through the real paginate()).
 */
export function computeScreenPages(blocks: ScriptBlock[]): ScriptBlock[][] {
  const groups: ScriptBlock[][] = [];
  for (const block of blocks) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && ATTACH_TO_NEXT_TYPES.has(lastGroup[lastGroup.length - 1].type)) {
      lastGroup.push(block);
    } else {
      groups.push([block]);
    }
  }

  const pages: ScriptBlock[][] = [[]];
  let currentLine = 0;
  let prevType: ElementType | null = null;
  let firstOnPage = true;

  for (const group of groups) {
    const lineCounts = group.map((b) => Math.max(1, wrapText(b.text, maxCharsForElement(b.type)).length));

    let needed = firstOnPage ? 0 : blankLinesBefore(prevType, group[0].type);
    for (let i = 0; i < group.length; i++) {
      if (i > 0) needed += blankLinesBefore(group[i - 1].type, group[i].type);
      needed += lineCounts[i];
    }

    if (!firstOnPage && currentLine + needed > LINES_PER_PAGE) {
      pages.push([]);
      currentLine = 0;
      firstOnPage = true;
    }

    currentLine += firstOnPage ? 0 : blankLinesBefore(prevType, group[0].type);
    for (let i = 0; i < group.length; i++) {
      if (i > 0) currentLine += blankLinesBefore(group[i - 1].type, group[i].type);
      currentLine += lineCounts[i];
      prevType = group[i].type;
    }

    pages[pages.length - 1].push(...group);
    firstOnPage = false;
  }

  return pages;
}
