import { useScriptStore } from '../store';

export function TitlePage() {
  const { doc, setTitlePageField } = useScriptStore();

  return (
    <div className="title-page">
      <label className="field">
        <span className="field-label">Title</span>
        <input
          className="title-page-title"
          value={doc.titlePage.title}
          placeholder="Screenplay Title"
          onChange={(e) => setTitlePageField('title', e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">Written by</span>
        <input
          className="title-page-author"
          value={doc.titlePage.author}
          placeholder="Your name"
          onChange={(e) => setTitlePageField('author', e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-label">Contact</span>
        <textarea
          className="title-page-contact"
          value={doc.titlePage.contact}
          placeholder="Email, phone, agency..."
          onChange={(e) => setTitlePageField('contact', e.target.value)}
          rows={3}
        />
      </label>
    </div>
  );
}
