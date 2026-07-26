import { useEffect, useMemo, useRef, useState } from 'react';
import { ScriptStoreProvider } from './store';
import { ScriptEditor, type JumpRequest } from './components/ScriptEditor';
import { Toolbar } from './components/Toolbar';
import { TitlePage } from './components/TitlePage';
import { SceneNavigator } from './components/SceneNavigator';
import { FormatIssuesPanel } from './components/FormatIssuesPanel';
import { CommentsPanel } from './components/CommentsPanel';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { exportScriptToPdf } from './pdf/exportPdf';
import { computeStats } from './format/stats';
import { lintDocument, groupIssuesByBlock } from './format/lint';
import { useScriptStore } from './store';
import type { ScriptBlock } from './types';
import './App.css';

function currentSceneId(blocks: ScriptBlock[], focusedId: string | null): string | null {
  if (!focusedId) return null;
  const idx = blocks.findIndex((b) => b.id === focusedId);
  if (idx === -1) return null;
  for (let i = idx; i >= 0; i--) {
    if (blocks[i].type === 'scene_heading' && blocks[i].text.trim()) return blocks[i].id;
  }
  return null;
}

function AppShell() {
  const { doc, undo, redo, setText, resolveComment, deleteComment, activeProjectId, activeProjectName, activeTabId } =
    useScriptStore();
  const [focusedId, setFocusedId] = useState<string | null>(doc.blocks[0]?.id ?? null);
  const [exporting, setExporting] = useState(false);
  const [showTitlePage, setShowTitlePage] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [jumpTo, setJumpTo] = useState<JumpRequest | null>(null);

  const stats = useMemo(() => computeStats(doc.blocks), [doc.blocks]);
  const activeSceneId = useMemo(() => currentSceneId(doc.blocks, focusedId), [doc.blocks, focusedId]);
  const issues = useMemo(() => lintDocument(doc.blocks), [doc.blocks]);
  const issuesByBlock = useMemo(() => groupIssuesByBlock(issues), [issues]);
  const blocksById = useMemo(() => new Map(doc.blocks.map((b) => [b.id, b])), [doc.blocks]);

  // The sticky deskbar establishes its own stacking context (position:
  // sticky + z-index), so no z-index a dropdown's click-outside-to-close
  // scrim can carry will let it cover the deskbar's own buttons without
  // ALSO out-ranking the deskbar entirely — which would then hide the
  // scene navigator's slide-out panel behind it. The real fix is for these
  // full-screen scrims to simply start below the deskbar instead of
  // overlapping it, so its buttons are never blocked in the first place.
  // The deskbar's height varies (tab bar, export notice), so it's measured
  // rather than hard-coded.
  const deskbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = deskbarRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--deskbar-height', `${entry.contentRect.height}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Block ids are scoped to a single tab's document, so a focusedId or
  // pending scene-jump left over from the previous tab is meaningless (and
  // will never match anything) once the active project or tab changes.
  useEffect(() => {
    setFocusedId(doc.blocks[0]?.id ?? null);
    setJumpTo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, activeTabId]);

  useEffect(() => {
    if (!exportNotice) return;
    const timer = setTimeout(() => setExportNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [exportNotice]);

  // Undo/redo is bound to `window`, not scoped to the editor: undoing can
  // remove the block that currently holds focus (e.g. it un-splits two
  // blocks back into one), which drops focus to <body>. A listener scoped
  // to a subtree never sees events targeting an ancestor like <body>, so
  // the very next Ctrl+Z would silently do nothing — worse, on some
  // browsers it can fall through to a native undo on an unrelated element.
  // Binding at the window level means it keeps working regardless of where
  // focus lands.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [undo, redo]);

  async function handleExport() {
    setExporting(true);
    try {
      const filename = `${(doc.titlePage.title || 'screenplay').replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      const mode = exportScriptToPdf(doc, filename);
      setExportNotice(
        mode === 'may-be-blocked'
          ? 'If no download started, this embedded preview is blocking it — open Scriptwriter in its own browser tab (not inside this preview) and export from there to save the PDF to your device.'
          : null,
      );
    } finally {
      setExporting(false);
    }
  }

  function handleJumpToBlock(id: string) {
    setJumpTo({ id, nonce: Date.now() });
  }

  return (
    <div className="app-layout">
      <div className={`sidebar-dock${showSidebar ? '' : ' collapsed'}`}>
        <Sidebar />
      </div>
      <div className="app">
        <div className="deskbar" ref={deskbarRef}>
          <div className="deskbar-row">
            <div className="brand">
              <button
                type="button"
                className="icon-btn sidebar-toggle"
                title={showSidebar ? 'Hide projects sidebar' : 'Show projects sidebar'}
                aria-label={showSidebar ? 'Hide projects sidebar' : 'Show projects sidebar'}
                aria-pressed={showSidebar}
                onClick={() => setShowSidebar((v) => !v)}
              >
                ☰
              </button>
              <span className="brand-mark">Scriptwriter</span>
              <span className="brand-project">{activeProjectName}</span>
            </div>
            <div className="deskbar-actions">
              <p className="doc-stats">
                {stats.pageCount} {stats.pageCount === 1 ? 'page' : 'pages'} · ~{stats.estimatedMinutes} min ·{' '}
                {stats.wordCount} words
              </p>
              <button
                type="button"
                className="link-btn"
                aria-expanded={showFormatPanel}
                onClick={() => {
                  setShowFormatPanel((v) => !v);
                  setShowCommentsPanel(false);
                }}
              >
                Format Issues ({issues.length})
                <span className="link-btn-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              <button
                type="button"
                className="link-btn"
                aria-expanded={showNavigator}
                onClick={() => setShowNavigator((v) => !v)}
              >
                Scenes ({stats.sceneCount})
                <span className="link-btn-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              <button
                type="button"
                className="link-btn"
                aria-expanded={showCommentsPanel}
                onClick={() => {
                  setShowCommentsPanel((v) => !v);
                  setShowFormatPanel(false);
                }}
              >
                Comments ({doc.comments.filter((c) => !c.resolved).length})
                <span className="link-btn-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              <button
                type="button"
                className="link-btn"
                aria-expanded={showTitlePage}
                onClick={() => setShowTitlePage((v) => !v)}
              >
                {showTitlePage ? 'Hide title page' : 'Edit title page'}
                <span className="link-btn-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
            </div>
          </div>
          <TabBar />
          <Toolbar focusedId={focusedId} onExport={handleExport} exporting={exporting} />
          {exportNotice && (
            <p className="export-notice" role="status">
              {exportNotice}
            </p>
          )}
        </div>
        <div className={`title-page-collapse${showTitlePage ? ' open' : ''}`} inert={!showTitlePage}>
          <div className="title-page-collapse-inner">
            <TitlePage />
          </div>
        </div>
        <SceneNavigator
          isOpen={showNavigator}
          blocks={doc.blocks}
          currentSceneId={activeSceneId}
          onJump={(id) => {
            handleJumpToBlock(id);
            setShowNavigator(false);
          }}
        />
        {showNavigator && (
          <button
            type="button"
            className="scene-nav-scrim"
            aria-label="Close scene navigator"
            onClick={() => setShowNavigator(false)}
          />
        )}
        <FormatIssuesPanel
          isOpen={showFormatPanel}
          issues={issues}
          blocksById={blocksById}
          onJump={(id) => {
            handleJumpToBlock(id);
            setShowFormatPanel(false);
          }}
          onApplyFix={(id, fixedText) => setText(id, fixedText)}
        />
        {showFormatPanel && (
          <button
            type="button"
            className="format-panel-scrim"
            aria-label="Close format suggestions"
            onClick={() => setShowFormatPanel(false)}
          />
        )}
        <CommentsPanel
          isOpen={showCommentsPanel}
          comments={doc.comments}
          blocksById={blocksById}
          onJump={(id) => {
            handleJumpToBlock(id);
            setShowCommentsPanel(false);
          }}
          onResolve={resolveComment}
          onDelete={deleteComment}
        />
        {showCommentsPanel && (
          <button
            type="button"
            className="format-panel-scrim"
            aria-label="Close comments"
            onClick={() => setShowCommentsPanel(false)}
          />
        )}
        <main className="stage">
          <ScriptEditor
            key={activeTabId}
            focusedId={focusedId}
            onFocusedChange={setFocusedId}
            jumpTo={jumpTo}
            issuesByBlock={issuesByBlock}
          />
          <p className="hint-bar">
            <kbd>Tab</kbd> change element &nbsp; <kbd>Enter</kbd> next line &nbsp;
            <kbd>⌘/Ctrl 1–7</kbd> jump to element &nbsp; <kbd>⌘/Ctrl Z</kbd> undo
          </p>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ScriptStoreProvider>
      <AppShell />
    </ScriptStoreProvider>
  );
}

export default App;
