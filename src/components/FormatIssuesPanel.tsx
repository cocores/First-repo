import type { ScriptBlock } from '../types';
import type { LintIssue } from '../format/lint';

interface FormatIssuesPanelProps {
  isOpen: boolean;
  issues: LintIssue[];
  blocksById: Map<string, ScriptBlock>;
  onJump: (blockId: string) => void;
  onApplyFix: (blockId: string, fixedText: string) => void;
}

export function FormatIssuesPanel({ isOpen, issues, blocksById, onJump, onApplyFix }: FormatIssuesPanelProps) {
  return (
    <aside className={`format-panel${isOpen ? ' open' : ''}`} aria-hidden={!isOpen} inert={!isOpen}>
      <div className="format-panel-header">
        Format Suggestions
        {issues.length > 0 && <span className="format-panel-count">{issues.length}</span>}
      </div>
      {issues.length === 0 ? (
        <p className="format-panel-empty">No formatting issues found — nice work.</p>
      ) : (
        <ul className="format-issue-list">
          {issues.map((issue) => {
            const block = blocksById.get(issue.blockId);
            const excerpt = block?.text.trim().slice(0, 44) || '(empty)';
            return (
              <li key={issue.id} className={`severity-${issue.severity}`}>
                <button type="button" className="format-issue-row" onClick={() => onJump(issue.blockId)}>
                  <span className="format-issue-badge" aria-hidden="true">
                    {issue.severity === 'warning' ? '⚠' : 'ℹ'}
                  </span>
                  <span className="format-issue-body">
                    <span className="format-issue-excerpt">
                      {excerpt}
                      {block && block.text.trim().length > 44 ? '…' : ''}
                    </span>
                    <span className="format-issue-message">{issue.message}</span>
                    <span className="format-issue-suggestion">{issue.suggestion}</span>
                  </span>
                </button>
                {issue.fixedText && (
                  <button type="button" className="format-issue-fix" onClick={() => onApplyFix(issue.blockId, issue.fixedText!)}>
                    Apply fix
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
