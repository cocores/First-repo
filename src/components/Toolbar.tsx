import { ELEMENT_ORDER, ELEMENT_LABELS, type ElementType } from '../types';
import { useScriptStore } from '../store';
import { transformText } from '../format/elements';

interface ToolbarProps {
  focusedId: string | null;
  onExport: () => void;
  exporting: boolean;
}

const SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7'];

export function Toolbar({ focusedId, onExport, exporting }: ToolbarProps) {
  const { doc, setType, setText, undo, redo, canUndo, canRedo } = useScriptStore();
  const focusedBlock = doc.blocks.find((b) => b.id === focusedId) ?? null;

  function selectType(type: ElementType) {
    if (!focusedBlock) return;
    setType(focusedBlock.id, type);
    setText(focusedBlock.id, transformText(type, focusedBlock.text));
  }

  return (
    <div className="toolbar">
      <div className="element-switch" role="group" aria-label="Element type">
        {ELEMENT_ORDER.map((type, i) => (
          <button
            key={type}
            type="button"
            className={focusedBlock?.type === type ? 'active' : ''}
            onClick={() => selectType(type)}
            disabled={!focusedBlock}
            title={`${ELEMENT_LABELS[type]} (Ctrl/Cmd+${SHORTCUT_KEYS[i]})`}
          >
            <span className="key-badge">{SHORTCUT_KEYS[i]}</span>
            {ELEMENT_LABELS[type]}
          </button>
        ))}
      </div>
      <div className="toolbar-actions">
        <div className="history-controls" role="group" aria-label="Undo / redo">
          <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo">
            ↺
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            aria-label="Redo"
          >
            ↻
          </button>
        </div>
        <button type="button" className="export-btn" onClick={onExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}
