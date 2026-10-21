'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { Course, Material, Progress, Source } from '@/lib/types';
import { download, kindLabels, materialMarkdown } from '@/lib/client-utils';
import { KindIcon, Markdown, Modal } from './ui';
import { PracticePlayer } from './practice-player';

type Props = {
  material: Material;
  course: Course;
  sources: Source[];
  progress: Progress;
  onClose: () => void;
  onComplete: (id: string, score?: { score: number; total: number }) => void;
  onReview: (materialId: string, cardId: string) => void;
  onNext: (material: Material) => void;
  embedded?: boolean;
};

type StudySession = {
  slide: number;
  question: number;
  choice: number | null;
  checked: boolean;
  score: number;
  finished: boolean;
  card: number;
  flipped: boolean;
  sessionKnown: string[];
};

function emptySession(): StudySession {
  return {
    slide: 0,
    question: 0,
    choice: null,
    checked: false,
    score: 0,
    finished: false,
    card: 0,
    flipped: false,
    sessionKnown: [],
  };
}

function restoreSession(raw: unknown, material: Material): StudySession {
  const session = emptySession();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return session;
  const saved = raw as Record<string, unknown>;
  if (saved.version !== 1 || saved.kind !== material.kind) return session;
  const validIndex = (value: unknown, length: number): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;
  const slides = material.slides || [];
  const questions = material.questions || [];
  const cards = material.cards || [];
  if (validIndex(saved.slide, slides.length)) session.slide = saved.slide;
  if (validIndex(saved.question, questions.length)) {
    session.question = saved.question;
    if (validIndex(saved.choice, questions[session.question].options.length))
      session.choice = saved.choice;
    session.checked = saved.checked === true && session.choice !== null;
    const finished =
      saved.finished === true && session.question === questions.length - 1 && session.checked;
    const maxScore =
      session.question +
      (finished && session.choice === questions[session.question].answer ? 1 : 0);
    const minScore = finished && session.choice === questions[session.question].answer ? 1 : 0;
    if (
      typeof saved.score === 'number' &&
      Number.isInteger(saved.score) &&
      saved.score >= minScore &&
      saved.score <= maxScore
    ) {
      session.score = saved.score;
      session.finished = finished;
    } else {
      // A score inconsistent with the saved question cannot resume reliably.
      session.question = 0;
      session.choice = null;
      session.checked = false;
    }
  }
  if (material.kind === 'flashcards' && cards.length) {
    const cardIds = new Set(cards.map((item) => item.id));
    session.sessionKnown = Array.isArray(saved.sessionKnown)
      ? [
          ...new Set(
            saved.sessionKnown.filter(
              (id): id is string => typeof id === 'string' && cardIds.has(id),
            ),
          ),
        ]
      : [];
    session.card = validIndex(saved.card, cards.length) ? saved.card : 0;
    session.finished = session.sessionKnown.length === cards.length;
    if (!session.finished && session.sessionKnown.includes(cards[session.card].id)) {
      session.card = cards.findIndex((item) => !session.sessionKnown.includes(item.id));
    }
    session.flipped = saved.flipped === true;
  }
  return session;
}

export function StudyViewer(props: Props) {
  // Each material owns its saved session, even if its parent reuses this component.
  return <StudyViewerSession key={props.material.id} {...props} />;
}

