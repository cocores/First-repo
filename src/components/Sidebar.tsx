import { useRef, useState } from 'react';
import { useScriptStore } from '../store';
import { downloadProjectFile, parseProjectFile } from '../io/projectFile';

interface RenamingState {
  kind: 'project' | 'folder';
  id: string;
}

export function Sidebar() {
  const {
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    projects,
    activeProjectId,
    createProject,
    renameProject,
    deleteProject,
    moveProject,
    setActiveProject,
    exportProject,
    importProject,
  } = useScriptStore();

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<RenamingState | null>(null);
  const [draftName, setDraftName] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExportProject(projectId: string, name: string) {
    const file = exportProject(projectId);
    if (!file) return;
    const filename = `${name.replace(/[^a-z0-9]+/gi, '_') || 'project'}.scriptwriter.json`;
    downloadProjectFile(file, filename);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseProjectFile(text);
    if (!parsed) {
      setImportNotice("That file doesn't look like a Scriptwriter project export.");
      return;
    }
    importProject(parsed);
    setImportNotice(null);
  }

  function toggleFolder(id: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startRename(kind: RenamingState['kind'], id: string, currentName: string) {
    setRenaming({ kind, id });
    setDraftName(currentName);
  }

  function commitRename() {
    if (renaming && draftName.trim()) {
      if (renaming.kind === 'project') renameProject(renaming.id, draftName.trim());
      else renameFolder(renaming.id, draftName.trim());
    }
    setRenaming(null);
  }

  function handleDeleteProject(id: string, name: string) {
    if (window.confirm(`Delete "${name}"? This removes every draft inside it.`)) {
      deleteProject(id);
    }
  }

  function handleDeleteFolder(id: string, name: string) {
    if (window.confirm(`Delete the folder "${name}"? Its projects move to the top level, not deleted.`)) {
      deleteFolder(id);
    }
  }

  function renderProjectRow(project: (typeof projects)[number]) {
    const isRenaming = renaming?.kind === 'project' && renaming.id === project.id;
    return (
      <li key={project.id} className={project.id === activeProjectId ? 'active' : ''}>
        {isRenaming ? (
          <input
            className="sidebar-rename-input"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(null);
            }}
          />
        ) : (
          <>
            <button type="button" className="sidebar-project-name" onClick={() => setActiveProject(project.id)}>
              {project.name}
            </button>
            <span className="sidebar-row-actions">
              <select
                className="sidebar-folder-select"
                title="Move to folder"
                aria-label={`Move ${project.name} to folder`}
                value={project.folderId ?? ''}
                onChange={(e) => moveProject(project.id, e.target.value || null)}
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn"
                title="Export project as a file"
                aria-label="Export project as a file"
                onClick={() => handleExportProject(project.id, project.name)}
              >
                ⬇
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Rename project"
                aria-label="Rename project"
                onClick={() => startRename('project', project.id, project.name)}
              >
                ✎
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Delete project"
                aria-label="Delete project"
                onClick={() => handleDeleteProject(project.id, project.name)}
              >
                ×
              </button>
            </span>
          </>
        )}
      </li>
    );
  }

  const unfiled = projects.filter((p) => p.folderId === null);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Projects</span>
        <button type="button" className="icon-btn" title="New folder" aria-label="New folder" onClick={() => createFolder(`Folder ${folders.length + 1}`)}>
          📁+
        </button>
      </div>
      <div className="sidebar-tree">
        {folders.map((folder) => {
          const isRenamingFolder = renaming?.kind === 'folder' && renaming.id === folder.id;
          const collapsed = collapsedFolders.has(folder.id);
          const folderProjects = projects.filter((p) => p.folderId === folder.id);
          return (
            <div key={folder.id} className="sidebar-folder">
              <div className="sidebar-folder-header">
                <button
                  type="button"
                  className="sidebar-folder-toggle"
                  onClick={() => toggleFolder(folder.id)}
                  aria-expanded={!collapsed}
                >
                  <span className="folder-caret" aria-hidden="true">
                    {collapsed ? '▸' : '▾'}
                  </span>
                  {isRenamingFolder ? null : <span className="folder-name">{folder.name}</span>}
                </button>
                {isRenamingFolder ? (
                  <input
                    className="sidebar-rename-input"
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <span className="sidebar-row-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="New project in this folder"
                      aria-label="New project in this folder"
                      onClick={() => createProject(`Project ${projects.length + 1}`, folder.id)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Rename folder"
                      aria-label="Rename folder"
                      onClick={() => startRename('folder', folder.id, folder.name)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Delete folder"
                      aria-label="Delete folder"
                      onClick={() => handleDeleteFolder(folder.id, folder.name)}
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              {!collapsed && (
                <ul className="sidebar-project-list nested">
                  {folderProjects.length === 0 ? (
                    <li className="sidebar-empty">No projects yet</li>
                  ) : (
                    folderProjects.map(renderProjectRow)
                  )}
                </ul>
              )}
            </div>
          );
        })}

        <ul className="sidebar-project-list">{unfiled.map(renderProjectRow)}</ul>
      </div>
      {importNotice && <p className="sidebar-import-notice">{importNotice}</p>}
      <div className="sidebar-footer-actions">
        <button type="button" className="sidebar-new-project" onClick={() => createProject(`Project ${projects.length + 1}`)}>
          + New Project
        </button>
        <button type="button" className="sidebar-import-project" onClick={() => importInputRef.current?.click()}>
          Import project…
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="sidebar-import-input"
          onChange={handleImportFile}
        />
      </div>
    </aside>
  );
}
