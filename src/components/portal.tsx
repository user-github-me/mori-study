'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Leaf,
  Library,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sprout,
  Upload,
  X,
} from 'lucide-react';
import type { Course, Material, MaterialKind, Progress, Workspace } from '@/lib/types';
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
import { HeroArt, MoriMark, SubjectArt } from './art';
import { KindIcon, Modal } from './ui';
import { StudyViewer } from './study-viewer';
import { CreateDialog, SourceUploadDialog } from './create-dialog';

type View = 'home' | 'library' | 'sources' | 'progress' | 'settings';
const nav = [
  { id: 'home', name: 'Overview', icon: Sprout },
  { id: 'library', name: 'My study sets', icon: Library },
  { id: 'sources', name: 'Sources', icon: FolderOpen },
  { id: 'progress', name: 'My progress', icon: BarChart3 },
] as const;
export function Portal() {
  const [workspace, setWorkspace] = useState<Workspace>({ courses: [], sources: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('home');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<{
    material: Material;
    course: Course;
  } | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [create, setCreate] = useState(false);
  const [upload, setUpload] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState('');
  const [deckBusy, setDeckBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exportCourse, setExportCourse] = useState<Course | null>(null);
  const [filter, setFilter] = useState<MaterialKind | 'all'>('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      const data = await jsonRequest<Workspace>('/api/workspace');
      setWorkspace(data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  const notify = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }, []);
  useEffect(() => {
    const initialView = new URLSearchParams(window.location.search).get('view');
    if (initialView === 'settings') setView('settings');
    void refresh();
    try {
      const saved = localStorage.getItem('mori-progress-v1');
      if (saved) {
        setProgress(parseProgress(JSON.parse(saved)));
      }
    } catch {
      notify('Saved progress could not be loaded. Your study sets are safe.');
    }
    setReady(true);
    const interval = setInterval(() => void refresh(), 15000);
    return () => clearInterval(interval);
  }, [refresh, notify]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('mori-progress-v1', JSON.stringify(progress));
      } catch {
        notify('Your browser could not save progress. Export a backup from Settings.');
      }
    }
  }, [progress, ready, notify]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!document.querySelector('[role="dialog"]')) setSearch('');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  function navigate(nextView: View) {
    setView(nextView);
    setCourseId(null);
    setFilter('all');
    setMobile(false);
  }
  function openCourse(course: Course) {
    setCourseId(course.id);
    setView('library');
    setFilter('all');
    setMobile(false);
  }
  function openMaterial(material: Material, course: Course) {
    setActiveMaterial({ material, course });
    setProgress((p) => ({ ...p, lastMaterialId: material.id }));
  }
  function complete(id: string, quiz?: { score: number; total: number }) {
    const material = workspace.courses.flatMap((c) => c.materials).find((m) => m.id === id);
    setProgress((p) => ({
      ...p,
      completed: [...new Set([...p.completed, id])],
      quizScores: quiz ? { ...p.quizScores, [id]: quiz } : p.quizScores,
      activity: {
        ...p.activity,
        [localDate()]: (p.activity[localDate()] || 0) + (p.completed.includes(id) ? 0 : 1),
      },
      studyMinutes: p.studyMinutes + (p.completed.includes(id) ? 0 : material?.duration || 0),
    }));
    notify(
      quiz ? `Quiz saved · ${quiz.score} of ${quiz.total} correct` : 'A little progress, saved.',
    );
  }
  function review(materialId: string, cardId: string) {
    setProgress((p) => ({
      ...p,
      reviewedCards: {
        ...p.reviewedCards,
        [materialId]: [...new Set([...(p.reviewedCards[materialId] || []), cardId])],
      },
    }));
  }
  async function importPack(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error('Please choose a JSON study pack smaller than 10 MB.');
      const course = JSON.parse(await file.text());
      await jsonRequest('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course),
      });
      await refresh();
      notify('Study set imported. A new idea awaits.');
    } catch (e) {
      notify(`Could not import: ${(e as Error).message}`);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  }
  const selectedCourse = workspace.courses.find((c) => c.id === courseId);
  const totalMaterials = workspace.courses.flatMap((c) => c.materials);
  const completedCount = totalMaterials.filter((m) => progress.completed.includes(m.id)).length;
  const flashcardTotal = totalMaterials.reduce((sum, m) => sum + (m.cards?.length || 0), 0);
  const reviewedTotal = totalMaterials.reduce(
    (sum, m) =>
      sum + (m.cards?.filter((c) => progress.reviewedCards[m.id]?.includes(c.id)).length || 0),
    0,
  );
  const remainingCards = Math.max(0, flashcardTotal - reviewedTotal);
  const nextCourse =
    workspace.courses.find((c) =>
      c.materials.some(
        (m) => m.id === progress.lastMaterialId && !progress.completed.includes(m.id),
      ),
    ) ||
    workspace.courses.find((c) => percent(c, progress) < 100) ||
    workspace.courses[0];
  const nextMaterial =
    nextCourse?.materials.find(
      (m) => m.id === progress.lastMaterialId && !progress.completed.includes(m.id),
    ) ||
    nextCourse?.materials.find((m) => !progress.completed.includes(m.id)) ||
    nextCourse?.materials[0];
  const flashCourse =
    workspace.courses.find((c) =>
      c.materials.some(
        (m) =>
          m.kind === 'flashcards' &&
          (progress.reviewedCards[m.id]?.length || 0) < (m.cards?.length || 0),
      ),
    ) || workspace.courses.find((c) => c.materials.some((m) => m.kind === 'flashcards'));
  const firstFlash =
    flashCourse?.materials.find(
      (m) =>
        m.kind === 'flashcards' &&
        (progress.reviewedCards[m.id]?.length || 0) < (m.cards?.length || 0),
    ) || flashCourse?.materials.find((m) => m.kind === 'flashcards');
  const pending = workspace.requests.filter((r) => r.status === 'pending');
  function setExport(course: Course) {
    setExportCourse(course);
  }

  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
        <button className="brand" onClick={() => navigate('home')} aria-label="Mori home">
          <MoriMark />
          <span>
            mori<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="space-switch">
          <div className="space-icon">
            <Leaf size={18} />
          </div>
          <div>
            <strong>My learning space</strong>
            <span>Personal workspace</span>
          </div>
          <span className="local-dot" title="Stored locally" />
        </div>
        <a className="text-button manage-back" href="/">
          ← Back to learning
        </a>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id && !courseId ? 'active' : ''}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.id === 'library' && workspace.courses.length > 0 && (
                <span className="nav-count">{workspace.courses.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="subjects-heading">
          <span className="nav-label">MY SUBJECTS</span>
          <button
            className="icon-button"
            aria-label="Add a study set"
            onClick={() => setCreate(true)}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="subject-nav">
          {workspace.courses.slice(0, 5).map((c) => (
            <button
              key={c.id}
              className={courseId === c.id ? 'active' : ''}
              onClick={() => openCourse(c)}
            >
              <span className={`subject-dot dot-${c.color}`} />
              <span>{c.subject}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="grow-card">
            <div className="grow-art">
              <Sprout size={24} />
              <span className="grow-stars">✧</span>
            </div>
            <strong>Small steps. Big ideas.</strong>
            <p>
              Your next “aha” moment
              <br />
              starts with a little curiosity.
            </p>
            <button onClick={() => setCreate(true)}>
              Create a study set <ArrowRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <HelpCircle size={18} />
            <span>How Mori works</span>
            <ExternalLink size={13} />
          </button>
          <button
            className={`profile ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <div className="avatar">Y</div>
            <div>
              <strong>Your space</strong>
              <span>
                <span className="local-dot" /> Local & private
              </span>
            </div>
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>
              {selectedCourse
                ? selectedCourse.subject
                : view === 'home'
                  ? 'Overview'
                  : view === 'library'
                    ? 'My study sets'
                    : view === 'sources'
                      ? 'Sources'
                      : view === 'progress'
                        ? 'My progress'
                        : 'Settings'}
            </strong>
          </div>
          <div className="topbar-actions">
            <button className="search-trigger" onClick={() => setSearch('')}>
              <Search size={16} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="small-avatar"
              aria-label="Open settings"
              onClick={() => navigate('settings')}
            >
              Y
            </button>
          </div>
        </header>
        <main className="main-content">
          {loading ? (
            <div className="loading-state">
              <MoriMark size={44} />
              <p>Making a little room for learning…</p>
              <LoaderCircle className="spin" size={20} />
            </div>
          ) : error ? (
            <div className="empty-state">
              <h2>Let’s reconnect to your workspace.</h2>
              <p>{error}</p>
              <button
                className="button primary"
                onClick={() => {
                  setLoading(true);
                  void refresh();
                }}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {view === 'home' && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="welcome-line">
                        <span className="sun-icon">☼</span> A GOOD DAY TO LEARN SOMETHING
                      </div>
                      <h1>
                        A little progress, every day<span className="green-period">.</span>
                      </h1>
                      <p>Pick up where you left off, or follow a new curiosity.</p>
                    </div>
                    <button className="button primary" onClick={() => setCreate(true)}>
                      <Plus size={18} /> New study set
                    </button>
                  </div>
                  <div className="overview-feature">
                    <section className="continue-card">
                      <div className="continue-copy">
                        <span className="hero-eyebrow">
                          <span />{' '}
                          {completedCount ? 'KEEP YOUR CURIOSITY GOING' : 'YOUR NEXT “AHA” MOMENT'}
                        </span>
                        <h2>
                          Big ideas.
                          <br />
                          Small steps.
                        </h2>
                        <p>
                          {nextCourse
                            ? `A fresh perspective on ${nextCourse.subject.toLowerCase()}.`
                            : 'Turn what you have into what you understand.'}
                          <br />
                          Let’s make a little sense of it all.
                        </p>
                        <button
                          className="button lime"
                          onClick={() =>
                            nextMaterial && nextCourse
                              ? openMaterial(nextMaterial, nextCourse)
                              : setCreate(true)
                          }
                        >
                          {completedCount ? 'Continue learning' : 'Let’s start learning'}{' '}
                          <ArrowRight size={18} />
                        </button>
                        <div className="hero-note">
                          <BookOpen size={13} />
                          <span>
                            {nextMaterial
                              ? `${nextMaterial.title} · ${nextMaterial.duration} min`
                              : 'Made for the way you learn'}
                          </span>
                        </div>
                      </div>
                      <HeroArt />
                    </section>
                    <section className="weekly-card">
                      <div className="weekly-heading">
                        <span>Your learning, lately</span>
                        <span className="leaf-bubble">
                          <Leaf size={17} />
                        </span>
                      </div>
                      <div className="weekly-number">
                        {completedCount}
                        <span>little steps forward</span>
                      </div>
                      <div className="week-bars">
                        {Array.from({ length: 7 }, (_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - i));
                          const count = progress.activity[localDate(d)] || 0;
                          return (
                            <div className={`week-day ${i === 6 ? 'today' : ''}`} key={i}>
                              <div className="bar-track">
                                <div
                                  style={{
                                    height: `${count ? Math.min(100, 15 + count * 20) : 6}%`,
                                  }}
                                />
                              </div>
                              <span>{d.toLocaleDateString('en', { weekday: 'narrow' })}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="weekly-footer">
                        <span className="tiny-sparkle">✦</span>{' '}
                        {completedCount
                          ? 'Look at you, showing up.'
                          : 'Every great habit starts with one.'}
                      </div>
                    </section>
                  </div>
                  <div className="section-heading">
                    <h2>
                      Your study sets <span className="count-pill">{workspace.courses.length}</span>
                    </h2>
                    <button className="text-button" onClick={() => navigate('library')}>
                      View all study sets <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="course-grid">
                    {workspace.courses.slice(0, 3).map((c) => (
                      <CourseCard
                        key={c.id}
                        course={c}
                        progress={progress}
                        onOpen={() => openCourse(c)}
                        onExport={() => setExport(c)}
                      />
                    ))}
                  </div>
                  <section className="practice-banner">
                    <div className="practice-icon">
                      <span />
                      <span />
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <span className="eyebrow">MAKE IT STICK</span>
                      <h3>A little practice goes a long way.</h3>
                      <p>
                        {remainingCards > 0
                          ? `${remainingCards} flashcards ready for a fresh look. Your future self will thank you.`
                          : 'Revisit a few ideas. Give your memory a little nudge.'}
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        firstFlash && flashCourse
                          ? openMaterial(firstFlash, flashCourse)
                          : setCreate(true)
                      }
                    >
                      Review flashcards <ArrowRight size={16} />
                    </button>
                  </section>
                  {pending.length > 0 && (
                    <PendingRequests
                      requests={pending}
                      onOpen={async (id) => {
                        try {
                          const result = await jsonRequest<{ agentPrompt: string }>(
                            `/api/requests/${id}`,
                          );
                          setPendingPrompt(result.agentPrompt);
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    />
                  )}
                  <div className="page-bottom">
                    <MoriMark size={16} />
                    <span>
                      Understanding takes a little time. You’re right where you need to be.
                    </span>
                  </div>
                </>
              )}
              {view === 'library' && !selectedCourse && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">A HOME FOR YOUR IDEAS</span>
                      <h1>
                        Your study sets<span className="green-period">.</span>
                      </h1>
                      <p>A growing collection of things you’re figuring out.</p>
                    </div>
                    <button className="button primary" onClick={() => setCreate(true)}>
                      <Plus size={18} /> New study set
                    </button>
                  </div>
                  <div className="library-toolbar">
                    <div className="search-input">
                      <Search size={17} />
                      <input
                        placeholder="Find a study set..."
                        value={libraryQuery}
                        onChange={(e) => setLibraryQuery(e.target.value)}
                        aria-label="Find a study set"
                      />
                    </div>
                    <button
                      className="button secondary small"
                      onClick={() => importRef.current?.click()}
                      disabled={importing}
                    >
                      <Upload size={16} />
                      {importing ? 'Importing…' : 'Import study pack'}
                    </button>
                  </div>
                  <div className="course-grid">
                    {workspace.courses
                      .filter((c) =>
                        `${c.title} ${c.subject}`
                          .toLowerCase()
                          .includes(libraryQuery.toLowerCase()),
                      )
                      .map((c) => (
                        <CourseCard
                          key={c.id}
                          course={c}
                          progress={progress}
                          onOpen={() => openCourse(c)}
                          onExport={() => setExport(c)}
                        />
                      ))}
                    {!libraryQuery && (
                      <button className="new-course-card" onClick={() => setCreate(true)}>
                        <span>
                          <Plus size={26} />
                        </span>
                        <h3>Follow a new curiosity</h3>
                        <p>Your next study set starts here.</p>
                      </button>
                    )}
                  </div>
                  {libraryQuery &&
                    !workspace.courses.some((c) =>
                      `${c.title} ${c.subject}`.toLowerCase().includes(libraryQuery.toLowerCase()),
                    ) && (
                      <div className="empty-state">
                        <Search size={30} />
                        <h3>No study sets found.</h3>
                        <p>Try a different subject or title.</p>
                      </div>
                    )}
                  <PendingRequests
                    requests={pending}
                    onOpen={async (id) => {
                      try {
                        const result = await jsonRequest<{ agentPrompt: string }>(
                          `/api/requests/${id}`,
                        );
                        setPendingPrompt(result.agentPrompt);
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  />
                </>
              )}
              {view === 'library' && selectedCourse && (
                <>
                  <button className="text-button back-link" onClick={() => setCourseId(null)}>
                    <ArrowLeft size={15} /> All study sets
                  </button>
                  <div className={`course-hero theme-${selectedCourse.color}`}>
                    <div>
                      <span className="eyebrow">
                        {selectedCourse.subject} · {selectedCourse.chapters}
                      </span>
                      <h1>{selectedCourse.title}</h1>
                      <p>{selectedCourse.description}</p>
                      <div className="course-hero-meta">
                        <span>
                          <BookOpen size={15} />
                          {selectedCourse.materials.length} materials
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {selectedCourse.materials.reduce((s, m) => s + m.duration, 0)} min of
                          discovery
                        </span>
                        <span>
                          <FileText size={15} />
                          {selectedCourse.sourceIds.length} sources
                        </span>
                      </div>
                    </div>
                    <SubjectArt kind={selectedCourse.icon} large />
                  </div>
                  <div className="course-study-toolbar">
                    <div>
                      <span className="eyebrow">YOUR PROGRESS</span>
                      <div className="course-progress">
                        <div className="progress-bar">
                          <span style={{ width: `${percent(selectedCourse, progress)}%` }} />
                        </div>
                        <strong>{percent(selectedCourse, progress)}%</strong>
                      </div>
                    </div>
                    <button
                      className="button secondary small"
                      onClick={() => setExport(selectedCourse)}
                    >
                      <Download size={16} /> Export study set
                    </button>
                  </div>
                  <div className="material-tabs">
                    {(
                      [
                        'all',
                        'lesson',
                        'slides',
                        'quiz',
                        'practice',
                        'flashcards',
                        'video',
                      ] as const
                    )
                      .filter(
                        (k) => k === 'all' || selectedCourse.materials.some((m) => m.kind === k),
                      )
                      .map((k) => (
                        <button
                          key={k}
                          aria-pressed={filter === k}
                          className={filter === k ? 'active' : ''}
                          onClick={() => setFilter(k)}
                        >
                          {k === 'all' ? (
                            'All materials'
                          ) : (
                            <>
                              <KindIcon kind={k} size={15} />
                              {kindLabels[k]}
                            </>
                          )}
                          <span>
                            {
                              selectedCourse.materials.filter((m) => k === 'all' || m.kind === k)
                                .length
                            }
                          </span>
                        </button>
                      ))}
                  </div>
                  <div className="materials-list">
                    {selectedCourse.materials
                      .filter((m) => filter === 'all' || m.kind === filter)
                      .map((m, i) => (
                        <button
                          key={m.id}
                          className="material-row"
                          onClick={() => openMaterial(m, selectedCourse)}
                        >
                          <span className={`material-kind kind-${m.kind}`}>
                            <KindIcon kind={m.kind} size={21} />
                          </span>
                          <div className="material-info">
                            <span className="eyebrow">
                              {m.section} · {kindLabels[m.kind]}
                            </span>
                            <h3>{m.title}</h3>
                            <p>{m.description}</p>
                          </div>
                          <span className="material-time">{m.duration} min</span>
                          {progress.completed.includes(m.id) ? (
                            <CheckCircle2 size={21} className="complete-check" />
                          ) : (
                            <ChevronRight size={19} />
                          )}
                        </button>
                      ))}
                  </div>
                  <div className="course-sources">
                    <h3>
                      <FileText size={17} /> Behind this study set
                    </h3>
                    {selectedCourse.sourceIds.map((id) => {
                      const source = workspace.sources.find((s) => s.id === id);
                      return source ? (
                        <a key={id} href={source.url} target="_blank" rel="noreferrer">
                          {source.name}
                          <ExternalLink size={14} />
                        </a>
                      ) : null;
                    })}
                  </div>
                </>
              )}
              {view === 'sources' && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">GOOD LEARNING STARTS HERE</span>
                      <h1>
                        Your source of inspiration<span className="green-period">.</span>
                      </h1>
                      <p>Textbooks, notes, slides. All the pieces, in one place.</p>
                    </div>
                    <button className="button primary" onClick={() => setUpload(true)}>
                      <Plus size={18} /> Add sources
                    </button>
                  </div>
                  <div className="source-info-banner">
                    <span className="source-banner-icon">
                      <FolderOpen size={26} />
                    </span>
                    <div>
                      <h3>Bring what you’re learning from.</h3>
                      <p>
                        Add a PDF, photo, presentation, or your own notes. Your agent takes it from
                        there.
                      </p>
                    </div>
                    <span className="local-badge">
                      <span className="local-dot" /> Stored on your device
                    </span>
                  </div>
                  <div className="section-heading">
                    <h2>
                      All sources <span className="count-pill">{workspace.sources.length}</span>
                    </h2>
                  </div>
                  <div className="sources-table">
                    <div className="source-table-head">
                      <span>NAME</span>
                      <span>TYPE</span>
                      <span>SIZE</span>
                      <span />
                    </div>
                    {workspace.sources.map((source) => (
                      <a
                        className="source-table-row"
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="source-name">
                          <span className={`file-type-icon ${source.type}`}>
                            <FileText size={21} />
                          </span>
                          <span>
                            <strong>{source.name}</strong>
                            <small>
                              {new Date(source.createdAt).toLocaleDateString('en', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </small>
                          </span>
                        </span>
                        <span className="file-type-tag">{source.type}</span>
                        <span className="muted">
                          {source.size >= 1024 * 1024
                            ? `${(source.size / 1024 / 1024).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(source.size / 1024))} KB`}
                        </span>
                        <ExternalLink size={16} />
                      </a>
                    ))}
                  </div>
                  <button className="add-source-row" onClick={() => setUpload(true)}>
                    <Plus size={18} /> Add another source
                  </button>
                  <p className="source-footnote">
                    The included example notes are original learning materials. Add your own sources
                    to make Mori yours.
                  </p>
                </>
              )}
              {view === 'progress' && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">LOOK HOW FAR YOU’RE GOING</span>
                      <h1>
                        It all adds up<span className="green-period">.</span>
                      </h1>
                      <p>Every lesson, every question, every small moment of understanding.</p>
                    </div>
                    <span className="local-badge">
                      <span className="local-dot" /> Saved in this browser
                    </span>
                  </div>
                  <div className="stats-grid">
                    <StatCard
                      icon={<BookOpen />}
                      value={completedCount}
                      label="Materials completed"
                      description={`of ${totalMaterials.length} in your space`}
                    />
                    <StatCard
                      icon={<GraduationCap />}
                      value={Object.keys(progress.quizScores).length}
                      label="Quizzes practiced"
                      description={
                        Object.keys(progress.quizScores).length
                          ? `${Math.round((Object.values(progress.quizScores).reduce((s, q) => s + q.score / q.total, 0) / Object.keys(progress.quizScores).length) * 100)}% average score`
                          : 'Your first “I knew that” awaits'
                      }
                    />
                    <StatCard
                      icon={<CheckCircle2 />}
                      value={reviewedTotal}
                      label="Flashcards understood"
                      description={`of ${flashcardTotal} ideas to make stick`}
                    />
                    <StatCard
                      icon={<Clock3 />}
                      value={progress.studyMinutes}
                      label="Minutes of material"
                      description="Completed material’s estimated time"
                    />
                  </div>
                  <div className="progress-panel">
                    <div className="section-heading">
                      <h2>A little momentum</h2>
                      <span className="muted">Last 28 days</span>
                    </div>
                    <div className="activity-grid">
                      {Array.from({ length: 28 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - 27 + i);
                        const date = localDate(d);
                        const count = progress.activity[date] || 0;
                        return (
                          <div
                            key={i}
                            className={`activity-day ${count ? 'has-activity' : ''}`}
                            title={`${date}: ${count} materials completed`}
                          >
                            <span>{d.getDate()}</span>
                            <i style={{ opacity: count ? Math.min(1, 0.35 + count * 0.2) : 1 }} />
                          </div>
                        );
                      })}
                    </div>
                    <p className="muted">
                      {completedCount
                        ? 'Keep making space for your curiosity.'
                        : 'Complete your first material to plant a little progress here.'}
                    </p>
                  </div>
                  <div className="section-heading">
                    <h2>Growing understanding</h2>
                  </div>
                  <div className="progress-courses">
                    {workspace.courses.map((c) => (
                      <button key={c.id} className="progress-course" onClick={() => openCourse(c)}>
                        <span className={`subject-dot dot-${c.color}`} />
                        <div>
                          <h3>{c.title}</h3>
                          <p>
                            {c.materials.filter((m) => progress.completed.includes(m.id)).length} of{' '}
                            {c.materials.length} materials completed
                          </p>
                        </div>
                        <div className="progress-bar">
                          <span style={{ width: `${percent(c, progress)}%` }} />
                        </div>
                        <strong>{percent(c, progress)}%</strong>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {view === 'settings' && (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
                      <h1>
                        Your space, your way<span className="green-period">.</span>
                      </h1>
                      <p>Simple, open, and yours to keep.</p>
                    </div>
                  </div>
                  <div className="settings-panel">
                    <h2>
                      <Leaf size={21} /> Local by nature
                    </h2>
                    <p>
                      Your sources and study sets are stored in this project’s data folder. Learning
                      progress is saved in this browser. No account, tracking, or extra AI
                      subscription required.
                    </p>
                    <div className="setting-row">
                      <div>
                        <strong>Back up your progress</strong>
                        <p>Keep completed lessons, quiz scores, and reviewed cards.</p>
                      </div>
                      <button
                        className="button secondary small"
                        onClick={() =>
                          download(
                            'mori-progress.json',
                            JSON.stringify({ version: 1, progress }, null, 2),
                          )
                        }
                      >
                        <Download size={16} /> Export backup
                      </button>
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>Restore your progress</strong>
                        <p>Load a Mori progress backup on this browser.</p>
                      </div>
                      <button
                        className="button secondary small"
                        onClick={() => backupRef.current?.click()}
                      >
                        <Upload size={16} /> Restore backup
                      </button>
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>Import an agent’s study pack</strong>
                        <p>Upload a validated Mori course JSON file.</p>
                      </div>
                      <button
                        className="button secondary small"
                        disabled={importing}
                        onClick={() => importRef.current?.click()}
                      >
                        <Plus size={16} /> Import study pack
                      </button>
                    </div>
                  </div>
                  <div className="settings-panel">
                    <h2>
                      <Code2 size={21} /> Made for your agent
                    </h2>
                    <p>
                      Install Mori into your agent, then describe what you want to learn. The skill
                      handles reading sources, creating materials, and opening your portal.
                    </p>
                    <div className="install-command">
                      <code>npm run mori-study -- install --agent all</code>
                      <button
                        className="icon-button"
                        aria-label="Copy install command"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText('npm run mori-study -- install --agent all')
                            .then(() => notify('Install command copied'))
                            .catch(() => notify('Copy the command shown above'));
                        }}
                      >
                        <Copy size={17} />
                      </button>
                    </div>
                    <p className="muted">
                      Run from the Mori project directory. Supports Codex and Claude Code project
                      skills.
                    </p>
                    <button className="text-button" onClick={() => setHelp(true)}>
                      See how it works <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="open-source-note">
                    <MoriMark size={27} />
                    <div>
                      <strong>Mori Study · Open source, open possibilities.</strong>
                      <p>MIT licensed. A calmer place to turn information into understanding.</p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={importRef}
        onChange={(e) => void importPack(e.target.files?.[0])}
      />
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={backupRef}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 5e6) throw new Error('Backup is too large');
            const value = JSON.parse(await file.text());
            if (value.version !== 1) throw new Error('This is not a valid Mori progress backup');
            setProgress(parseProgress(value.progress));
            notify('Progress restored');
          } catch (err) {
            notify((err as Error).message);
          }
          e.target.value = '';
        }}
      />
      {create && (
        <CreateDialog
          sources={workspace.sources}
          onClose={() => setCreate(false)}
          onRefresh={refresh}
          onToast={notify}
        />
      )}
      {upload && <SourceUploadDialog onClose={() => setUpload(false)} onRefresh={refresh} />}
      {activeMaterial && (
        <StudyViewer
          key={activeMaterial.material.id}
          {...activeMaterial}
          sources={workspace.sources}
          progress={progress}
          onClose={() => setActiveMaterial(null)}
          onComplete={complete}
          onReview={review}
          onNext={(material) => openMaterial(material, activeMaterial.course)}
        />
      )}
      {exportCourse && (
        <Modal title="Take your learning with you" onClose={() => setExportCourse(null)}>
          <div className="export-options">
            <h2>{exportCourse.title}</h2>
            <p className="muted">Your material, in a format that works for you.</p>
            <button
              disabled={deckBusy}
              onClick={async () => {
                setDeckBusy(true);
                try {
                  await downloadSlideDeck(exportCourse.id);
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
                download(`${exportCourse.id}.json`, JSON.stringify(exportCourse, null, 2));
                notify('Study pack exported');
              }}
            >
              <span>
                <Code2 size={23} />
              </span>
              <div>
                <strong>Mori Study pack</strong>
                <p>Course JSON · original source IDs required on import</p>
              </div>
              <Download size={18} />
            </button>
            <button
              onClick={() => {
                download(`${exportCourse.id}.md`, courseMarkdown(exportCourse), 'text/markdown');
                notify('Markdown exported');
              }}
            >
              <span>
                <FileText size={23} />
              </span>
              <div>
                <strong>Markdown notes</strong>
                <p>Lessons, slides, questions, answers, and citations</p>
              </div>
              <Download size={18} />
            </button>
            {exportCourse.materials.some((m) => m.cards?.length) && (
              <button
                onClick={() => {
                  exportCards(exportCourse);
                  notify('Flashcards exported');
                }}
              >
                <span>
                  <Library size={23} />
                </span>
                <div>
                  <strong>Flashcard CSV</strong>
                  <p>Front and back · ready for Anki or a spreadsheet</p>
                </div>
                <Download size={18} />
              </button>
            )}
            <button
              onClick={() => {
                setExportCourse(null);
                setCourseId(exportCourse.id);
                setView('library');
                setTimeout(() => window.print(), 200);
              }}
            >
              <span>
                <ArrowDownToLine size={23} />
              </span>
              <div>
                <strong>Print / Save as PDF</strong>
                <p>A printable copy of the complete study set</p>
              </div>
              <Download size={18} />
            </button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="A little guide to Mori Study" onClose={() => setHelp(false)}>
          <div className="help-content">
            <span className="help-brand">
              <MoriMark size={46} />
            </span>
            <h2>From “what?” to “got it.”</h2>
            <p>
              Mori Study gives your AI agent a place to turn your sources into a study experience.
            </p>
            {[
              {
                n: '01',
                title: 'Bring something to learn.',
                body: 'Add a textbook PDF, a photo, class slides, or your own notes.',
              },
              {
                n: '02',
                title: 'Tell your agent what you need.',
                body: 'Choose the chapters and formats. Copy your study request into Claude Code, Codex, or another agent using the Mori skill.',
              },
              {
                n: '03',
                title: 'Make it make sense.',
                body: 'Your agent imports a source-grounded study set. Learn, practice, track your progress, and export anything you want to keep.',
              },
            ].map((step) => (
              <div className="help-step" key={step.n}>
                <span>{step.n}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
            <div className="notice">
              The included study sets are examples. Your real materials are made by your agent,
              using the sources you choose.
            </div>
            <button
              className="button primary full"
              onClick={() => {
                setHelp(false);
                setCreate(true);
              }}
            >
              Let’s learn something <ArrowRight size={17} />
            </button>
          </div>
        </Modal>
      )}
      {pendingPrompt && (
        <Modal title="Ready for your agent" onClose={() => setPendingPrompt('')}>
          <div className="create-body">
            <h2>Your study request</h2>
            <p className="muted">Paste this into your agent with the Mori skill installed.</p>
            <div className="handoff-code">
              <pre>{pendingPrompt}</pre>
            </div>
            <button
              className="button primary full"
              onClick={() =>
                void navigator.clipboard
                  .writeText(pendingPrompt)
                  .then(() => notify('Agent prompt copied'))
                  .catch(() => notify('Select and copy the prompt above'))
              }
            >
              <Copy size={16} /> Copy agent prompt
            </button>
          </div>
        </Modal>
      )}
      {search !== null && (
        <Modal title="Find a little clarity" onClose={() => setSearch(null)}>
          <div className="global-search">
            <div className="search-input">
              <Search size={20} />
              <input
                aria-label="Search your workspace"
                autoFocus
                placeholder="A topic, a lesson, an idea…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="eyebrow">
              {search ? 'FOUND IN YOUR SPACE' : 'EXPLORE YOUR STUDY SETS'}
            </span>
            {workspace.courses
              .filter(
                (c) =>
                  !search || `${c.title} ${c.subject}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((c) => (
                <button
                  className="search-result"
                  key={c.id}
                  onClick={() => {
                    setSearch(null);
                    openCourse(c);
                  }}
                >
                  <span className={`subject-dot dot-${c.color}`} />
                  <div>
                    <strong>{c.title}</strong>
                    <span>{c.subject} · Study set</span>
                  </div>
                  <ArrowRight size={16} />
                </button>
              ))}
            {search &&
              workspace.courses.flatMap((c) =>
                c.materials
                  .filter((m) =>
                    `${m.title} ${m.description} ${m.section}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((m) => (
                    <button
                      key={m.id}
                      className="search-result"
                      onClick={() => {
                        setSearch(null);
                        openMaterial(m, c);
                      }}
                    >
                      <KindIcon kind={m.kind} />
                      <div>
                        <strong>{m.title}</strong>
                        <span>
                          {c.subject} · {kindLabels[m.kind]}
                        </span>
                      </div>
                      <ArrowRight size={16} />
                    </button>
                  )),
              )}
            {search &&
              !workspace.courses.some(
                (c) =>
                  `${c.title} ${c.subject}`.toLowerCase().includes(search.toLowerCase()) ||
                  c.materials.some((m) =>
                    `${m.title} ${m.description} ${m.section}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  ),
              ) && <p className="empty-inline">No matches yet. Try another idea.</p>}
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {selectedCourse && <PrintCourse course={selectedCourse} />}
    </div>
  );
}

function CourseCard({
  course,
  progress,
  onOpen,
  onExport,
}: {
  course: Course;
  progress: Progress;
  onOpen: () => void;
  onExport: () => void;
}) {
  const value = percent(course, progress);
  return (
    <article className="course-card">
      <button
        className={`course-cover theme-${course.color}`}
        onClick={onOpen}
        aria-label={`Open ${course.title}`}
      >
        <span className="subject-chip">{course.subject}</span>
        <SubjectArt kind={course.icon} />
        <span className="cover-bottom">
          {course.chapters}
          <ArrowRight size={15} />
        </span>
      </button>
      <div className="course-card-body">
        <div className="course-title-row">
          <button className="course-title" onClick={onOpen}>
            <h3>{course.title}</h3>
          </button>
          <button className="icon-button" aria-label={`Export ${course.title}`} onClick={onExport}>
            <MoreHorizontal size={19} />
          </button>
        </div>
        <p>{course.description}</p>
        <div className="course-kind-list">
          {(['lesson', 'slides', 'quiz', 'practice', 'flashcards', 'video'] as const)
            .filter((k) => course.materials.some((m) => m.kind === k))
            .slice(0, 3)
            .map((k) => (
              <span key={k}>
                <KindIcon kind={k} size={13} />
                {course.materials.filter((m) => m.kind === k).length}{' '}
                {k === 'lesson'
                  ? course.materials.filter((m) => m.kind === k).length === 1
                    ? 'lesson'
                    : 'lessons'
                  : k === 'quiz'
                    ? course.materials.filter((m) => m.kind === k).length === 1
                      ? 'quiz'
                      : 'quizzes'
                    : kindLabels[k].toLowerCase()}
              </span>
            ))}
        </div>
        <div className="course-card-progress">
          <div className="progress-bar">
            <span style={{ width: `${value}%` }} />
          </div>
          <span>{value}%</span>
        </div>
        <div className="course-card-footer">
          <span>
            {value === 0
              ? 'A fresh start awaits'
              : value === 100
                ? 'A little wiser already'
                : 'Your curiosity is growing'}
          </span>
          <span>{course.materials.length} materials</span>
        </div>
      </div>
    </article>
  );
}
function StatCard({
  icon,
  value,
  label,
  description,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  description: string;
}) {
  return (
    <div className="stat-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <h3>{label}</h3>
      <p>{description}</p>
    </div>
  );
}
function PendingRequests({
  requests,
  onOpen,
}: {
  requests: Workspace['requests'];
  onOpen: (id: string) => void;
}) {
  return requests.length ? (
    <section className="pending-requests">
      <div className="section-heading">
        <h2>
          Ideas in the making <span className="count-pill">{requests.length}</span>
        </h2>
      </div>
      {requests.map((request) => (
        <button className="pending-request" key={request.id} onClick={() => onOpen(request.id)}>
          <span className="request-icon">
            <Sparkles size={19} />
          </span>
          <div>
            <strong>{request.title}</strong>
            <p>
              {request.scope} · {request.formats.map((f) => kindLabels[f]).join(', ')}
            </p>
          </div>
          <span className="waiting-badge">Waiting for your agent</span>
          <ChevronRight size={17} />
        </button>
      ))}
    </section>
  ) : null;
}

import { Markdown } from './ui';
function PrintCourse({ course }: { course: Course }) {
  return (
    <div className="print-course">
      <h1>{course.title}</h1>
      <p>{course.description}</p>
      <Markdown>{courseMarkdown(course)}</Markdown>
    </div>
  );
}
