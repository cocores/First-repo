import { useCallback, useEffect, useState } from 'react';
import { useScriptStore } from '../store';
import { cycleType, nextTypeOnEnter, transformText } from '../format/elements';
import { blankLinesBefore } from '../format/spec';
import { getSuggestions } from '../format/suggestions';
import { Block, type FocusRequest } from './Block';
import type { ElementType } from '../types';

const NO_SUGGESTIONS: string[] = [];

export interface JumpRequest {
  id: string;
  nonce: number;
}

interface ScriptEditorProps {
  focusedId: string | null;
  onFocusedChange: (id: string) => void;
  jumpTo?: JumpRequest | null;
}

export function ScriptEditor({ focusedId, onFocusedChange, jumpTo }: ScriptEditorProps) {
  const { doc, setText, setType, splitBlock, mergeWithPrevious } = useScriptStore();
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  useEffect(() => {
    if (!jumpTo) return;
    setFocusRequest({ id: jumpTo.id, caretPos: 'end' });
  }, [jumpTo]);

  const handleChange = useCallback(
    (id: string, text: string) => {
      const block = doc.blocks.find((b) => b.id === id);
      if (!block) return;
      setText(id, transformText(block.type, text));
    },
    [doc.blocks, setText],
  );

  const handleCycleType = useCallback(
    (id: string, direction: 1 | -1) => {
      const block = doc.blocks.find((b) => b.id === id);
      if (!block) return;
      const newType = cycleType(block.type, direction);
      setType(id, newType);
      setText(id, transformText(newType, block.text));
    },
    [doc.blocks, setType, setText],
  );

  const handleEnter = useCallback(
    (id: string, caretPos: number, overrideText?: string) => {
      const block = doc.blocks.find((b) => b.id === id);
      if (!block) return;
      if (overrideText !== undefined) setText(id, overrideText);
      const newType = nextTypeOnEnter(block.type);
      const effectiveCaretPos = overrideText !== undefined ? overrideText.length : caretPos;
      const newId = splitBlock(id, effectiveCaretPos, newType);
      setFocusRequest({ id: newId, caretPos: 0 });
    },
    [doc.blocks, splitBlock, setText],
  );

  const handleAcceptSuggestion = useCallback(
    (id: string, fullText: string) => {
      setText(id, fullText);
      setFocusRequest({ id, caretPos: 'end' });
    },
    [setText],
  );

  const handleBackspaceAtStart = useCallback(
    (id: string) => {
      const idx = doc.blocks.findIndex((b) => b.id === id);
      if (idx <= 0) return;
      const prev = doc.blocks[idx - 1];
      const caretPos = prev.text.length;
      mergeWithPrevious(id);
      setFocusRequest({ id: prev.id, caretPos });
    },
    [doc.blocks, mergeWithPrevious],
  );

  const handleArrowUp = useCallback(
    (id: string) => {
      const idx = doc.blocks.findIndex((b) => b.id === id);
      if (idx <= 0) return;
      setFocusRequest({ id: doc.blocks[idx - 1].id, caretPos: 'end' });
    },
    [doc.blocks],
  );

  const handleArrowDown = useCallback(
    (id: string) => {
      const idx = doc.blocks.findIndex((b) => b.id === id);
      if (idx === -1 || idx >= doc.blocks.length - 1) return;
      setFocusRequest({ id: doc.blocks[idx + 1].id, caretPos: 'start' });
    },
    [doc.blocks],
  );

  return (
    <div className="script-editor" onKeyDownCapture={handleGlobalShortcuts(doc.blocks, focusedId, setType, setText)}>
      {doc.blocks.map((block, i) => (
        <Block
          key={block.id}
          block={block}
          isFocused={focusedId === block.id}
          blankLinesBefore={i === 0 ? 0 : blankLinesBefore(doc.blocks[i - 1].type, block.type)}
          suggestions={
            focusedId === block.id ? getSuggestions(doc.blocks, block.id, block.type, block.text) : NO_SUGGESTIONS
          }
          focusRequest={focusRequest}
          onFocusHandled={() => setFocusRequest(null)}
          onFocus={onFocusedChange}
          onChange={handleChange}
          onCycleType={handleCycleType}
          onEnter={handleEnter}
          onAcceptSuggestion={handleAcceptSuggestion}
          onBackspaceAtStart={handleBackspaceAtStart}
          onArrowUpAtStart={handleArrowUp}
          onArrowDownAtEnd={handleArrowDown}
        />
      ))}
    </div>
  );
}

// Ctrl/Cmd+1..7 jump the focused block directly to a specific element type.
// (Undo/redo are handled window-wide in App.tsx — see the comment there for why.)
function handleGlobalShortcuts(
  blocks: { id: string; type: ElementType; text: string }[],
  focusedId: string | null,
  setType: (id: string, t: ElementType) => void,
  setText: (id: string, text: string) => void,
) {
  const order: ElementType[] = [
    'scene_heading',
    'action',
    'character',
    'parenthetical',
    'dialogue',
    'transition',
    'shot',
  ];
  return (e: React.KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const num = Number(e.key);
    if (!Number.isInteger(num) || num < 1 || num > 7) return;
    if (!focusedId) return;
    e.preventDefault();
    const newType = order[num - 1];
    setType(focusedId, newType);
    const block = blocks.find((b) => b.id === focusedId);
    if (block) setText(focusedId, transformText(newType, block.text));
  };
}
