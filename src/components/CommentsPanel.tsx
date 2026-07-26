import type { Comment, ScriptBlock } from '../types';

interface CommentsPanelProps {
  isOpen: boolean;
  comments: Comment[];
  blocksById: Map<string, ScriptBlock>;
  onJump: (blockId: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
}

export function CommentsPanel({ isOpen, comments, blocksById, onJump, onResolve, onDelete }: CommentsPanelProps) {
  const unresolved = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  function renderRow(comment: Comment) {
    const block = blocksById.get(comment.blockId);
    const excerpt = block?.text.trim().slice(0, 44) || '(empty line)';
    return (
      <li key={comment.id} className={comment.resolved ? 'resolved' : ''}>
        <button type="button" className="format-issue-row" onClick={() => onJump(comment.blockId)}>
          <span className="format-issue-badge" aria-hidden="true">
            💬
          </span>
          <span className="format-issue-body">
            <span className="format-issue-excerpt">
              {excerpt}
              {block && block.text.trim().length > 44 ? '…' : ''}
            </span>
            <span className="format-issue-message">{comment.text}</span>
          </span>
        </button>
        <div className="comment-row-actions">
          <button type="button" onClick={() => onResolve(comment.id, !comment.resolved)}>
            {comment.resolved ? 'Reopen' : 'Resolve'}
          </button>
          <button type="button" onClick={() => onDelete(comment.id)}>
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <aside className={`format-panel${isOpen ? ' open' : ''}`} aria-hidden={!isOpen} inert={!isOpen}>
      <div className="format-panel-header">
        Comments
        {unresolved.length > 0 && <span className="format-panel-count">{unresolved.length}</span>}
      </div>
      {comments.length === 0 ? (
        <p className="format-panel-empty">No comments yet — click the 💬 next to any line to add one.</p>
      ) : (
        <>
          {unresolved.length > 0 ? (
            <ul className="format-issue-list comment-list">{unresolved.map(renderRow)}</ul>
          ) : (
            <p className="format-panel-empty">No open comments.</p>
          )}
          {resolved.length > 0 && (
            <details className="comments-resolved-group">
              <summary>Resolved ({resolved.length})</summary>
              <ul className="format-issue-list comment-list">{resolved.map(renderRow)}</ul>
            </details>
          )}
        </>
      )}
    </aside>
  );
}
