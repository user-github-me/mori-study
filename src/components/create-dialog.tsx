'use client';
import { useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileUp,
  LoaderCircle,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { MaterialKind, Source, StudyRequest } from '@/lib/types';
import { jsonRequest, kindLabels } from '@/lib/client-utils';
import { KindIcon, Modal } from './ui';

export function CreateDialog({
  sources,
  onClose,
  onRefresh,
  onToast,
}: {
  sources: Source[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [allSources, setAllSources] = useState(sources);
  const [selected, setSelected] = useState<string[]>([]);
  const [formats, setFormats] = useState<MaterialKind[]>(['lesson', 'slides', 'quiz']);
  const [prompt, setPrompt] = useState('');
  const [scope, setScope] = useState('');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState<'brief' | 'balanced' | 'detailed'>('brief');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [handoff, setHandoff] = useState('');
  const input = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const data = new FormData();
      Array.from(files).forEach((file) => data.append('files', file));
      const result = await jsonRequest<{
        sources: Source[];
        errors?: { name: string; error: string }[];
      }>('/api/sources', { method: 'POST', body: data });
      setAllSources((s) => [...s, ...result.sources]);
      setSelected((s) => [...s, ...result.sources.map((source) => source.id)]);
      await onRefresh();
      if (result.errors?.length)
        setError(result.errors.map((e) => `${e.name}: ${e.error}`).join(' · '));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    setBusy(true);
    setError('');
    try {
      const result = await jsonRequest<{ request: StudyRequest; agentPrompt: string }>(
        '/api/requests',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim() || 'My study set',
            prompt:
              prompt.trim() ||
              `Create ${formats.map((f) => kindLabels[f].toLowerCase()).join(', ')} from the selected sources. Use ${detail} explanations with accurate source citations.`,
            sourceIds: selected,
            formats,
            scope: scope.trim() || 'All selected sources',
            detail,
          }),
        },
      );
      setHandoff(result.agentPrompt);
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={handoff ? 'Your study request is ready' : 'Plant a new idea'} onClose={onClose}>
      {handoff ? (
        <div className="handoff">
          <span className="success-circle">
            <CheckCircle2 size={30} />
          </span>
          <h2>
            One small handoff.
            <br />A whole new way to learn.
          </h2>
          <p>
            Paste this request into your agent with the Mori skill installed. Your study set will
            appear here when the agent imports it.
          </p>
          <div className="handoff-code">
            <pre>{handoff}</pre>
          </div>
          <div className="notice">
            Waiting for your agent · Mori does not generate in the background.
          </div>
          <button
            className="button primary full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(handoff);
                onToast('Agent prompt copied');
              } catch {
                onToast('Select and copy the prompt above');
              }
            }}
          >
            <Copy size={17} /> Copy agent prompt
          </button>
          <button className="button secondary full" onClick={onClose}>
            Back to my study space
          </button>
        </div>
      ) : (
        <div className="create-body">
          <div className="dialog-intro">
            <span className="mini-label">
              <Sparkles size={13} /> FROM SOURCES TO UNDERSTANDING
            </span>
            <h2>What are we learning?</h2>
            <p>Bring your material. Make it make sense.</p>
          </div>
          <label className="field-label" htmlFor="study-title">
            Give your study set a name
          </label>
          <input
            id="study-title"
            className="input"
            placeholder="e.g. Calculus, made clear"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <div className="field-label label-row">
            Choose your sources <span>{selected.length} selected</span>
          </div>
          <div className="source-picker">
            {allSources.map((source) => (
              <button
                key={source.id}
                aria-pressed={selected.includes(source.id)}
                className={`source-pick ${selected.includes(source.id) ? 'picked' : ''}`}
                onClick={() =>
                  setSelected((ids) =>
                    ids.includes(source.id)
                      ? ids.filter((id) => id !== source.id)
                      : [...ids, source.id],
                  )
                }
              >
                <FileUp size={17} />
                <span>{source.name}</span>
                <span className="checkbox">
                  {selected.includes(source.id) && <Check size={12} />}
                </span>
              </button>
            ))}
            <button
              disabled={busy}
              className="upload-inline"
              onClick={() => input.current?.click()}
            >
              <Plus size={16} /> Add PDFs, photos, notes, or slides
            </button>
            <input
              type="file"
              ref={input}
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.docx,.pptx"
              hidden
              onChange={(e) => void upload(e.target.files)}
            />
          </div>
          <label className="field-label" htmlFor="study-scope">
            Focus on <span className="optional">optional</span>
          </label>
          <input
            id="study-scope"
            className="input"
            placeholder="e.g. Chapters 1–2.3, pages 12–38"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
          <div className="field-label">Make it into</div>
          <div className="format-picker">
            {(
              ['lesson', 'slides', 'quiz', 'practice', 'flashcards', 'video'] as MaterialKind[]
            ).map((kind) => (
              <button
                aria-pressed={formats.includes(kind)}
                className={`format-pick ${formats.includes(kind) ? 'picked' : ''}`}
                key={kind}
                onClick={() =>
                  setFormats((f) => (f.includes(kind) ? f.filter((v) => v !== kind) : [...f, kind]))
                }
              >
                <KindIcon kind={kind} />
                {kindLabels[kind]}
                {formats.includes(kind) && <Check size={12} />}
              </button>
            ))}
          </div>
          <div className="field-label">How deep should we go?</div>
          <div className="segmented">
            {(['brief', 'balanced', 'detailed'] as const).map((d) => (
              <button
                key={d}
                aria-pressed={detail === d}
                className={detail === d ? 'selected' : ''}
                onClick={() => setDetail(d)}
              >
                {d === 'brief'
                  ? 'Keep it brief'
                  : d === 'balanced'
                    ? 'A good balance'
                    : 'Go in depth'}
              </button>
            ))}
          </div>
          <label htmlFor="study-prompt" className="field-label">
            Anything your agent should know?
          </label>
          <textarea
            id="study-prompt"
            className="input"
            placeholder="Explain it like I’m new to the topic. Include worked examples and a quiz after each lesson…"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="create-footer">
            <span>Your sources stay on this device.</span>
            <button
              className="button primary"
              disabled={busy || !selected.length || !formats.length}
              onClick={create}
            >
              {busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Create
              study request <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function SourceUploadDialog({
  onClose,
  onRefresh,
}: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      Array.from(files).forEach((f) => body.append('files', f));
      const result = await jsonRequest<{
        sources: Source[];
        errors?: { name: string; error: string }[];
      }>('/api/sources', { method: 'POST', body });
      await onRefresh();
      if (result.errors?.length)
        setError(
          `Added ${result.sources.length} source(s). ${result.errors.map((e) => `${e.name}: ${e.error}`).join(' · ')}`,
        );
      else onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveNote() {
    setBusy(true);
    setError('');
    try {
      await jsonRequest('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: note, name: name.trim() || 'My study notes.md' }),
      });
      await onRefresh();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Add a little inspiration" onClose={onClose}>
      <div className="create-body">
        <h2>It starts with a source.</h2>
        <p className="muted">A textbook, a class handout, a photo of your notes.</p>
        <button
          disabled={busy}
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onClick={() => ref.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
        >
          <Upload size={30} />
          <strong>{busy ? 'Adding your sources…' : 'Drop your files here, or browse'}</strong>
          <span>PDF, images, TXT, Markdown, DOCX, PPTX · up to 25 MB each</span>
        </button>
        <input
          ref={ref}
          type="file"
          multiple
          hidden
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.docx,.pptx"
          onChange={(e) => void upload(e.target.files)}
        />
        <div className="or-divider">
          <span>or paste your notes</span>
        </div>
        <input
          className="input"
          aria-label="Note title"
          placeholder="A title for your notes"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="input note-input"
          aria-label="Note content"
          rows={5}
          placeholder="Paste the ideas you want to explore…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy || !note.trim()} onClick={saveNote}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} Add notes
        </button>
      </div>
    </Modal>
  );
}
