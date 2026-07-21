import { useState } from 'react';
import { useScriptStore } from '../store';

export function ProjectSwitcher() {
  const { projects, activeProjectId, activeProjectName, createProject, renameProject, deleteProject, setActiveProject } =
    useScriptStore();
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setDraftName(currentName);
  }

  function commitRename() {
    if (renamingId && draftName.trim()) {
      renameProject(renamingId, draftName.trim());
    }
    setRenamingId(null);
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete "${name}"? This removes every draft inside it.`)) {
      deleteProject(id);
    }
  }

  return (
    <div className="project-switcher">
      <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Project: {activeProjectName}
        <span className="link-btn-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <>
          <button type="button" className="dropdown-scrim" aria-label="Close project menu" onClick={() => setOpen(false)} />
          <div className="project-menu">
            <ul className="project-menu-list">
              {projects.map((p) => (
                <li key={p.id} className={p.id === activeProjectId ? 'active' : ''}>
                  {renamingId === p.id ? (
                    <input
                      className="project-rename-input"
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="project-menu-name"
                        onClick={() => {
                          setActiveProject(p.id);
                          setOpen(false);
                        }}
                      >
                        {p.name}
                      </button>
                      <span className="project-menu-row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Rename project"
                          aria-label="Rename project"
                          onClick={() => startRename(p.id, p.name)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Delete project"
                          aria-label="Delete project"
                          onClick={() => handleDelete(p.id, p.name)}
                        >
                          ×
                        </button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="project-menu-new"
              onClick={() => {
                createProject(`Project ${projects.length + 1}`);
                setOpen(false);
              }}
            >
              + New Project
            </button>
          </div>
        </>
      )}
    </div>
  );
}
