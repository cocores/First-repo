import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ElementType, ScriptBlock, ScriptDocument, TitlePageInfo } from './types';

const STORAGE_KEY = 'scriptwriter.projects.v1';
const LEGACY_STORAGE_KEY = 'scriptwriter.document.v1';
const MAX_HISTORY = 100;
// Consecutive keystrokes in the same field within this window collapse into
// one undo step, so undo doesn't require replaying every character typed.
const COALESCE_MS = 700;

function newId(): string {
  return crypto.randomUUID();
}

function newBlock(type: ElementType, text = ''): ScriptBlock {
  return { id: newId(), type, text };
}

function defaultScriptDocument(): ScriptDocument {
  return {
    titlePage: { title: 'Untitled Screenplay', author: '', contact: '' },
    blocks: [newBlock('scene_heading', '')],
  };
}

// --- Per-document editing (unchanged from the single-document version) ---

type DocAction =
  | { type: 'SET_TEXT'; id: string; text: string; time: number }
  | { type: 'SET_TYPE'; id: string; elementType: ElementType }
  | { type: 'SPLIT_BLOCK'; id: string; caretPos: number; newType: ElementType; newId: string }
  | { type: 'MERGE_WITH_PREVIOUS'; id: string }
  | { type: 'SET_TITLE_PAGE'; field: keyof TitlePageInfo; value: string };

function docReducer(doc: ScriptDocument, action: DocAction): ScriptDocument {
  switch (action.type) {
    case 'SET_TEXT': {
      return {
        ...doc,
        blocks: doc.blocks.map((b) => (b.id === action.id ? { ...b, text: action.text } : b)),
      };
    }
    case 'SET_TYPE': {
      return {
        ...doc,
        blocks: doc.blocks.map((b) => (b.id === action.id ? { ...b, type: action.elementType } : b)),
      };
    }
    case 'SPLIT_BLOCK': {
      const idx = doc.blocks.findIndex((b) => b.id === action.id);
      if (idx === -1) return doc;
      const block = doc.blocks[idx];
      const before = block.text.slice(0, action.caretPos);
      const after = block.text.slice(action.caretPos);
      const updated: ScriptBlock = { ...block, text: before };
      const created: ScriptBlock = { id: action.newId, type: action.newType, text: after };
      const blocks = [...doc.blocks];
      blocks.splice(idx, 1, updated, created);
      return { ...doc, blocks };
    }
    case 'MERGE_WITH_PREVIOUS': {
      const idx = doc.blocks.findIndex((b) => b.id === action.id);
      if (idx <= 0) return doc;
      const prev = doc.blocks[idx - 1];
      const curr = doc.blocks[idx];
      const merged: ScriptBlock = { ...prev, text: prev.text + curr.text };
      const blocks = [...doc.blocks];
      blocks.splice(idx - 1, 2, merged);
      return { ...doc, blocks };
    }
    case 'SET_TITLE_PAGE': {
      return { ...doc, titlePage: { ...doc.titlePage, [action.field]: action.value } };
    }
    default:
      return doc;
  }
}

// --- A tab is one screenplay document plus its own undo history ---

interface Tab {
  id: string;
  name: string;
  past: ScriptDocument[];
  present: ScriptDocument;
  future: ScriptDocument[];
  lastCoalesceKey: string | null;
  lastCoalesceTime: number;
}

function newTab(name: string, document?: ScriptDocument): Tab {
  return {
    id: newId(),
    name,
    past: [],
    present: document ?? defaultScriptDocument(),
    future: [],
    lastCoalesceKey: null,
    lastCoalesceTime: 0,
  };
}

function tabReducer(tab: Tab, action: DocAction | { type: 'UNDO' } | { type: 'REDO' }): Tab {
  if (action.type === 'UNDO') {
    if (tab.past.length === 0) return tab;
    const previous = tab.past[tab.past.length - 1];
    return {
      ...tab,
      past: tab.past.slice(0, -1),
      present: previous,
      future: [tab.present, ...tab.future],
      lastCoalesceKey: null,
      lastCoalesceTime: 0,
    };
  }
  if (action.type === 'REDO') {
    if (tab.future.length === 0) return tab;
    const [next, ...rest] = tab.future;
    return {
      ...tab,
      past: [...tab.past, tab.present].slice(-MAX_HISTORY),
      present: next,
      future: rest,
      lastCoalesceKey: null,
      lastCoalesceTime: 0,
    };
  }

  const nextPresent = docReducer(tab.present, action);
  if (nextPresent === tab.present) return tab;

  const time = action.type === 'SET_TEXT' ? action.time : tab.lastCoalesceTime;
  const coalesceKey = action.type === 'SET_TEXT' ? `SET_TEXT:${action.id}` : null;
  const shouldCoalesce =
    coalesceKey !== null && coalesceKey === tab.lastCoalesceKey && time - tab.lastCoalesceTime < COALESCE_MS;

  return {
    ...tab,
    past: shouldCoalesce ? tab.past : [...tab.past, tab.present].slice(-MAX_HISTORY),
    present: nextPresent,
    future: [],
    lastCoalesceKey: coalesceKey,
    lastCoalesceTime: time,
  };
}

