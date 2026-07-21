import { jsPDF } from 'jspdf';
import type { ElementType, ScriptBlock, ScriptDocument } from '../types';
import {
  ATTACH_TO_NEXT_TYPES,
  CONTENT_RIGHT_EDGE_IN,
  ELEMENT_LAYOUT,
  LINES_PER_INCH,
  LINES_PER_PAGE,
  MARGIN_LEFT_IN,
  MARGIN_TOP_IN,
  PAGE_HEIGHT_IN,
  PAGE_WIDTH_IN,
  blankLinesBefore,
  maxCharsForElement,
} from '../format/spec';

const FONT_SIZE = 12;
const LINE_HEIGHT_IN = 1 / LINES_PER_INCH;
const BASELINE_OFFSET_IN = 0.11;

interface RenderLine {
  text: string;
  leftIn: number;
  align: 'left' | 'right';
}

interface RenderedBlock {
  type: ElementType;
  lines: RenderLine[];
}

export function wrapText(text: string, maxChars: number): string[] {
  const paragraphs = text.split('\n');
  const out: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      let w = word;
      while (w.length > maxChars) {
        // Hard-break a word too long to ever fit on its own line.
        const room = maxChars - line.length - (line ? 1 : 0);
        if (room > 1) {
          line = line ? `${line} ${w.slice(0, room)}` : w.slice(0, room);
          w = w.slice(room);
        }
        out.push(line);
        line = '';
      }
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length > maxChars) {
        out.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function renderBlock(block: ScriptBlock): RenderedBlock {
  const layout = ELEMENT_LAYOUT[block.type];
  const maxChars = maxCharsForElement(block.type);
  const wrapped = wrapText(block.text, maxChars);
  const lines: RenderLine[] = wrapped.map((text) => ({
    text,
    leftIn: layout.align === 'right' ? CONTENT_RIGHT_EDGE_IN : layout.leftIn,
    align: layout.align ?? 'left',
  }));
  return { type: block.type, lines };
}

export interface PlacedLine extends RenderLine {
  lineIndex: number;
}

export interface Page {
  lines: PlacedLine[];
}

export function paginate(blocks: ScriptBlock[]): Page[] {
  const nonEmpty = blocks.filter((b) => b.text.trim().length > 0);

  // Group blocks that must stay on the same page as whatever follows them.
  const groups: ScriptBlock[][] = [];
  for (const block of nonEmpty) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && ATTACH_TO_NEXT_TYPES.has(lastGroup[lastGroup.length - 1].type)) {
      lastGroup.push(block);
    } else {
      groups.push([block]);
    }
  }

  const pages: Page[] = [{ lines: [] }];
  let currentLine = 0;
  let prevType: ElementType | null = null;
  let firstOnPage = true;
  // The most recent CHARACTER cue's name, so a dialogue block split across a
  // page break can print "NAME (CONT'D)" atop the continuation — the same
  // convention every screenwriting program uses for a monologue too long to
  // fit on one page.
  let currentCharacterName = '';

  function currentPage(): Page {
    return pages[pages.length - 1];
  }

  function startNewPage() {
    pages.push({ lines: [] });
    currentLine = 0;
    firstOnPage = true;
  }

  for (const group of groups) {
    const rendered = group.map(renderBlock);

    // Compute total line count this group needs, including inter-block gaps.
    let needed = firstOnPage ? 0 : blankLinesBefore(prevType, group[0].type);
    for (let i = 0; i < rendered.length; i++) {
      if (i > 0) needed += blankLinesBefore(group[i - 1].type, group[i].type);
      needed += Math.max(1, rendered[i].lines.length);
    }

    if (!firstOnPage && currentLine + needed > LINES_PER_PAGE) {
      startNewPage();
    }

    currentLine += firstOnPage ? 0 : blankLinesBefore(prevType, group[0].type);

    for (let i = 0; i < rendered.length; i++) {
      if (i > 0) {
        currentLine += blankLinesBefore(group[i - 1].type, group[i].type);
      }

      if (group[i].type === 'character') {
        currentCharacterName = group[i].text.trim().toUpperCase();
      }

      if (rendered[i].type === 'dialogue') {
        // Dialogue is the one element allowed to split mid-block, and only
        // it gets the (MORE) / "NAME (CONT'D)" treatment when it does.
        let remainingLines = rendered[i].lines;
        while (remainingLines.length > 0) {
          const roomLeft = LINES_PER_PAGE - currentLine;
          if (remainingLines.length <= roomLeft) {
            for (const line of remainingLines) {
              currentPage().lines.push({ ...line, lineIndex: currentLine });
              currentLine += 1;
            }
            remainingLines = [];
          } else {
            const fitCount = Math.max(0, roomLeft - 1); // reserve a line for "(MORE)"
            for (const line of remainingLines.slice(0, fitCount)) {
              currentPage().lines.push({ ...line, lineIndex: currentLine });
              currentLine += 1;
            }
            currentPage().lines.push({
              text: '(MORE)',
              leftIn: ELEMENT_LAYOUT.parenthetical.leftIn,
              align: 'left',
              lineIndex: currentLine,
            });
            currentLine += 1;
            remainingLines = remainingLines.slice(fitCount);
            startNewPage();
            if (currentCharacterName) {
              currentPage().lines.push({
                text: `${currentCharacterName} (CONT'D)`,
                leftIn: ELEMENT_LAYOUT.character.leftIn,
                align: 'left',
                lineIndex: currentLine,
              });
              currentLine += 1;
            }
          }
        }
      } else {
        // Every other element is free to spill onto a fresh page with no
        // marker — only dialogue is ever attributed to a specific speaker.
        for (const line of rendered[i].lines) {
          if (currentLine >= LINES_PER_PAGE) startNewPage();
          currentPage().lines.push({ ...line, lineIndex: currentLine });
          currentLine += 1;
        }
      }

      prevType = rendered[i].type;
    }
    firstOnPage = false;
  }

  return pages;
}

