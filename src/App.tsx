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
      <header className="app-header">
        <h1>Scriptwriter</h1>
        <button type="button" className="link-btn" onClick={() => setShowTitlePage((v) => !v)}>
          {showTitlePage ? 'Hide title page' : 'Edit title page'}
        </button>
      </header>
      <Toolbar focusedId={focusedId} onExport={handleExport} exporting={exporting} />
      {showTitlePage && <TitlePage />}
      <main className="page">
        <ScriptEditor focusedId={focusedId} onFocusedChange={setFocusedId} />
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
