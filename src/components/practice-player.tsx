'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
  PencilLine,
  RotateCcw,
} from 'lucide-react';
import type { Material, PracticeProblem } from '@/lib/types';
import { Markdown } from './ui';
import './practice-player.css';

export type PracticePlayerProps = {
  material: Material;
  onComplete: (materialId: string) => void;
};

type Attempt = {
  draft: string;
  hintOpen: boolean;
  solutionOpen: boolean;
  selfCheck: 'unseen' | 'retry' | 'understood';
};

type Session = {
  version: 1;
  revision: string;
  current: number;
  attempts: Record<string, Attempt>;
  finished: boolean;
};

function contentRevision(problems: PracticeProblem[]) {
  const content = JSON.stringify(
    problems.map(({ id, prompt, hint, solution }) => [id, prompt, hint, solution]),
  );
  let hash = 2166136261;
  for (let index = 0; index < content.length; index++)
    hash = Math.imul(hash ^ content.charCodeAt(index), 16777619);
  return `${problems.length}-${(hash >>> 0).toString(16)}`;
}

function blankSession(problems: PracticeProblem[], revision: string): Session {
  return {
    version: 1,
    revision,
    current: 0,
    attempts: Object.fromEntries(
      problems.map((problem) => [
        problem.id,
        {
          draft: '',
          hintOpen: false,
          solutionOpen: false,
          selfCheck: 'unseen',
        },
      ]),
    ),
    finished: false,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function restoreSession(value: unknown, problems: PracticeProblem[], revision: string): Session {
  const session = blankSession(problems, revision);
  if (!record(value) || value.version !== 1 || value.revision !== revision) return session;
  if (
    typeof value.current === 'number' &&
    Number.isInteger(value.current) &&
    value.current >= 0 &&
    value.current < problems.length
  ) {
    session.current = value.current;
  }
  if (record(value.attempts)) {
    for (const problem of problems) {
      const attempt = value.attempts[problem.id];
      if (!record(attempt)) continue;
      session.attempts[problem.id] = {
        draft: typeof attempt.draft === 'string' ? attempt.draft.slice(0, 20_000) : '',
        hintOpen: attempt.hintOpen === true && Boolean(problem.hint),
        solutionOpen: attempt.solutionOpen === true,
        selfCheck:
          attempt.selfCheck === 'understood' || attempt.selfCheck === 'retry'
            ? attempt.selfCheck
            : 'unseen',
      };
    }
  }
  session.finished =
    value.finished === true &&
    problems.every((problem) => session.attempts[problem.id].selfCheck === 'understood');
  return session;
}

export function PracticePlayer({ material, onComplete }: PracticePlayerProps) {
  const problems = material.problems || [];
  const revision = useMemo(() => contentRevision(problems), [material.problems]);
  if (!problems.length)
    return (
      <div className="practice-player practice-empty">
        There are no practice problems in this material yet.
      </div>
    );
  return (
    <PracticeSession
      key={`${material.id}:${revision}`}
      material={material}
      problems={problems}
      revision={revision}
      onComplete={onComplete}
    />
  );
}

function PracticeSession({
  material,
  problems,
  revision,
  onComplete,
}: PracticePlayerProps & { problems: PracticeProblem[]; revision: string }) {
  const [session, setSession] = useState(() => blankSession(problems, revision));
  const sessionRef = useRef(session);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unavailable'>('saved');
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const storageKey = `mori-practice-session:${material.id}`;

  function save(next: Session) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unavailable');
    }
  }

  function commit(next: Session) {
    sessionRef.current = next;
    setSession(next);
    // Persist before notifying the parent, which may close or replace this view.
    save(next);
  }

  useEffect(() => {
    let restored = blankSession(problems, revision);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && raw.length <= 5_000_000)
        restored = restoreSession(JSON.parse(raw), problems, revision);
    } catch {
      setAnnouncement('Your saved practice could not be restored. You can start here.');
    }
    sessionRef.current = restored;
    setSession(restored);
    save(restored);
    setReady(true);
    // The keyed component remounts when the material or its problems change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const problem = problems[session.current];
  const attempt = session.attempts[problem.id];
  const understood = problems.filter(
    (item) => session.attempts[item.id].selfCheck === 'understood',
  ).length;

  function updateAttempt(patch: Partial<Attempt>) {
    const current = sessionRef.current;
    const problemId = problems[current.current].id;
    commit({
      ...current,
      attempts: { ...current.attempts, [problemId]: { ...current.attempts[problemId], ...patch } },
    });
  }

  function goTo(index: number) {
    if (index < 0 || index >= problems.length) return;
    commit({ ...sessionRef.current, current: index, finished: false });
    setAnnouncement('');
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function markUnderstood() {
    const current = sessionRef.current;
    const problemId = problems[current.current].id;
    if (!current.attempts[problemId].solutionOpen) return;
    const attempts: Record<string, Attempt> = {
      ...current.attempts,
      [problemId]: { ...current.attempts[problemId], selfCheck: 'understood' },
    };
    const finished = problems.every((item) => attempts[item.id].selfCheck === 'understood');
    commit({ ...current, attempts, finished });
    setAnnouncement(
      finished
        ? 'All problems marked understood.'
        : 'Marked understood. Move on when you are ready.',
    );
    if (finished) onComplete(material.id);
  }

  function tryAgain() {
    updateAttempt({ selfCheck: 'retry', hintOpen: false, solutionOpen: false });
    setAnnouncement('Have another go. Your working has been kept.');
    draftRef.current?.focus();
  }

  if (!ready)
    return (
      <div className="practice-player practice-loading" role="status">
        Restoring your practice…
      </div>
    );

  return (
    <section className="practice-player" aria-label="Worked practice problems">
      <div className="practice-meta">
        <span>
          <PencilLine size={16} /> Work it out, then check your reasoning.
        </span>
        <span
          className={`practice-save ${saveStatus === 'unavailable' ? 'is-unavailable' : ''}`}
          role="status"
        >
          {saveStatus === 'saved'
            ? 'Saved on this device'
            : 'This browser could not save your working'}
        </span>
      </div>
      {session.finished ? (
        <div className="practice-finished">
          <span className="practice-finished-icon">
            <CheckCircle2 size={30} />
          </span>
          <h3>Practice complete.</h3>
          <p>You marked all {problems.length} problems as understood.</p>
          <p className="practice-subtle">
            Your working and solutions are here whenever you want to revisit them.
          </p>
          <button type="button" className="button secondary" onClick={() => goTo(0)}>
            <RotateCcw size={16} /> Review problems
          </button>
        </div>
      ) : (
        <>
          <div className="practice-position">
            <span>
              Problem {session.current + 1} of {problems.length}
            </span>
            <span>{understood} understood</span>
          </div>
          <progress
            className="practice-progress"
            max={problems.length}
            value={understood}
            aria-label="Problems you marked understood"
          />
          <nav className="practice-steps" aria-label="Choose a practice problem">
            {problems.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={
                  session.attempts[item.id].selfCheck === 'understood' ? 'is-understood' : ''
                }
                aria-current={session.current === index ? 'step' : undefined}
                aria-label={`Problem ${index + 1}${session.attempts[item.id].selfCheck === 'understood' ? ', marked understood' : ''}`}
                onClick={() => goTo(index)}
              >
                <span>{index + 1}</span>
                {session.attempts[item.id].selfCheck === 'understood' && <Check size={13} />}
              </button>
            ))}
          </nav>
          <div ref={headingRef} tabIndex={-1} className="practice-prompt">
            <Markdown>{problem.prompt}</Markdown>
          </div>
          <div className="practice-working">
            <label htmlFor={`${id}-working`}>
              Your working <span>(optional)</span>
            </label>
            <textarea
              ref={draftRef}
              id={`${id}-working`}
              value={attempt.draft}
              maxLength={20_000}
              onChange={(event) => updateAttempt({ draft: event.target.value })}
              placeholder="Try a few steps, write your answer, or work it out on paper…"
              rows={5}
              spellCheck={false}
              aria-describedby={`${id}-working-note`}
            />
            <p id={`${id}-working-note`}>
              Use this space like a notebook. Compare your work with the solution when you are
              ready.
            </p>
          </div>
          <div className="practice-reveal-actions">
            {problem.hint && (
              <button
                type="button"
                className="button secondary small"
                aria-expanded={attempt.hintOpen}
                aria-controls={`${id}-hint`}
                onClick={() => updateAttempt({ hintOpen: !attempt.hintOpen })}
              >
                <Lightbulb size={16} /> {attempt.hintOpen ? 'Hide hint' : 'Show a hint'}
              </button>
            )}
            <button
              type="button"
              className="button secondary small"
              aria-expanded={attempt.solutionOpen}
              aria-controls={`${id}-solution`}
              onClick={() => updateAttempt({ solutionOpen: !attempt.solutionOpen })}
            >
              {attempt.solutionOpen ? 'Hide worked solution' : 'Show worked solution'}
              <ArrowRight size={16} />
            </button>
          </div>
          {attempt.hintOpen && problem.hint && (
            <aside id={`${id}-hint`} className="practice-hint">
              <h4>
                <Lightbulb size={16} /> A small nudge
              </h4>
              <Markdown>{problem.hint}</Markdown>
            </aside>
          )}
          {attempt.solutionOpen && (
            <section
              id={`${id}-solution`}
              className="practice-solution"
              aria-label="Worked solution"
            >
              <h4>Worked solution</h4>
              <Markdown>{problem.solution}</Markdown>
              <div className="practice-self-check">
                <div>
                  <strong>Your self-check</strong>
                  <p>Can you explain these steps in your own words?</p>
                </div>
                <div className="practice-self-actions">
                  <button type="button" className="button secondary small" onClick={tryAgain}>
                    <RotateCcw size={16} /> Try again
                  </button>
                  <button
                    type="button"
                    className="button primary small"
                    aria-pressed={attempt.selfCheck === 'understood'}
                    onClick={markUnderstood}
                  >
                    <Check size={16} />{' '}
                    {attempt.selfCheck === 'understood' ? 'Understood' : 'I understand this'}
                  </button>
                </div>
              </div>
            </section>
          )}
          <div className="practice-navigation">
            <button
              type="button"
              className="button secondary small"
              disabled={session.current === 0}
              onClick={() => goTo(session.current - 1)}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            {understood === problems.length ? (
              <button
                type="button"
                className="button primary small"
                onClick={() => {
                  commit({ ...sessionRef.current, finished: true });
                  onComplete(material.id);
                }}
              >
                Finish practice <Check size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="button secondary small"
                disabled={session.current === problems.length - 1}
                onClick={() => goTo(session.current + 1)}
              >
                Next problem <ArrowRight size={16} />
              </button>
            )}
          </div>
        </>
      )}
      <p className="practice-announcement" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
