# Scriptwriter

A single-user screenwriting editor, in the spirit of WriterDuet/Final Draft: it
auto-formats scene headings, action, character cues, parentheticals, dialogue,
transitions, and shots as you type, and exports to a properly formatted
industry-standard screenplay PDF.

## Formatting

- **Tab** cycles the current line's element type forward (Scene Heading →
  Action → Character → Parenthetical → Dialogue → Transition → Shot →
  Scene Heading); **Shift+Tab** cycles backward.
- **Enter** advances to the logical next element (e.g. Character → Dialogue,
  Dialogue → Character, Scene Heading → Action).
- **Ctrl/Cmd+1..7** jumps the current line directly to a specific element
  type, matching the toolbar button order.
- Scene headings, character cues, transitions, and shots auto-uppercase as
  you type.
- The page on screen mirrors the exported PDF's margins and indents.
- Scene headings and character names you've already used appear in a
  type-ahead dropdown as you type a matching prefix (most recently used
  first), like Final Draft/WriterDuet's auto-complete. **↑/↓** to
  highlight an entry, **Tab** or **Enter** to accept it (Enter also
  advances to the next element), click an entry to accept it directly, or
  **Esc** to dismiss the dropdown and keep typing.

## Export

"Export PDF" produces a US Letter document in the standard screenplay
specification: Courier 12pt, 1.5in left / 1in right / 1in top / 1in bottom
margins, correct per-element indents, page numbers, and pagination that
keeps scene headings and character cues from being orphaned at the bottom
of a page. A simple title page (title, author, contact info) is generated
from the "Edit title page" panel.

The document autosaves to the browser's local storage as you type.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint      # oxlint
```

## Scope

This is a single-user editor — there's no real-time multi-user collaboration
(WriterDuet's headline feature) or accounts/backend. Everything runs and
persists client-side.
