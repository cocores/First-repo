import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ScriptBlock } from '../types';
import { ELEMENT_LABELS } from '../types';
import { ELEMENT_LAYOUT, MARGIN_LEFT_IN } from '../format/spec';

export interface FocusRequest {
  id: string;
  caretPos: number | 'end' | 'start';
}

interface BlockProps {
  block: ScriptBlock;
  isFocused: boolean;
  blankLinesBefore: number;
  suggestion: string | null;
  focusRequest: FocusRequest | null;
  onFocusHandled: () => void;
  onFocus: (id: string) => void;
  onChange: (id: string, text: string) => void;
  onCycleType: (id: string, direction: 1 | -1) => void;
  onEnter: (id: string, caretPos: number, overrideText?: string) => void;
  onAcceptSuggestion: (id: string, fullText: string) => void;
  onBackspaceAtStart: (id: string) => void;
  onArrowUpAtStart: (id: string) => void;
  onArrowDownAtEnd: (id: string) => void;
}

export function Block({
  block,
  isFocused,
  blankLinesBefore,
  suggestion,
  focusRequest,
  onFocusHandled,
  onFocus,
  onChange,
  onCycleType,
  onEnter,
  onAcceptSuggestion,
  onBackspaceAtStart,
  onArrowUpAtStart,
  onArrowDownAtEnd,
}: BlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const layout = ELEMENT_LAYOUT[block.type];
  const [caretAtEnd, setCaretAtEnd] = useState(true);

  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [block.text]);

  useEffect(() => {
    if (!focusRequest || focusRequest.id !== block.id) return;
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    const pos =
      focusRequest.caretPos === 'end'
        ? ta.value.length
        : focusRequest.caretPos === 'start'
          ? 0
          : focusRequest.caretPos;
    ta.setSelectionRange(pos, pos);
    onFocusHandled();
  }, [focusRequest, block.id, onFocusHandled]);

  const remainder =
    isFocused && caretAtEnd && suggestion && suggestion.toUpperCase().startsWith(block.text.toUpperCase())
      ? suggestion.slice(block.text.length)
      : '';

  function syncCaretAtEnd(ta: HTMLTextAreaElement) {
    setCaretAtEnd(ta.selectionStart === ta.value.length);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (remainder && !e.shiftKey) {
        onAcceptSuggestion(block.id, suggestion!);
        return;
      }
      onCycleType(block.id, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (remainder) {
        onEnter(block.id, ta.selectionStart, suggestion!);
      } else {
        onEnter(block.id, ta.selectionStart);
      }
      return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
      e.preventDefault();
      onBackspaceAtStart(block.id);
      return;
    }
    if (e.key === 'ArrowUp' && ta.selectionStart === 0) {
      e.preventDefault();
      onArrowUpAtStart(block.id);
      return;
    }
    if (e.key === 'ArrowDown' && ta.selectionStart === ta.value.length) {
      e.preventDefault();
      onArrowDownAtEnd(block.id);
      return;
    }
  }

  const leftPaddingIn = layout.leftIn - MARGIN_LEFT_IN;
  const widthIn = layout.rightIn - layout.leftIn;

  return (
    <div
      className={`block-row block-${block.type}`}
      style={{
        paddingLeft: `${leftPaddingIn}in`,
        textAlign: layout.align ?? 'left',
        marginTop: `${blankLinesBefore * 1.15}em`,
      }}
    >
      <div className="block-input-wrap" style={{ width: `${widthIn}in` }}>
        {remainder && (
          <div className="suggestion-ghost" aria-hidden="true">
            <span className="ghost-spacer">{block.text}</span>
            <span className="ghost-remainder">{remainder}</span>
          </div>
        )}
        <textarea
          ref={ref}
          className="block-textarea"
          rows={1}
          value={block.text}
          placeholder={isFocused ? ELEMENT_LABELS[block.type] : ''}
          onFocus={(e) => {
            onFocus(block.id);
            syncCaretAtEnd(e.currentTarget);
          }}
          onChange={(e) => onChange(block.id, e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={(e) => syncCaretAtEnd(e.currentTarget)}
          spellCheck
        />
      </div>
    </div>
  );
}