function StudyViewerSession({
  material,
  course,
  sources,
  progress,
  onClose,
  onComplete,
  onReview,
  onNext,
  embedded = false,
}: Props) {
  const [slide, setSlide] = useState(0);
  const [question, setQuestion] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionKnown, setSessionKnown] = useState<string[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'unavailable'>('loading');
  const slides = material.slides || [];
  const questions = material.questions || [];
  const cards = material.cards || [];
  const materialIndex = course.materials.findIndex((m) => m.id === material.id);
  const next = course.materials[materialIndex + 1];
  const reviewLesson = course.materials
    .slice(0, materialIndex)
    .reverse()
    .find((item) => item.kind === 'lesson' || item.kind === 'slides');
  const nextLabel =
    next?.kind === 'quiz'
      ? 'Check this topic'
      : next?.kind === 'practice'
        ? 'Try it yourself'
        : next?.kind === 'flashcards'
          ? 'Review flashcards'
          : next?.kind === 'video'
            ? 'Watch explanation'
            : 'Next lesson';
  const isComplete = progress.completed.includes(material.id);
  useEffect(() => {
    let restored = emptySession();
    try {
      const saved = localStorage.getItem(`mori-study-session:${material.id}`);
      if (saved && saved.length <= 100_000) restored = restoreSession(JSON.parse(saved), material);
    } catch {
      setSaveState('unavailable');
    }
    setSlide(restored.slide);
    setQuestion(restored.question);
    setChoice(restored.choice);
    setChecked(restored.checked);
    setScore(restored.score);
    setFinished(restored.finished);
    setCard(restored.card);
    setFlipped(restored.flipped);
    setSessionKnown(restored.sessionKnown);
    setSessionReady(true);
    // The keyed inner component remounts when the material changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!sessionReady) return;
    try {
      localStorage.setItem(
        `mori-study-session:${material.id}`,
        JSON.stringify({
          version: 1,
          kind: material.kind,
          slide,
          question,
          choice,
          checked,
          score,
          finished,
          card,
          flipped,
          sessionKnown,
        }),
      );
      setSaveState('saved');
    } catch {
      setSaveState('unavailable');
    }
  }, [
    sessionReady,
    material.id,
    material.kind,
    slide,
    question,
    choice,
    checked,
    score,
    finished,
    card,
    flipped,
    sessionKnown,
  ]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches('input,textarea,select')) return;
      if (material.kind === 'slides') {
        if (e.key === 'ArrowRight') setSlide((s) => Math.min(s + 1, slides.length - 1));
        if (e.key === 'ArrowLeft') setSlide((s) => Math.max(s - 1, 0));
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [material.kind, slides.length]);
  function finishQuiz() {
    const total = score + (choice === questions[question].answer ? 1 : 0);
    setScore(total);
    setFinished(true);
    onComplete(material.id, { score: total, total: questions.length });
  }
  function review(known: boolean) {
    const id = cards[card].id;
    const learned = known ? [...new Set([...sessionKnown, id])] : sessionKnown;
    if (known) {
      setSessionKnown(learned);
      onReview(material.id, id);
    }
    if (learned.length === cards.length) {
      setFinished(true);
      onComplete(material.id);
      return;
    }
    let nextCard = (card + 1) % cards.length;
    while (learned.includes(cards[nextCard].id)) nextCard = (nextCard + 1) % cards.length;
    setCard(nextCard);
    setFlipped(false);
  }
  const content = (
    <div className="viewer-content">
      <div className="viewer-heading">
        <div>
          <span className="eyebrow">
            <KindIcon kind={material.kind} />
            {material.section} · {material.duration} min
          </span>
          <h2>{material.title}</h2>
          <p>{material.description}</p>
          {material.kind !== 'practice' && (
            <span className="session-save-status muted" role="status">
              {saveState === 'loading'
                ? 'Restoring your place…'
                : saveState === 'saved'
                  ? 'Saved on this device'
                  : 'Your place could not be saved in this browser'}
            </span>
          )}
        </div>
        <button
          className="icon-button bordered"
          title="Export as Markdown"
          aria-label="Export material as Markdown"
          onClick={() => download(`${material.id}.md`, materialMarkdown(material), 'text/markdown')}
        >
          <Download size={18} />
        </button>
      </div>
      {material.kind === 'lesson' && (
        <div className="lesson-body">
          <Markdown>{material.content || ''}</Markdown>
        </div>
      )}
      {material.kind === 'slides' && slides.length > 0 && (
        <div className="slide-viewer">
          <div
            className={`slide-canvas theme-${course.color} ${slides[slide].image ? 'has-image' : ''}`}
          >
            <div className="slide-kicker">
              MORI STUDY{' '}
              <span>
                {String(slide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>
            <div className="slide-copy">
              <h3>{slides[slide].title}</h3>
              <Markdown>{slides[slide].body}</Markdown>
              {slides[slide].formula && (
                <Markdown className="slide-formula">{`$$\n${slides[slide].formula}\n$$`}</Markdown>
              )}
              {slides[slide].bullets && (
                <ul>
                  {slides[slide].bullets?.map((b, i) => (
                    <li key={i}>
                      <Markdown>{b}</Markdown>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {slides[slide].image && (
              <figure className="slide-illustration">
                <img src={slides[slide].image!.src} alt={slides[slide].image!.alt} />
                {slides[slide].image!.caption && (
                  <figcaption>{slides[slide].image!.caption}</figcaption>
                )}
              </figure>
            )}
            <span className="slide-footer">
              {course.subject} <span>{material.section}</span>
            </span>
          </div>
          <div className="slide-controls">
            <button
              className="button secondary small"
              disabled={slide === 0}
              onClick={() => setSlide((s) => s - 1)}
            >
              <ChevronLeft size={17} /> Previous
            </button>
            <div className="slide-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-current={i === slide ? 'step' : undefined}
                  className={i === slide ? 'selected' : ''}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>
            <button
              className="button secondary small"
              disabled={slide === slides.length - 1}
              onClick={() => setSlide((s) => s + 1)}
            >
              Next <ChevronRight size={17} />
            </button>
          </div>
          {slides[slide].notes && (
            <div className="speaker-notes">
              <span className="eyebrow">A LITTLE MORE CONTEXT</span>
              <Markdown>{slides[slide].notes!}</Markdown>
            </div>
          )}
        </div>
      )}
      {material.kind === 'quiz' &&
        questions.length > 0 &&
        (finished ? (
          <div className="result-panel">
            <div className="result-icon">
              <Sparkles size={32} />
            </div>
            <span className="eyebrow">PRACTICE MAKES PROGRESS</span>
            <h3>{score === questions.length ? 'You’ve got this.' : 'A little clearer already.'}</h3>
            <p>
              You answered{' '}
              <strong>
                {score} of {questions.length}
              </strong>{' '}
              questions correctly.
            </p>
            <p className="muted">
              {score === questions.length
                ? 'Your understanding is taking root. Keep going!'
                : 'Every answer is a chance to learn. Review the lesson, then give it another go.'}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setQuestion(0);
                setScore(0);
                setChoice(null);
                setChecked(false);
                setFinished(false);
              }}
            >
              <RotateCcw size={16} /> Try again
            </button>
            {reviewLesson && (
              <button className="button secondary" onClick={() => onNext(reviewLesson)}>
                <BookOpen size={16} /> Review lesson
              </button>
            )}
          </div>
        ) : (
          <div className="quiz-panel">
            <div className="question-status">
              <span>
                Question {question + 1} of {questions.length}
              </span>
              <span>No timer. Take your time.</span>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${(question / questions.length) * 100}%` }} />
            </div>
            <Markdown className="question-title">{questions[question].prompt}</Markdown>
            <div className="answer-options">
              {questions[question].options.map((option, i) => (
                <button
                  key={i}
                  aria-pressed={choice === i}
                  className={`answer-option ${choice === i ? 'chosen' : ''} ${checked && i === questions[question].answer ? 'correct' : ''} ${checked && choice === i && i !== questions[question].answer ? 'incorrect' : ''}`}
                  disabled={checked}
                  onClick={() => setChoice(i)}
                >
                  <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                  <Markdown>{option}</Markdown>
                  {checked && i === questions[question].answer && <CheckCircle2 size={20} />}
                </button>
              ))}
            </div>
            {checked && (
              <div
                className={`answer-explanation ${choice === questions[question].answer ? 'right' : ''}`}
                role="status"
              >
                <strong>
                  {choice === questions[question].answer ? 'Exactly right.' : 'Let’s unpack that.'}
                </strong>
                <Markdown>{questions[question].explanation}</Markdown>
              </div>
            )}
            <div className="quiz-action">
              {!checked ? (
                <button
                  className="button primary"
                  disabled={choice === null}
                  onClick={() => setChecked(true)}
                >
                  Check answer <Check size={16} />
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() => {
                    if (question === questions.length - 1) finishQuiz();
                    else {
                      setScore((s) => s + (choice === questions[question].answer ? 1 : 0));
                      setQuestion((q) => q + 1);
                      setChoice(null);
                      setChecked(false);
                    }
                  }}
                >
                  {question === questions.length - 1 ? 'See results' : 'Next question'}{' '}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </div>
        ))}
      {material.kind === 'flashcards' &&
        cards.length > 0 &&
        (finished ? (
          <div className="result-panel">
            <div className="result-icon">
              <Check size={32} />
            </div>
            <h3>A little knowledge, planted.</h3>
            <p>You reviewed all {cards.length} flashcards. Come back tomorrow to help it stick.</p>
            <button
              className="button secondary"
              onClick={() => {
                setFinished(false);
                setSessionKnown([]);
                setCard(0);
                setFlipped(false);
              }}
            >
              <RotateCcw size={16} /> Review again
            </button>
          </div>
        ) : (
          <div className="flashcards-panel">
            <div className="question-status">
              <span>
                {sessionKnown.length} of {cards.length} understood
              </span>
              <span>Active recall, one idea at a time.</span>
            </div>
            <button
              className={`flashcard ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped(!flipped)}
              aria-label={flipped ? 'Show question' : 'Reveal answer'}
              aria-pressed={flipped}
            >
              <span className="eyebrow">{flipped ? 'THE ANSWER' : 'THINK IT THROUGH'}</span>
              <Markdown>{flipped ? cards[card].back : cards[card].front}</Markdown>
              <span className="flip-hint">
                <RotateCcw size={14} />
                {flipped ? 'Click to see the question' : 'Click to reveal the answer'}
              </span>
            </button>
            {flipped ? (
              <div className="flashcard-actions">
                <button className="button secondary" onClick={() => review(false)}>
                  <RotateCcw size={16} /> Study again
                </button>
                <button className="button primary" onClick={() => review(true)}>
                  <Check size={16} /> Got it
                </button>
              </div>
            ) : (
              <p className="flashcard-tip">Try saying your answer out loud before you flip.</p>
            )}
          </div>
        ))}
      {material.kind === 'practice' && (
        <PracticePlayer material={material} onComplete={onComplete} />
      )}
      {material.kind === 'video' && (
        <div className="video-panel">
          {material.videoUrl ? (
            <video
              controls
              preload="metadata"
              src={material.videoUrl}
              onEnded={() => onComplete(material.id)}
              aria-label={material.title}
            />
          ) : (
            <div className="empty-inline">
              This video has not been rendered yet. Ask your agent to render the HyperFrames
              composition.
            </div>
          )}
          {material.transcript && (
            <details>
              <summary>Read the transcript</summary>
              <Markdown>{material.transcript}</Markdown>
            </details>
          )}
        </div>
      )}
      <div className="source-citations">
        <span className="eyebrow">GROUNDED IN YOUR SOURCES</span>
        {material.citations.map((citation, i) => {
          const source = sources.find((s) => s.id === citation.sourceId);
          return (
            <a key={i} href={source?.url || '#'} target="_blank" rel="noreferrer">
              <ExternalLink size={13} />
              {citation.label}
              {citation.section && ` · ${citation.section}`}
              {citation.page && ` · p. ${citation.page}`}
            </a>
          );
        })}
      </div>
      <div className="viewer-footer">
        <button className="text-button" onClick={onClose}>
          <ArrowLeft size={15} /> {embedded ? 'Practice' : 'Back to study space'}
        </button>
        {(material.kind === 'lesson' ||
          (material.kind === 'slides' && slide === slides.length - 1)) &&
          !isComplete && (
            <button className="button primary" onClick={() => onComplete(material.id)}>
              <Check size={17} /> Mark complete
            </button>
          )}
        {embedded && next ? (
          <button className="button primary" onClick={() => onNext(next)}>
            {nextLabel}
            <ArrowRight size={17} />
          </button>
        ) : (
          isComplete && (
            <button className="button primary" onClick={() => (next ? onNext(next) : onClose())}>
              {next ? 'Keep learning' : embedded ? 'More practice' : 'Back to study space'}
              <ArrowRight size={17} />
            </button>
          )
        )}
      </div>
    </div>
  );
  return embedded ? (
    <section className="embedded-viewer" aria-label={material.title}>
      {content}
    </section>
  ) : (
    <Modal title={`${course.title} / ${kindLabels[material.kind]}`} onClose={onClose} wide>
      {content}
    </Modal>
  );
}