// Sandboxed iframes (e.g. an embedded preview) can render the app fine but
// silently block the anchor-click download jsPDF's save() relies on, unless
// the embedder opts in with the `allow-downloads` sandbox flag. Opening the
// PDF in a new tab instead only needs popup permission, which such embeds
// more commonly allow — but since some sandboxes restrict both, the
// caller uses the returned mode to warn the writer rather than assume it
// worked.
function isEmbeddedInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export type ExportMode = 'downloaded' | 'opened-in-tab';

export function exportScriptToPdf(doc: ScriptDocument, filename = 'screenplay.pdf'): ExportMode {
  const pdf = new jsPDF({ unit: 'in', format: 'letter' });
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(FONT_SIZE);

  // --- Title page ---
  const { title, author, contact } = doc.titlePage;
  pdf.setFont('courier', 'bold');
  const titleLines = pdf.splitTextToSize(title.toUpperCase() || 'UNTITLED', 5);
  let y = 3.5;
  for (const line of titleLines) {
    pdf.text(line, PAGE_WIDTH_IN / 2, y, { align: 'center' });
    y += LINE_HEIGHT_IN * 1.5;
  }
  pdf.setFont('courier', 'normal');
  y += LINE_HEIGHT_IN;
  pdf.text('by', PAGE_WIDTH_IN / 2, y, { align: 'center' });
  y += LINE_HEIGHT_IN * 1.5;
  pdf.text(author || 'Unknown', PAGE_WIDTH_IN / 2, y, { align: 'center' });

  if (contact.trim()) {
    const contactLines = contact.split('\n');
    let cy = PAGE_HEIGHT_IN - MARGIN_TOP_IN - LINE_HEIGHT_IN * (contactLines.length - 1);
    for (const line of contactLines) {
      pdf.text(line, MARGIN_LEFT_IN, cy);
      cy += LINE_HEIGHT_IN;
    }
  }

  // --- Script pages ---
  const pages = paginate(doc.blocks);
  for (let p = 0; p < pages.length; p++) {
    pdf.addPage();
    if (p > 0) {
      pdf.text(`${p + 1}.`, CONTENT_RIGHT_EDGE_IN, 0.5, { align: 'right' });
    }
    for (const line of pages[p].lines) {
      if (!line.text) continue;
      const yPos = MARGIN_TOP_IN + line.lineIndex * LINE_HEIGHT_IN + BASELINE_OFFSET_IN;
      pdf.text(line.text, line.leftIn, yPos, { align: line.align });
    }
  }

  if (isEmbeddedInIframe()) {
    const opened = window.open(pdf.output('bloburl').toString(), '_blank');
    if (opened) return 'opened-in-tab';
    pdf.save(filename);
    return 'downloaded';
  }
  pdf.save(filename);
  return 'downloaded';
}
