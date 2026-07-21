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
  suggestions: string[];
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
  suggestions,
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
  const [dismissed, setDismissed] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

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

  const isOpen = isFocused && caretAtEnd && !dismissed && suggestions.length > 0;
  const clampedHighlighted = Math.min(highlighted, suggestions.length - 1);
  const suggestionsKey = suggestions.join(' ');

  useEffect(() => {
    setHighlighted(0);
  }, [suggestionsKey]);

  function syncCaretAtEnd(ta: HTMLTextAreaElement) {
    setCaretAtEnd(ta.selectionStart === ta.value.length);
  }

  function accept(fullText: string) {
    onAcceptSuggestion(block.id, fullText);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    if (isOpen && e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (isOpen && e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
      return;
    }
    if (isOpen && e.key === 'Escape') {
      e.preventDefault();
      setDismissed(true);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (isOpen && !e.shiftKey) {
        accept(suggestions[clampedHighlighted]);
        return;
      }
      onCycleType(block.id, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen) {
        onEnter(block.id, ta.selectionStart, suggestions[clampedHighlighted]);
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
  const listId = `sugg-list-${block.id}`;
  const optionId = (i: number) => `sugg-opt-${block.id}-${i}`;

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
        <textarea
          ref={ref}
          className="block-textarea"
          rows={1}
          value={block.text}
          placeholder={isFocused ? ELEMENT_LABELS[block.type] : ''}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={isOpen ? optionId(clampedHighlighted) : undefined}
          onFocus={(e) => {
            onFocus(block.id);
            syncCaretAtEnd(e.currentTarget);
          }}
          onChange={(e) => {
            setDismissed(false);
            onChange(block.id, e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onSelect={(e) => syncCaretAtEnd(e.currentTarget)}
          spellCheck
        />
        {isOpen && (
          <ul className="suggestion-dropdown" role="listbox" id={listId}>
            {suggestions.map((s, i) => (
              <li
                key={s}
                id={optionId(i)}
                role="option"
                aria-selected={i === clampedHighlighted}
                className={i === clampedHighlighted ? 'highlighted' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => accept(s)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
