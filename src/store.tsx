import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ElementType, ScriptBlock, ScriptDocument, TitlePageInfo } from './types';

const STORAGE_KEY = 'scriptwriter.document.v1';
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

function defaultDocument(): ScriptDocument {
  return {
    titlePage: { title: 'Untitled Screenplay', author: '', contact: '' },
    blocks: [newBlock('scene_heading', '')],
  };
}

function loadDocument(): ScriptDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDocument();
    const parsed = JSON.parse(raw) as ScriptDocument;
    if (!parsed.blocks || parsed.blocks.length === 0) return defaultDocument();
    return parsed;
  } catch {
    return defaultDocument();
  }
}

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

interface HistoryState {
  past: ScriptDocument[];
  present: ScriptDocument;
  future: ScriptDocument[];
  lastCoalesceKey: string | null;
  lastCoalesceTime: number;
}

type HistoryAction = DocAction | { type: 'UNDO' } | { type: 'REDO' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
      lastCoalesceKey: null,
      lastCoalesceTime: 0,
    };
  }
  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    const [next, ...rest] = state.future;
    return {
      past: [...state.past, state.present].slice(-MAX_HISTORY),
      present: next,
      future: rest,
      lastCoalesceKey: null,
      lastCoalesceTime: 0,
    };
  }

  const nextPresent = docReducer(state.present, action);
  if (nextPresent === state.present) return state;

  const time = action.type === 'SET_TEXT' ? action.time : state.lastCoalesceTime;
  const coalesceKey = action.type === 'SET_TEXT' ? `SET_TEXT:${action.id}` : null;
  const shouldCoalesce =
    coalesceKey !== null && coalesceKey === state.lastCoalesceKey && time - state.lastCoalesceTime < COALESCE_MS;

  return {
    past: shouldCoalesce ? state.past : [...state.past, state.present].slice(-MAX_HISTORY),
    present: nextPresent,
    future: [],
    lastCoalesceKey: coalesceKey,
    lastCoalesceTime: time,
  };
}

function initHistory(): HistoryState {
  return { past: [], present: loadDocument(), future: [], lastCoalesceKey: null, lastCoalesceTime: 0 };
}

interface StoreContextValue {
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
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function ScriptStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(historyReducer, undefined, initHistory);
  const { present: doc } = state;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }, [doc]);

  const value = useMemo<StoreContextValue>(
    () => ({
      doc,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
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
    }),
    [doc, state.past.length, state.future.length],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useScriptStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useScriptStore must be used within ScriptStoreProvider');
  return ctx;
}