// --- A project holds tabs; an optional folder groups several projects ---

interface Project {
  id: string;
  name: string;
  folderId: string | null;
  tabs: Tab[];
  activeTabId: string;
}

function newProject(name: string, folderId: string | null = null, tabs?: Tab[]): Project {
  const projectTabs = tabs && tabs.length > 0 ? tabs : [newTab('Draft 1')];
  return { id: newId(), name, folderId, tabs: projectTabs, activeTabId: projectTabs[0].id };
}

interface Folder {
  id: string;
  name: string;
}

function newFolder(name: string): Folder {
  return { id: newId(), name };
}

interface AppState {
  folders: Folder[];
  projects: Project[];
  activeProjectId: string;
}

type ManagementAction =
  | { type: 'CREATE_PROJECT'; name: string; folderId?: string | null }
  | { type: 'RENAME_PROJECT'; projectId: string; name: string }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'MOVE_PROJECT'; projectId: string; folderId: string | null }
  | { type: 'SET_ACTIVE_PROJECT'; projectId: string }
  | { type: 'CREATE_FOLDER'; name: string }
  | { type: 'RENAME_FOLDER'; folderId: string; name: string }
  | { type: 'DELETE_FOLDER'; folderId: string }
  | { type: 'CREATE_TAB'; name: string }
  | { type: 'RENAME_TAB'; tabId: string; name: string }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string };

type AppAction = ManagementAction | DocAction | { type: 'UNDO' } | { type: 'REDO' };

function updateActiveProject(state: AppState, fn: (project: Project) => Project): AppState {
  return {
    ...state,
    projects: state.projects.map((p) => (p.id === state.activeProjectId ? fn(p) : p)),
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CREATE_PROJECT': {
      const project = newProject(action.name, action.folderId ?? null);
      return { ...state, projects: [...state.projects, project], activeProjectId: project.id };
    }
    case 'RENAME_PROJECT': {
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, name: action.name } : p)),
      };
    }
    case 'DELETE_PROJECT': {
      const remaining = state.projects.filter((p) => p.id !== action.projectId);
      const projects = remaining.length > 0 ? remaining : [newProject('Untitled Project')];
      const activeProjectId = state.activeProjectId === action.projectId ? projects[0].id : state.activeProjectId;
      return { ...state, projects, activeProjectId };
    }
    case 'MOVE_PROJECT': {
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.projectId ? { ...p, folderId: action.folderId } : p)),
      };
    }
    case 'SET_ACTIVE_PROJECT': {
      if (!state.projects.some((p) => p.id === action.projectId)) return state;
      return { ...state, activeProjectId: action.projectId };
    }
    case 'CREATE_FOLDER': {
      return { ...state, folders: [...state.folders, newFolder(action.name)] };
    }
    case 'RENAME_FOLDER': {
      return {
        ...state,
        folders: state.folders.map((f) => (f.id === action.folderId ? { ...f, name: action.name } : f)),
      };
    }
    case 'DELETE_FOLDER': {
      // Deleting a folder never deletes the projects inside it — they just
      // become unfiled, back at the top level of the sidebar.
      return {
        ...state,
        folders: state.folders.filter((f) => f.id !== action.folderId),
        projects: state.projects.map((p) => (p.folderId === action.folderId ? { ...p, folderId: null } : p)),
      };
    }
    case 'CREATE_TAB': {
      return updateActiveProject(state, (project) => {
        const tab = newTab(action.name);
        return { ...project, tabs: [...project.tabs, tab], activeTabId: tab.id };
      });
    }
    case 'RENAME_TAB': {
      return updateActiveProject(state, (project) => ({
        ...project,
        tabs: project.tabs.map((t) => (t.id === action.tabId ? { ...t, name: action.name } : t)),
      }));
    }
    case 'CLOSE_TAB': {
      return updateActiveProject(state, (project) => {
        const remaining = project.tabs.filter((t) => t.id !== action.tabId);
        if (remaining.length === 0) return project; // a project always keeps at least one tab
        const activeTabId = project.activeTabId === action.tabId ? remaining[0].id : project.activeTabId;
        return { ...project, tabs: remaining, activeTabId };
      });
    }
    case 'SET_ACTIVE_TAB': {
      return updateActiveProject(state, (project) => {
        if (!project.tabs.some((t) => t.id === action.tabId)) return project;
        return { ...project, activeTabId: action.tabId };
      });
    }
    default: {
      // Everything else (typing, splitting, undo/redo, title page edits)
      // applies to whichever tab is active in the active project.
      return updateActiveProject(state, (project) => ({
        ...project,
        tabs: project.tabs.map((t) => (t.id === project.activeTabId ? tabReducer(t, action) : t)),
      }));
    }
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.projects?.length > 0) {
        // Older saves predate folders and projects' folderId field.
        return {
          folders: parsed.folders ?? [],
          projects: parsed.projects.map((p) => ({ ...p, folderId: p.folderId ?? null })),
          activeProjectId: parsed.activeProjectId,
        };
      }
    }
  } catch {
    // fall through to migration / defaults
  }

  // Migrate a document saved before projects/tabs existed, so nobody loses work.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyDoc = JSON.parse(legacyRaw) as ScriptDocument;
      if (legacyDoc?.blocks?.length > 0) {
        const project = newProject('My Project', null, [newTab('Draft 1', legacyDoc)]);
        return { folders: [], projects: [project], activeProjectId: project.id };
      }
    }
  } catch {
    // fall through to a blank project
  }

  const project = newProject('My Project');
  return { folders: [], projects: [project], activeProjectId: project.id };
}

