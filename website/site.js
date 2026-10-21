const repository = document.documentElement.dataset.repository;
const repositoryName = new URL(repository).pathname.split('/').filter(Boolean).at(-1);
const releaseVersion = document.documentElement.dataset.releaseVersion;
const releasePublished = document.documentElement.dataset.releasePublished === 'true';
const releaseCommand = `npx --yes --package=${repository}/releases/download/v${releaseVersion}/mori-study-${releaseVersion}.tgz mori-study init my-study`;
const published = document.documentElement.dataset.npmPublished === 'true';
const prompt = `Set up Mori Study for me from ${repository}.

Reuse an existing checkout if available; otherwise clone it into a new folder. Read INSTALL.md, README.md, and skills/mori-study/SKILL.md, then run:
npm install
npm run mori-study -- install --agent all

First understand my learning goal, selected sources, chapter range, and requested formats: lessons, slides, quizzes, worked practice, flashcards, videos, or several together. Use your own model to create the source-grounded material. Prioritize useful pictures and minimal text in slides, with detailed explanations in notes. Check references, facts, and solutions, then validate and import the pack with the Mori Study CLI. Run npm run mori-study -- open and provide any requested exports, including whole-pack PowerPoint.

No portal form or extra model API key is needed. If I have not supplied sources yet, open the included examples so I can explore and provide my first study request. Keep my existing files safe.`;
const commands = `git clone ${repository}.git\ncd ${repositoryName}\nnpm install\nnpm run mori-study -- install --agent all\nnpm run mori-study -- open`;
const promptField = document.getElementById('agent-prompt');
promptField.value = prompt;
document.getElementById('terminal-commands').textContent = commands;
document.getElementById('release-install').hidden = !releasePublished;
document.getElementById('release-command').textContent = releaseCommand;
document
  .getElementById('copy-release')
  .addEventListener('click', () => void copy(releaseCommand, 'Release install command copied.'));
document.getElementById('unpublished-note').hidden = published;
document.getElementById('published-note').hidden = !published;
let toastTimer;
function notify(message) {
  clearTimeout(toastTimer);
  const status = document.getElementById('copy-status');
  status.querySelector('span').textContent = message;
  status.hidden = false;
  toastTimer = setTimeout(() => {
    status.hidden = true;
  }, 4800);
}
function selectTab(selected) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  });
}
async function copy(text, success) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('Copy unavailable');
    }
    notify(success);
  } catch {
    selectTab(document.getElementById('tab-agent'));
    promptField.value = text;
    document.getElementById('get-started').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    promptField.focus();
    promptField.select();
    notify('Text selected below. Press Ctrl+C or ⌘C to copy.');
  }
}
document.querySelectorAll('[data-copy-agent]').forEach((button) =>
  button.addEventListener('click', () => {
    promptField.value = prompt;
    void copy(prompt, 'Copied. Paste the prompt into your AI agent.');
  }),
);
document
  .getElementById('copy-commands')
  .addEventListener(
    'click',
    () => void copy(commands, 'Setup commands copied. Your terminal is next.'),
  );
document
  .getElementById('copy-package')
  .addEventListener(
    'click',
    () => void copy('npx mori-study init my-study', 'Package command copied.'),
  );
document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const next =
      event.key === 'Home'
        ? tabs[0]
        : event.key === 'End'
          ? tabs.at(-1)
          : tabs[(tabs.indexOf(tab) + 1) % tabs.length];
    selectTab(next);
    next.focus();
  });
});
let flipped = false;
document.getElementById('demo-flashcard').addEventListener('click', () => {
  flipped = !flipped;
  document.getElementById('demo-flashcard').classList.toggle('flipped', flipped);
  document.getElementById('flashcard-side').textContent = flipped
    ? 'ONE IDEA, A LITTLE CLEARER'
    : 'A LITTLE ACTIVE RECALL';
  document.getElementById('flashcard-text').textContent = flipped
    ? 'The instantaneous rate of change of a function.'
    : 'What does a derivative tell us?';
  document.getElementById('flashcard-instruction').textContent = flipped
    ? 'Click to see the question ↻'
    : 'Click to turn the card ↻';
});
document.querySelectorAll('[data-demo-answer]').forEach((button) =>
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-demo-answer]').forEach((answer) => {
      answer.setAttribute('aria-pressed', String(answer === button));
      answer.classList.toggle('selected', answer === button);
    });
    const correct = button.dataset.demoAnswer === 'correct';
    const feedback = document.getElementById('quiz-feedback');
    feedback.textContent = correct
      ? 'Exactly. The power rule gives 2x.'
      : 'A good place to learn: the power rule gives 2x.';
    feedback.classList.toggle('correct', correct);
  }),
);
