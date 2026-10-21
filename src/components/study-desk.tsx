'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  GalleryVerticalEnd,
  Leaf,
  ListChecks,
  LoaderCircle,
  Plus,
  Settings2,
  X,
} from 'lucide-react';
import type { Course, Material, Progress, Workspace } from '@/lib/types';
import {
  courseMarkdown,
  download,
  downloadSlideDeck,
  emptyProgress,
  exportCards,
  jsonRequest,
  kindLabels,
  localDate,
  parseProgress,
  percent,
} from '@/lib/client-utils';
import { MoriMark } from './art';
import { KindIcon, Markdown, Modal } from './ui';
import { CreateDialog } from './create-dialog';
import { StudyViewer } from './study-viewer';

type Tab = 'learn' | 'practice' | 'progress';
export function StudyDesk() {
  const [workspace, setWorkspace] = useState<Workspace>({ courses: [], sources: [], requests: [] });
  const [courseId, setCourseId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [tab, setTab] = useState<Tab>('learn');
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [create, setCreate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const [deckBusy, setDeckBusy] = useState(false);
  const initialized = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const data = await jsonRequest<Workspace>('/api/workspace');
      setWorkspace(data);
      setError('');
      if (!initialized.current && data.courses.length) {
        let chosen = data.courses[0];
        let previousMaterial = '';
        try {
          const known = JSON.parse(localStorage.getItem('mori-known-courses') || '[]');
          const previous = localStorage.getItem('mori-last-course');
          if (Array.isArray(known) && known.includes(data.courses[0].id))
            chosen = data.courses.find((c) => c.id === previous) || chosen;
          const saved = localStorage.getItem('mori-progress-v1');
          if (saved) previousMaterial = parseProgress(JSON.parse(saved)).lastMaterialId || '';
          localStorage.setItem('mori-known-courses', JSON.stringify(data.courses.map((c) => c.id)));
        } catch {
          /* The workspace remains usable when browser storage is unavailable. */
        }
        const requested = new URLSearchParams(window.location.search).get('course');
        chosen = data.courses.find((c) => c.id === requested) || chosen;
        setCourseId(chosen.id);
        setMaterialId(
          chosen.materials.find((m) => m.id === previousMaterial)?.id || chosen.materials[0].id,
        );
        initialized.current = true;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mori-progress-v1');
      if (saved) setProgress(parseProgress(JSON.parse(saved)));
    } catch {
      notify('Your saved progress could not be loaded. Study material is safe.');
    }
    setReady(true);
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => clearInterval(timer);
  }, [refresh, notify]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem('mori-progress-v1', JSON.stringify(progress));
      } catch {
        notify('Browser saving is unavailable. Download a progress backup from Manage.');
      }
  }, [ready, progress, notify]);
  const course = workspace.courses.find((c) => c.id === courseId) || workspace.courses[0];
  const material = course?.materials.find((m) => m.id === materialId) || course?.materials[0];
  function chooseCourse(id: string) {
    const next = workspace.courses.find((c) => c.id === id);
    if (!next) return;
    setCourseId(id);
    setMaterialId(
      next.materials.find((m) => !progress.completed.includes(m.id))?.id || next.materials[0].id,
    );
    setTab('learn');
    try {
      localStorage.setItem('mori-last-course', id);
    } catch {}
  }
  function openMaterial(next: Material) {
    setMaterialId(next.id);
    setTab('learn');
    setProgress((p) => ({ ...p, lastMaterialId: next.id }));
    try {
      localStorage.setItem('mori-last-course', course.id);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function complete(id: string, quiz?: { score: number; total: number }) {
    const current = course.materials.find((m) => m.id === id);
    setProgress((p) => ({
      ...p,
      completed: [...new Set([...p.completed, id])],
      quizScores: quiz ? { ...p.quizScores, [id]: quiz } : p.quizScores,
      activity: {
        ...p.activity,
        [localDate()]: (p.activity[localDate()] || 0) + (p.completed.includes(id) ? 0 : 1),
      },
      studyMinutes: p.studyMinutes + (p.completed.includes(id) ? 0 : current?.duration || 0),
    }));
    notify(
      quiz
        ? `Quiz saved · ${quiz.score} of ${quiz.total} correct`
        : 'Progress saved. One idea clearer.',
    );
  }
  function review(id: string, cardId: string) {
    setProgress((p) => ({
      ...p,
      reviewedCards: {
        ...p.reviewedCards,
        [id]: [...new Set([...(p.reviewedCards[id] || []), cardId])],
      },
    }));
  }
  const practice =
    course?.materials.filter(
      (m) => m.kind === 'quiz' || m.kind === 'practice' || m.kind === 'flashcards',
    ) || [];
  const finished = course?.materials.filter((m) => progress.completed.includes(m.id)).length || 0;
  const nextLesson =
    course?.materials.find((m) => !progress.completed.includes(m.id)) || course?.materials[0];
  const reviewNext =
    course?.materials.filter(
      (m) =>
        m.kind === 'quiz' &&
        progress.quizScores[m.id] &&
        progress.quizScores[m.id].score < progress.quizScores[m.id].total,
    ) || [];
  return (
    <div className="reader-shell">
      <header className="reader-header">
        <a href="/" className="reader-brand" aria-label="Mori Study home">
          <MoriMark size={30} />
          <span>
            mori<span className="reader-word-study"> study</span>
            <span className="green-period">.</span>
          </span>
        </a>
        <div className="reader-course-switch">
          <select
            aria-label="Choose a study set"
            value={course?.id || ''}
            onChange={(e) => chooseCourse(e.target.value)}
          >
            {workspace.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
        <nav className="reader-tabs" aria-label="Study navigation">
          {(
            [
              { id: 'learn', label: 'Lessons', Icon: BookOpen },
              { id: 'practice', label: 'Practice', Icon: ListChecks },
              { id: 'progress', label: 'My progress', Icon: CheckCircle2 },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              <t.Icon size={16} />
              {t.label}
            </button>
          ))}
        </nav>
        <a className="reader-manage" href="/workspace">
          <Settings2 size={16} />
          <span>Manage</span>
        </a>
      </header>
      {loading ? (
        <div className="loading-state">
          <MoriMark size={42} />
          <p>Opening your study space…</p>
          <LoaderCircle size={19} className="spin" />
        </div>
      ) : error ? (
        <div className="empty-state">
          <h2>Let’s reconnect.</h2>
          <p>{error}</p>
          <button className="button primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : !course ? (
        <div className="empty-state">
          <MoriMark size={50} />
          <h2>Your next idea starts here.</h2>
          <p>Add your sources and let your agent make a study pack.</p>
          <button className="button primary" onClick={() => setCreate(true)}>
            <Plus size={16} /> New study pack
          </button>
        </div>
      ) : (
        <div className="reader-layout">
          <aside className="reader-sidebar">
            <span className="eyebrow">YOUR STUDY PACK</span>
            <h1>{course.title}</h1>
            <p>{course.chapters}</p>
            <div className="reader-progress-line">
              <div className="progress-bar">
                <span style={{ width: `${percent(course, progress)}%` }} />
              </div>
              <span>
                {finished}/{course.materials.length}
              </span>
            </div>
            <div className="reader-topic-label">
              CONTENTS <span>{course.materials.length} materials</span>
            </div>
            <nav aria-label="Lesson contents">
              {course.materials.map((m, i) => (
                <button
                  key={m.id}
                  className={`reader-topic ${material?.id === m.id && tab === 'learn' ? 'active' : ''}`}
                  onClick={() => openMaterial(m)}
                  aria-current={material?.id === m.id && tab === 'learn' ? 'step' : undefined}
                >
                  <span className="reader-topic-number">
                    {progress.completed.includes(m.id) ? (
                      <Check size={14} />
                    ) : (
                      String(i + 1).padStart(2, '0')
                    )}
                  </span>
                  <span>
                    <strong>{m.title}</strong>
                    <small>
                      <KindIcon kind={m.kind} size={11} />
                      {kindLabels[m.kind]} · {m.duration} min
                    </small>
                  </span>
                </button>
              ))}
            </nav>
            <div className="reader-sidebar-actions">
              <button onClick={() => setExporting(true)}>
                <Download size={15} /> Download this pack
              </button>
              <button onClick={() => setCreate(true)}>
                <Plus size={15} /> New study pack
              </button>
            </div>
            <span className="reader-private">
              <Leaf size={12} /> Personal. Local. Yours.
            </span>
          </aside>
          <main className="reader-main">
            <div className="reader-mobile-picker">
              <label htmlFor="reader-topic">Jump to a lesson</label>
              <select
                id="reader-topic"
                value={material?.id}
                onChange={(e) => {
                  const m = course.materials.find((m) => m.id === e.target.value);
                  if (m) openMaterial(m);
                }}
              >
                {course.materials.map((m, i) => (
                  <option key={m.id} value={m.id}>
                    {i + 1}. {m.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="reader-status">
              <span>
                {tab === 'learn'
                  ? material?.section
                  : tab === 'practice'
                    ? 'A little practice'
                    : 'Your learning so far'}
              </span>
              <span>
                <span className="local-dot" /> Progress saves automatically{' '}
                <button
                  aria-label="Download study pack"
                  className="icon-button"
                  onClick={() => setExporting(true)}
                >
                  <Download size={15} />
                </button>
              </span>
            </div>
            {tab === 'learn' && material && (
              <StudyViewer
                key={material.id}
                embedded
                material={material}
                course={course}
                sources={workspace.sources}
                progress={progress}
                onClose={() => setTab('practice')}
                onComplete={complete}
                onReview={review}
                onNext={openMaterial}
              />
            )}
            {tab === 'practice' && (
              <section className="reader-panel">
                <span className="eyebrow">MAKE IT STICK</span>
                <h2>A little practice goes a long way.</h2>
                <p>
                  No rush. Try a question, check your reasoning, and return to the lesson whenever
                  you need.
                </p>
                <div className="reader-practice-list">
                  {practice.map((m) => (
                    <button key={m.id} onClick={() => openMaterial(m)}>
                      <span className={`material-kind kind-${m.kind}`}>
                        <KindIcon kind={m.kind} size={22} />
                      </span>
                      <div>
                        <span className="eyebrow">{m.section}</span>
                        <h3>{m.title}</h3>
                        <p>
                          {m.kind === 'quiz'
                            ? `${m.questions?.length} questions · explanations after every answer`
                            : m.kind === 'practice'
                              ? `${m.problems?.length} problems · hints and worked solutions`
                              : `${m.cards?.length} flashcards · one idea at a time`}
                        </p>
                      </div>
                      {progress.quizScores[m.id] ? (
                        <span className="reader-score">
                          {progress.quizScores[m.id].score}/{progress.quizScores[m.id].total}
                        </span>
                      ) : (
                        <ArrowRight size={18} />
                      )}
                    </button>
                  ))}
                </div>
                {practice.length === 0 && (
                  <div className="empty-inline">
                    No practice material in this pack yet. Ask your agent to add practice problems,
                    a quiz, or flashcards.
                  </div>
                )}
              </section>
            )}
            {tab === 'progress' && (
              <section className="reader-panel">
                <span className="eyebrow">ONE STEP AT A TIME</span>
                <h2>It’s starting to make sense.</h2>
                <p>
                  {finished} of {course.materials.length} materials completed in this study pack.
                </p>
                <div className="reader-completion">
                  <div className="progress-bar">
                    <span style={{ width: `${percent(course, progress)}%` }} />
                  </div>
                  <strong>{percent(course, progress)}%</strong>
                </div>
                {nextLesson && (
                  <button className="reader-continue" onClick={() => openMaterial(nextLesson)}>
                    <span>
                      <small>YOUR NEXT STEP</small>
                      <strong>{nextLesson.title}</strong>
                    </span>
                    <span>
                      Continue <ArrowRight size={17} />
                    </span>
                  </button>
                )}
                <h3 className="reader-subheading">A fresh look might help</h3>
                {reviewNext.length ? (
                  reviewNext.map((m) => (
                    <button
                      className="reader-review-row"
                      key={m.id}
                      onClick={() => openMaterial(m)}
                    >
                      <ListChecks size={19} />
                      <span>
                        <strong>{m.title}</strong>
                        <small>
                          {progress.quizScores[m.id].score} of {progress.quizScores[m.id].total}{' '}
                          correct · try again at your pace
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))
                ) : (
                  <p className="reader-soft-note">
                    {finished
                      ? 'Your completed quizzes are looking good. Keep following your curiosity.'
                      : 'After you try a quiz, any topics worth revisiting will appear here.'}
                  </p>
                )}
                <h3 className="reader-subheading">What you’ve learned</h3>
                {course.materials
                  .filter((m) => progress.completed.includes(m.id))
                  .map((m) => (
                    <button
                      className="reader-review-row"
                      key={m.id}
                      onClick={() => openMaterial(m)}
                    >
                      <CheckCircle2 size={19} />
                      <span>
                        <strong>{m.title}</strong>
                        <small>{kindLabels[m.kind]} · completed</small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                {!finished && (
                  <p className="reader-soft-note">
                    Mark a lesson complete or finish a practice session to start your progress.
                  </p>
                )}
                <a className="text-button reader-backup-link" href="/workspace?view=settings">
                  Back up or restore my progress <ArrowRight size={15} />
                </a>
              </section>
            )}
            <footer className="reader-footnote">
              <MoriMark size={14} />
              <span>Take your time. Understanding is worth it.</span>
            </footer>
          </main>
        </div>
      )}
      {create && (
        <CreateDialog
          sources={workspace.sources}
          onClose={() => setCreate(false)}
          onRefresh={refresh}
          onToast={notify}
        />
      )}
      {exporting && course && (
        <Modal title="Keep a copy" onClose={() => setExporting(false)}>
          <div className="export-options">
            <h2>Take your learning with you.</h2>
            <p className="muted">{course.title}</p>
            <button
              disabled={deckBusy}
              onClick={async () => {
                setDeckBusy(true);
                try {
                  await downloadSlideDeck(course.id);
                  notify('PowerPoint deck downloaded');
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setDeckBusy(false);
                }
              }}
            >
              <span>
                {deckBusy ? <LoaderCircle size={23} className="spin" /> : <BookOpen size={23} />}
              </span>
              <div>
                <strong>
                  {deckBusy ? 'Preparing your slide deck…' : 'PowerPoint deck (.pptx)'}
                </strong>
                <p>
                  The whole pack as designed slides, with pictures, practice, and source credits.
                </p>
              </div>
              <Download size={18} />
            </button>
            <button
              onClick={() => {
                setExporting(false);
                setTimeout(() => window.print(), 150);
              }}
            >
              <span>
                <FileText size={23} />
              </span>
              <div>
                <strong>Save as PDF</strong>
                <p>Print the full pack: lessons, slides, answers, and sources.</p>
              </div>
              <Download size={18} />
            </button>
            <button
              onClick={() => download(`${course.id}.md`, courseMarkdown(course), 'text/markdown')}
            >
              <span>
                <FileText size={23} />
              </span>
              <div>
                <strong>Markdown notes</strong>
                <p>Readable, editable notes for your own collection.</p>
              </div>
              <Download size={18} />
            </button>
            {course.materials.some((m) => m.cards?.length) && (
              <button onClick={() => exportCards(course)}>
                <span>
                  <GalleryVerticalEnd size={23} />
                </span>
                <div>
                  <strong>Flashcard CSV</strong>
                  <p>Bring your cards into Anki or a spreadsheet.</p>
                </div>
                <Download size={18} />
              </button>
            )}
            <button onClick={() => download(`${course.id}.json`, JSON.stringify(course, null, 2))}>
              <span>
                <BookOpen size={23} />
              </span>
              <div>
                <strong>Study pack JSON</strong>
                <p>For your agent. Original source IDs are needed to reimport.</p>
              </div>
              <Download size={18} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {course && (
        <div className="print-course">
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <Markdown>{courseMarkdown(course)}</Markdown>
        </div>
      )}
    </div>
  );
}