interface NamedRef {
  id: string;
  name: string;
}

interface ProjectRef extends NamedRef {
  folderId: string | null;
}

interface StoreContextValue {
  // The active tab's document, exactly as before.
  doc: ScriptDocument;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setText: (id: string, text: string) => void;
  setType: (id: string, elementType: ElementType) => void;
  splitBlock: (id: string, caretPos: number, newType: ElementType) => string;
  mergeWithPrevious: (id: string) => void;
  setTitlePageField: (field: keyof TitlePageInfo, value: string) => void;

  // Folders group projects in the sidebar.
  folders: NamedRef[];
  createFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // Projects, each optionally filed under a folder.
  projects: ProjectRef[];
  activeProjectId: string;
  activeProjectName: string;
  createProject: (name: string, folderId?: string | null) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  moveProject: (id: string, folderId: string | null) => void;
  setActiveProject: (id: string) => void;

  // Tabs within the active project.
  tabs: NamedRef[];
  activeTabId: string;
  createTab: () => void;
  renameTab: (id: string, name: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function ScriptStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0];
  const activeTab = activeProject.tabs.find((t) => t.id === activeProject.activeTabId) ?? activeProject.tabs[0];

  const value = useMemo<StoreContextValue>(
    () => ({
      doc: activeTab.present,
      canUndo: activeTab.past.length > 0,
      canRedo: activeTab.future.length > 0,
      undo: () => dispatch({ type: 'UNDO' }),
      redo: () => dispatch({ type: 'REDO' }),
      setText: (id, text) => dispatch({ type: 'SET_TEXT', id, text, time: Date.now() }),
      setType: (id, elementType) => dispatch({ type: 'SET_TYPE', id, elementType }),
      splitBlock: (id, caretPos, newType) => {
        const id2 = newId();
        dispatch({ type: 'SPLIT_BLOCK', id, caretPos, newType, newId: id2 });
        return id2;
      },
      mergeWithPrevious: (id) => dispatch({ type: 'MERGE_WITH_PREVIOUS', id }),
      setTitlePageField: (field, value) => dispatch({ type: 'SET_TITLE_PAGE', field, value }),

      folders: state.folders.map((f) => ({ id: f.id, name: f.name })),
      createFolder: (name) => dispatch({ type: 'CREATE_FOLDER', name }),
      renameFolder: (id, name) => dispatch({ type: 'RENAME_FOLDER', folderId: id, name }),
      deleteFolder: (id) => dispatch({ type: 'DELETE_FOLDER', folderId: id }),

      projects: state.projects.map((p) => ({ id: p.id, name: p.name, folderId: p.folderId })),
      activeProjectId: activeProject.id,
      activeProjectName: activeProject.name,
      createProject: (name, folderId) => dispatch({ type: 'CREATE_PROJECT', name, folderId }),
      renameProject: (id, name) => dispatch({ type: 'RENAME_PROJECT', projectId: id, name }),
      deleteProject: (id) => dispatch({ type: 'DELETE_PROJECT', projectId: id }),
      moveProject: (id, folderId) => dispatch({ type: 'MOVE_PROJECT', projectId: id, folderId }),
      setActiveProject: (id) => dispatch({ type: 'SET_ACTIVE_PROJECT', projectId: id }),

      tabs: activeProject.tabs.map((t) => ({ id: t.id, name: t.name })),
      activeTabId: activeTab.id,
      createTab: () => dispatch({ type: 'CREATE_TAB', name: `Draft ${activeProject.tabs.length + 1}` }),
      renameTab: (id, name) => dispatch({ type: 'RENAME_TAB', tabId: id, name }),
      closeTab: (id) => dispatch({ type: 'CLOSE_TAB', tabId: id }),
      setActiveTab: (id) => dispatch({ type: 'SET_ACTIVE_TAB', tabId: id }),
    }),
    [state, activeProject, activeTab],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useScriptStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useScriptStore must be used within ScriptStoreProvider');
  return ctx;
}
