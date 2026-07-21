import { useState } from 'react';
import { useScriptStore } from '../store';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, createTab, renameTab, closeTab } = useScriptStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setDraftName(currentName);
  }

  function commitRename() {
    if (renamingId && draftName.trim()) {
      renameTab(renamingId, draftName.trim());
    }
    setRenamingId(null);
  }

  function handleClose(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    closeTab(id);
  }

  return (
    <div className="tab-bar" role="tablist" aria-label="Script drafts">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            className={`tab-pill${isActive ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab(tab.id);
            }}
            onDoubleClick={() => startRename(tab.id, tab.name)}
          >
            {renamingId === tab.id ? (
              <input
                className="tab-rename-input"
                autoFocus
                value={draftName}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
              />
            ) : (
              <>
                <span className="tab-pill-name">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    className="tab-close"
                    title={`Close ${tab.name}`}
                    aria-label={`Close ${tab.name}`}
                    onClick={(e) => handleClose(e, tab.id)}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <button type="button" className="tab-add" title="New draft" aria-label="New draft" onClick={() => createTab()}>
        +
      </button>
    </div>
  );
}
