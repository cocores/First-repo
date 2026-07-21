import { useState } from 'react';
import { ScriptStoreProvider } from './store';
import { ScriptEditor } from './components/ScriptEditor';
import { Toolbar } from './components/Toolbar';
import { TitlePage } from './components/TitlePage';
import { exportScriptToPdf } from './pdf/exportPdf';
import { useScriptStore } from './store';
import './App.css';

function AppShell() {
  const { doc } = useScriptStore();
  const [focusedId, setFocusedId] = useState<string | null>(doc.blocks[0]?.id ?? null);
  const [exporting, setExporting] = useState(false);
  const [showTitlePage, setShowTitlePage] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const filename = `${(doc.titlePage.title || 'screenplay').replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      exportScriptToPdf(doc, filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="app">
      <div className="deskbar">
        <div className="deskbar-row">
          <div className="brand">
            <span className="brand-mark">Scriptwriter</span>
            <span className="brand-doc">{doc.titlePage.title || 'Untitled Screenplay'}</span>
          </div>
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
        <Toolbar focusedId={focusedId} onExport={handleExport} exporting={exporting} />
      </div>
      <div className={`title-page-collapse${showTitlePage ? ' open' : ''}`} inert={!showTitlePage}>
        <div className="title-page-collapse-inner">
          <TitlePage />
        </div>
      </div>
      <main className="stage">
        <div className="page">
          <ScriptEditor focusedId={focusedId} onFocusedChange={setFocusedId} />
        </div>
        <p className="hint-bar">
          <kbd>Tab</kbd> change element &nbsp; <kbd>Enter</kbd> next line &nbsp;
          <kbd>⌘/Ctrl 1–7</kbd> jump to element &nbsp; <kbd>Tab</kbd> accept suggestion
        </p>
      </main>
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
