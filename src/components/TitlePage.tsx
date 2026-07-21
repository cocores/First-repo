import { useScriptStore } from '../store';

export function TitlePage() {
  const { doc, setTitlePageField } = useScriptStore();

  return (
    <div className="title-page">
      <input
        className="title-page-title"
        value={doc.titlePage.title}
        placeholder="Screenplay Title"
        onChange={(e) => setTitlePageField('title', e.target.value)}
      />
      <input
        className="title-page-author"
        value={doc.titlePage.author}
        placeholder="Written by ..."
        onChange={(e) => setTitlePageField('author', e.target.value)}
      />
      <textarea
        className="title-page-contact"
        value={doc.titlePage.contact}
        placeholder="Contact info (email, phone, agency)"
        onChange={(e) => setTitlePageField('contact', e.target.value)}
        rows={3}
      />
    </div>
  );
}
