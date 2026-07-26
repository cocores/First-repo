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
- The editor is paginated, not one continuous scroll: it breaks into real
  8.5x11in pages as you type, using the exact same line budget, orphan
  protection, and page numbering as the PDF export, so what you see on
  screen is where the page actually breaks in the exported document (with
  one intentional exception — a single monologue too long to fit on one
  page stays whole on screen rather than visually splitting mid-textarea,
  and the page grows taller to fit it rather than clipping or hiding the
  overflow; the export still gives it proper "(MORE)"/"(CONT'D)"
  treatment).
- Scene headings and character names you've already used appear in a
  type-ahead dropdown as you type a matching prefix (most recently used
  first), like Final Draft/WriterDuet's auto-complete. **↑/↓** to
  highlight an entry, **Tab** or **Enter** to accept it (Enter also
  advances to the next element), click an entry to accept it directly, or
  **Esc** to dismiss the dropdown and keep typing.

## Export

"Export PDF" produces a US Letter document in the standard screenplay
specification: Courier 12pt, 1.5in left / 1in right / 1in top / 1in bottom
margins, correct per-element indents (Character 3.7in, Parenthetical
3.1in, Dialogue 2.5in, Transition flush right), and page numbers starting
on page 2 (page 1 is never numbered). Pagination keeps scene headings and
character cues from being orphaned at the bottom of a page, and a
monologue too long to fit on one page splits with "(MORE)" at the bottom
and "CHARACTER (CONT'D)" atop the continuation, exactly as Final Draft
and every other screenwriting program handle it. A simple title page
(title, author, contact info) is generated from the "Edit title page"
panel.

The document autosaves to the browser's local storage as you type.

Clicking "Export PDF" saves the file straight to your device. The one
exception is viewing the app inside an embedded, sandboxed preview (for
example a chat's inline preview panel rather than a full browser tab) —
browser sandboxing there can silently block the download outright, with
no reliable way for the app to detect or work around it. If nothing
downloads, a message points you to open the app in its own browser tab,
where the download always works normally.

## Projects, folders, and drafts

Work is organized the way WriterDuet organizes it, one level deeper: an
optional **folder** groups related **projects**, and each project holds
one or more **drafts** as tabs across the top — each draft a fully
independent screenplay (its own title page, blocks, and undo history).

- The **sidebar** on the left lists every folder and project. Click **☰**
  next to the wordmark to collapse it for more editing room, or bring it
  back the same way.
- **📁+** creates a folder; **+** inside a folder creates a project
  directly in it; **+ New Project** at the bottom creates an unfiled one.
  The small dropdown next to each project moves it into (or out of) a
  folder. Rename or delete either one from its ✎/× icons — deleting a
  folder only unfiles its projects, it never deletes them.
- The tab strip below the deskbar lists every draft in the *active*
  project. Click **+** to add a new draft, click a tab to switch to it,
  double-click to rename it, and click the **×** to close it (a project
  always keeps at least one).
- Switching folders, projects, or drafts never touches anything else's
  content — undo history, scroll position, and the currently focused line
  are all scoped to whichever draft you're looking at.
- Everything (typing, undo/redo, export, stats, the scene navigator)
  always applies to the **active draft**, exactly as it did before any of
  this organization existed.

If you already had a script saved before projects existed, it's migrated
automatically into a project called "My Project" the first time you load
the app — nothing is lost.

## Sharing a project

There's no account system or live sync — everything lives in your
browser's local storage, on your device only. To collaborate anyway, use
the sidebar's icons on each project row:

- **⬇** exports that project (every draft, its title page, and its
  comments) as a single `.json` file you can send to a collaborator —
  email, Slack, a shared drive, however you'd normally share a file.
- **Import project…** at the bottom of the sidebar loads a `.json` file
  someone sent you back in, as a new project of its own (never
  overwriting anything you already have).

It's asynchronous, not real-time multiplayer — you trade files back and
forth rather than editing simultaneously — but it needs no server and
works the moment you open the app.

## Format checking

Beyond the mechanical formatting (margins, indents, caps) the editor
already enforces as you type, **Format Issues (N)** catches the content
conventions that can't be enforced automatically:

- A scene heading missing its INT./EXT. camera position or its time of day
- A transition not ending in a colon (e.g. "CUT TO:")
- A parenthetical long enough to read like a full sentence
- Action or dialogue typed entirely in capital letters
- A character cue with no dialogue underneath it
- An action paragraph long enough that convention suggests splitting it

Any line with an issue gets a wavy underline right on the page (amber for
things worth fixing, a cooler tone for lighter suggestions) so you see it
as you write, not just in a separate list. Opening the panel shows every
issue with a plain-language suggestion; where a fix is unambiguous (adding
a missing colon, an INT./EXT., a time of day, or converting stray caps to
sentence case) an **Apply fix** button does it in one click. Click any row
to jump straight to that line.

## Comments

Leave notes for yourself or a collaborator without touching the script
text itself. Hover any line to reveal a small 💬 button (it stays visible
once a line has a comment, with a count badge); click it to read, add, or
resolve comments right there, or open **Comments (N)** in the deskbar for
a full list across the whole draft, grouped into open and resolved, with
a jump-to-line link on each one.

## Navigating and revising

- **Scenes (N)** opens a navigator listing every scene heading in order;
  click one to jump straight to it. The scene containing your cursor is
  highlighted.
- The deskbar shows a live **page count, estimated screen time, and word
  count** (one script page ≈ one minute of screen time, the standard
  industry convention) so you always know where you stand against a page
  target.
- **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** (or **Ctrl+Y**) redoes.
  Consecutive keystrokes in the same field collapse into a single undo
  step; structural edits (new lines, retyped elements) are each their own
  step. Undo/redo works regardless of what currently has focus.

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
