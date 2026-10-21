import type { Citation, Course, Source, Workspace } from './types';

const createdAt = '2026-10-20T09:00:00.000Z';

const cite = (sourceId: string, label: string, section: string): Citation[] => [
  { sourceId, label, section },
];
const calculus = (section: string) =>
  cite('calculus-notes', 'Original calculus example notes', section);
const biology = (section: string) =>
  cite('biology-notes', 'Original biology example notes', section);
const physics = (section: string) =>
  cite('physics-notes', 'Original physics example notes', section);

const calculusCourse: Course = {
  schemaVersion: 1,
  id: 'calculus',
  title: 'Calculus, made clear',
  description:
    'From a simple curve to a small moment of change. Build your intuition, one idea at a time.',
  subject: 'Mathematics',
  color: 'sage',
  icon: 'calculus',
  sourceIds: ['calculus-notes'],
  chapters: 'Chapters 1–2.3',
  createdAt,
  updatedAt: createdAt,
  materials: [
    {
      id: 'calculus-functions',
      kind: 'lesson',
      title: 'Every curve starts with a function',
      description: 'Inputs, outputs, and the question calculus helps us answer.',
      duration: 6,
      section: '1.1 · Functions',
      citations: calculus('1.1 Functions: an input, one output; 1.2 Change over an interval'),
      content: String.raw`## One input. One output.

A function is a rule that assigns **exactly one output** to each allowed input. If the rule is “square the input,” we write

$$f(x)=x^2.$$

Feed it $3$, and you get $9$. Feed it $-3$, and you also get $9$. Different inputs can share an output. What a function cannot do is send the **same input to two different outputs**.

### Two sets worth knowing

The **domain** is the set of inputs you are allowed to use. The **range** is the set of outputs the function actually produces.

For $f(x)=x^2$ over the real numbers:

- Domain: all real numbers.
- Range: $[0,\infty)$, because squaring never produces a negative real number.

Some rules have restrictions. For $g(x)=1/(x-2)$, you must exclude $x=2$. For $h(x)=\sqrt{x-1}$ with real outputs, you need $x\geq 1$.

> **A quick check:** A vertical line should meet the graph of a function of $x$ at most once. Two intersections would give one input two outputs.

### From “what is it?” to “how is it changing?”

Algebra can tell you a height on the curve. Calculus asks how that height changes as you move along it.

Start with the **average rate of change** between two different inputs:

$$\frac{\text{change in output}}{\text{change in input}}=\frac{f(b)-f(a)}{b-a}.$$

For $f(x)=x^2$, moving from $x=1$ to $x=3$ gives

$$\frac{9-1}{3-1}=4.$$

That is the slope of the **secant line** joining the two points. The curve itself has different slopes at different places, so $4$ describes the whole interval, not every instant inside it.

### Try it before moving on

For $f(x)=x^2$, find $f(2)$, then find the average rate of change from $x=2$ to $x=4$.

**Check your thinking:** $f(2)=4$. The average rate is $(16-4)/(4-2)=6$. One answer is a height; the other is a rate.

**Keep this idea:** A function tells us what the output is. Calculus helps us describe how that output changes.`,
    },
    {
      id: 'calculus-functions-slides',
      kind: 'slides',
      title: 'Functions, in five small steps',
      description: 'A visual recap of domains, graphs, and average change.',
      duration: 4,
      section: '1.1–1.2 · The foundations',
      citations: calculus(
        '1.1 Functions: an input, one output; 1.2 Change over an interval; 2.1 The derivative',
      ),
      slides: [
        {
          title: 'A rule you can trust',
          body: 'One allowed input always gives exactly one output.',
          formula: String.raw`f(x)=x^2`,
          bullets: ['Different inputs may share an output.'],
          image: {
            src: '/illustrations/function-map.svg',
            alt: 'The square function maps −2 and 2 to 4, and 0 to 0.',
            caption: 'Original diagram · one output per input',
          },
          notes:
            'The restriction is one output per input, not one input per output. The original diagram uses examples from the source notes.',
        },
        {
          title: 'Where can you start?',
          body: 'The domain is your set of inputs. The range is the set of outputs reached.',
          formula: String.raw`f(x)=x^2`,
          bullets: ['Domain: all real inputs.', 'Range: zero or greater.'],
          image: {
            src: '/illustrations/domain-range.svg',
            alt: 'The graph of x squared reaches a minimum of zero and allows every real input.',
            caption: 'Original diagram · domain and range',
          },
          notes:
            'The source examples 1/(x−2) and √(x−1) have restricted real domains: exclude 2 in the first, and require x≥1 in the second. Check the expression and the situation.',
        },
        {
          title: 'A graph is a collection of answers',
          body: 'Each point pairs an input with its output. Two inputs can reach the same height.',
          bullets: ['Both −2 and 2 give the output 4.'],
          image: {
            src: '/illustrations/domain-range.svg',
            alt: 'The points (−2,4) and (2,4) lie at the same height on the parabola.',
            caption: 'Same output · different inputs',
          },
          notes:
            'A vertical line meets a function graph at most once. A horizontal line may meet it more than once, as y=4 does here.',
        },
        {
          title: 'Measure change across an interval',
          body: 'Join two points. The dashed secant gives the average rate across their interval.',
          bullets: ['From (1,1) to (3,9): slope 4.'],
          image: {
            src: '/illustrations/secant-tangent.svg',
            alt: 'A dashed secant connects (1,1) and (3,9), giving average slope 4.',
            caption: 'Original plot · focus on the dashed secant',
          },
          notes:
            'The dashed secant has slope (9−1)/(3−1)=4. The tangent at x=3 is shown as a preview of instantaneous change in section 2.1. Rate units are output units divided by input units.',
          formula: String.raw`\frac{f(b)-f(a)}{b-a}`,
        },
        {
          title: 'One calculation, one new question',
          body: 'Across the interval, the average slope is 4. Right at x=3, the tangent slope is 6.',
          bullets: ['One interval. One instant. Two questions.'],
          image: {
            src: '/illustrations/secant-tangent.svg',
            alt: 'A secant slope of 4 and a tangent slope of 6 answer different questions on the same curve.',
            caption: 'A preview of instantaneous change',
          },
          notes:
            'The next chapter explains the tangent rate using a limit. For f(x)=x², f′(x)=2x, so f′(3)=6.',
          formula: String.raw`\frac{3^2-1^2}{3-1}=4`,
        },
      ],
    },
    {
      id: 'calculus-functions-quiz',
      kind: 'quiz',
      title: 'A little check-in: functions',
      description: 'Five questions to make sure the foundations feel solid.',
      duration: 4,
      section: '1.1–1.2 · Check your understanding',
      citations: calculus('1.1 Functions: an input, one output; 1.2 Change over an interval'),
      questions: [
        {
          id: 'functions-one-output',
          prompt: 'What must be true for a relation to be a function?',
          options: [
            'Every output has exactly one input.',
            'Every allowed input has exactly one output.',
            'Every input and output is positive.',
            'Its graph must be a straight line.',
          ],
          answer: 1,
          explanation:
            'A function assigns exactly one output to each input in its domain. Two inputs can share an output, as 2 and −2 do for x².',
        },
        {
          id: 'functions-domain',
          prompt: 'Which input is excluded from the real domain of g(x)=1/(x−2)?',
          options: ['−2', '0', '2', 'Every negative number'],
          answer: 2,
          explanation:
            'At x=2 the denominator is zero. Division by zero is undefined, so 2 is excluded.',
        },
        {
          id: 'functions-range',
          prompt: 'What is the range of f(x)=x² over all real inputs?',
          options: [
            'All real numbers',
            'Only positive numbers, excluding zero',
            'All numbers less than or equal to zero',
            'All numbers greater than or equal to zero',
          ],
          answer: 3,
          explanation:
            'A real square is never negative, and f(0)=0. Every nonnegative real number can be reached by squaring a real input.',
        },
        {
          id: 'functions-average',
          prompt: 'For f(x)=x², what is the average rate of change from x=1 to x=3?',
          options: ['4', '6', '8', '9'],
          answer: 0,
          explanation: 'Use change in output divided by change in input: (9−1)/(3−1)=8/2=4.',
        },
        {
          id: 'functions-units',
          prompt:
            'If position is in metres and time is in seconds, what units does average velocity have?',
          options: [
            'Metres',
            'Seconds per metre',
            'Metres per second',
            'Metres per second squared',
          ],
          answer: 2,
          explanation:
            'Average velocity divides a change in position by elapsed time, so its units are metres per second.',
        },
      ],
    },
    {
      id: 'calculus-limits',
      kind: 'lesson',
      title: 'Getting closer: the idea of a limit',
      description: 'What happens near a point can matter more than what happens at it.',
      duration: 7,
      section: '1.3 · Limits & continuity',
      citations: calculus('1.3 Limits and continuity'),
      content: String.raw`## Think “approaching,” not “arriving”

Imagine moving along the curve $f(x)=x^2$ toward $x=2$. The closer the input gets to $2$, the closer the output gets to $4$.

$$\lim_{x\to 2}x^2=4.$$

Read this as: “The limit of $x^2$, as $x$ approaches $2$, is $4$.”

| Input $x$ | Output $x^2$ |
| --- | --- |
| $1.9$ | $3.61$ |
| $1.99$ | $3.9601$ |
| $2.01$ | $4.0401$ |
| $2.1$ | $4.41$ |

The table suggests the limit. The underlying idea is stronger: we can make the output as close to $4$ as we want by taking the input sufficiently close to $2$.

### Both sides need to agree

A **two-sided limit** exists when the left-hand and right-hand limits both exist and are equal. If approaching from the left gives $1$ and approaching from the right gives $3$, there is no single two-sided limit.

### A hole does not erase a limit

Consider

$$r(x)=\frac{x^2-4}{x-2}.$$

At $x=2$, the original expression is undefined. But for every nearby input other than $2$, we can factor and simplify:

$$\frac{(x-2)(x+2)}{x-2}=x+2,\qquad x\ne 2.$$

So the graph follows the line $y=x+2$ with a hole at $(2,4)$. Its nearby values still approach $4$:

$$\lim_{x\to 2}\frac{x^2-4}{x-2}=4.$$

> **Keep the restriction.** Canceling $(x-2)$ helps us study nearby inputs. It does not make the original expression defined at $2$.

### When is a function continuous?

Continuity at $x=a$ requires three things:

1. $f(a)$ is defined.
2. $\lim_{x\to a}f(x)$ exists.
3. That limit equals $f(a)$.

The original $r$ is not continuous at $2$. We could create a new function that fills the hole with the value $4$, making that new function continuous there.

**Try explaining this aloud:** How can a limit exist at a point where the function is undefined? Use “nearby values” in your answer.`,
    },
    {
      id: 'calculus-limits-video',
      kind: 'video',
      title: 'Limits, in a little moment',
      description:
        'A 30-second silent explainer about approaching a value, two sides agreeing, and a limit surviving a hole.',
      duration: 1,
      section: '1.3 · Limits in motion',
      citations: calculus('1.3 Limits and continuity'),
      videoUrl: '/videos/limits.mp4',
      transcript: `Limits, in a little moment

Silent study video. On-screen explanation:

00:00:00.000 — 00:00:10.000
Getting closer is the point.
A limit describes what the output approaches as the input gets closer to a value. For f(x) = x², inputs near 2 give outputs near 4.
x → 2      ·      x² → 4
From the left: 1.9² = 3.61
Closer still: 1.99² = 3.9601
From the right: 2.01² = 4.0401
Source: Original calculus example notes · 1.3 Limits and continuity

00:00:10.000 — 00:00:20.000
Two sides. One destination.
A finite two-sided limit exists when the left-hand and right-hand limits exist and agree. For x² near 2, both sides approach 4.
Left → 4       =       Right → 4
Same value: The two-sided limit exists.
Different values: The two-sided limit does not exist.
Source: Original calculus example notes · 1.3 Limits and continuity

00:00:20.000 — 00:00:30.000
The limit can survive a hole.
This expression equals x + 2 when x ≠ 2. It is undefined at 2, yet its limit as x approaches 2 is still 4.
(x² − 4) / (x − 2) = x + 2,  x ≠ 2
At x = 2: The expression is undefined.
Near x = 2: The output approaches 4.
Source: Original calculus example notes · 1.3 Limits and continuity

`,
    },
    {
      id: 'calculus-derivative-slides',
      kind: 'slides',
      title: 'From secant to tangent',
      description: 'Watch the idea of a derivative come together in six slides.',
      duration: 5,
      section: '2.1 · The derivative',
      citations: calculus(
        '1.2 Change over an interval; 1.3 Limits and continuity; 2.1 The derivative: change at an instant',
      ),
      slides: [
        {
          title: 'Start with two points',
          body: 'A secant measures change between a and a+h. Its slope is a difference quotient.',
          bullets: ['Keep h nonzero while dividing.'],
          image: {
            src: '/illustrations/secant-tangent.svg',
            alt: 'Two points on x squared define a secant; the tangent shows the local slope at the second point.',
            caption: 'Two points give an average rate',
          },
          notes:
            'The illustration uses a=1 and h=2 for the secant, so its slope is 4. In the general definition, h can be positive or negative. Shrinking the interval around a leads to the derivative at a.',
          formula: String.raw`\frac{f(a+h)-f(a)}{h}`,
        },
        {
          title: 'Let the gap get smaller',
          body: 'Nearby inputs can approach a target output. A derivative applies this limiting idea to secant slopes.',
          formula: String.raw`\lim_{x\to2}x^2=4`,
          bullets: [],
          image: {
            src: '/illustrations/limit-approach.svg',
            alt: 'Inputs approach 2 from either side while x squared approaches 4.',
            caption: 'A limits reminder before the derivative',
          },
          notes:
            'This picture revisits the source limit of x² at 2. For a derivative, the quantity whose limit we take is a difference quotient; its interval h approaches zero. We never directly divide by h=0.',
        },
        {
          title: 'Give that limit a name',
          body: 'The derivative at a is the instantaneous rate of change and the tangent slope.',
          formula: String.raw`f'(a)=\lim_{h\to0}\frac{f(a+h)-f(a)}{h}`,
          bullets: [
            'The derivative exists when this finite limit exists.',
            'Its units are output units per input unit.',
          ],
          notes: 'The derivative is a rate, whereas f(a) is a function value.',
        },
        {
          title: 'Try the curve x²',
          body: 'Expand the square, subtract a², and cancel h while h is nonzero.',
          formula: String.raw`\frac{(a+h)^2-a^2}{h}=2a+h`,
          bullets: ['(a+h)² = a² + 2ah + h²', 'The remaining expression is easy to approach.'],
          notes: 'Canceling h is valid for the nearby nonzero values used in the limit.',
        },
        {
          title: 'A beautifully small result',
          body: 'For x², the derivative is 2x. At x=3, the tangent slope is 6.',
          formula: String.raw`f'(x)=2x`,
          bullets: ['Average slope from 1 to 3: 4', 'Instantaneous slope at 3: 6'],
          image: {
            src: '/illustrations/secant-tangent.svg',
            alt: 'Exact plot of y=x² with P=(1,1), Q=(3,9), a secant of slope 4, and the tangent at Q of slope 6.',
            caption: 'Original plot · the same curve, two rates',
          },
          notes:
            'At x=3, the function height is 9 but the slope is 6. The original diagram plots the source examples on the same axes; the secant is y=4x−3 and the tangent is y=6x−9.',
        },
        {
          title: 'Not every point has a slope',
          body: 'At the corner of |x|, the one-sided slopes disagree.',
          bullets: ['Continuous at 0; no derivative there.'],
          image: {
            src: '/illustrations/corner-slopes.svg',
            alt: 'The V-shaped graph of absolute value has slope −1 to the left of zero and +1 to the right.',
            caption: 'Original plot · two different one-sided slopes',
          },
          notes:
            'The left slope at 0 is −1 and the right slope is +1. Differentiability implies continuity, but continuity alone does not imply differentiability.',
          formula: String.raw`f(x)=|x|`,
        },
      ],
    },
    {
      id: 'calculus-derivative-rules',
      kind: 'lesson',
      title: 'A small toolkit for derivatives',
      description: 'A few reusable rules turn long limits into short calculations.',
      duration: 5,
      section: '2.2 · Derivative rules',
      citations: calculus('2.2 A small toolkit of derivative rules'),
      content: String.raw`## Keep the meaning. Shorten the calculation.

The derivative still means instantaneous rate of change. Rules simply save us from rebuilding the limit for every new polynomial.

### 1. Constants have no change

$$\frac{d}{dx}(c)=0.$$

A horizontal line has slope zero, so the derivative of $7$ is $0$.

### 2. Bring the power down, then subtract one

For the polynomial powers used here, with an integer $n\geq1$:

$$\frac{d}{dx}(x^n)=nx^{n-1}.$$

So $x^3$ becomes $3x^2$, and $x^2$ becomes $2x$. Remember both steps: multiply by the old power **and** lower the exponent.

### 3. Keep constant multipliers

$$\frac{d}{dx}(4x^3)=4\cdot3x^2=12x^2.$$

### 4. Work term by term

For a sum or difference, differentiate each term:

$$f(x)=4x^3-2x+7$$
$$f'(x)=12x^2-2.$$

The constant disappears because it shifts the graph up without changing its slopes.

### Your turn

For $g(x)=3x^2+5x-4$, find $g'(x)$ and then $g'(2)$.

**Worked answer:** $g'(x)=6x+5$, so $g'(2)=12+5=17$.

> **Two useful habits:** Differentiate before substituting the input. Then check that every nonconstant polynomial power has dropped by one.

### A glimpse of what comes next

Products and nested functions need their own rules. For example, $(uv)'=u'v+uv'$ and $(f(g(x)))'=f'(g(x))g'(x)$. You do not need those rules for the polynomial practice in this chapter.`,
    },
    {
      id: 'calculus-tangent-lines',
      kind: 'lesson',
      title: 'Make a tiny prediction',
      description: 'Use a tangent line to turn a slope into a useful local estimate.',
      duration: 6,
      section: '2.3 · Tangent lines',
      citations: calculus('2.3 Tangent lines and local predictions'),
      content: String.raw`## A point and a slope are enough

A tangent line matches a curve's value and instantaneous slope at one point. At $x=a$, its equation is

$$y=f(a)+f'(a)(x-a).$$

Think of this as **starting height + slope × horizontal step**.

### Build one for $f(x)=x^2$ at $x=3$

1. Find the height: $f(3)=9$.
2. Find the slope: $f'(x)=2x$, so $f'(3)=6$.
3. Put them together:

$$y=9+6(x-3)=6x-9.$$

Substitute $x=3$. You get $y=9$, so the line passes through the intended point.

### Predict a nearby value

What is $3.02^2$, approximately? The step from $3$ is $\Delta x=0.02$, so use the tangent line:

$$f(3.02)\approx 9+6(0.02)=9.12.$$

The exact answer is $9.1204$. Our estimate is low by only $0.0004$.

For this particular curve, the expansion explains the error:

$$ (3+\Delta x)^2=9+6\Delta x+(\Delta x)^2.$$

The tangent estimate keeps the first two terms and leaves out $(\Delta x)^2$.

> **Stay local.** A tangent line is useful near its point of contact. A good estimate for a tiny step does not guarantee a good estimate far away.

### Connect it to motion

If position is $s(t)=t^2$ metres for $t\geq0$ seconds, velocity is $v(t)=2t$ metres per second. At $t=3$, the instantaneous velocity is $6$ m/s.

Over the interval from $3$ to $3.2$ seconds, the average velocity is

$$\frac{3.2^2-3^2}{0.2}=6.2\text{ m/s}.$$

Both answers make sense. The object is speeding up, so the interval's average is a little higher than the rate at its start.

**One-sentence takeaway:** The derivative lets us replace a smooth curve with a simple line for a small local prediction.`,
    },
    {
      id: 'calculus-guided-practice',
      kind: 'practice',
      title: 'Work it through, one step at a time',
      description:
        'Four original written exercises with hints, worked solutions, and your own self-check.',
      duration: 12,
      section: '1.2–2.3 · Guided practice',
      citations: calculus(
        '1.2 Change over an interval; 1.3 Limits and continuity; 2.1–2.3 Derivatives and tangent lines',
      ),
      problems: [
        {
          id: 'practice-secant-slope',
          prompt: String.raw`For $f(x)=x^2$, find the **average rate of change** from $x=1$ to $x=3$. Explain what your answer tells you about the graph.`,
          hint: String.raw`Find the two output values first. Then divide the change in output by the change in input: $[f(3)-f(1)]/(3-1)$.`,
          solution: String.raw`1. The endpoint values are $f(1)=1$ and $f(3)=9$.
2. The change in output is $9-1=8$; the change in input is $3-1=2$.
3. Divide:

$$\frac{f(3)-f(1)}{3-1}=\frac{8}{2}=4.$$

The **secant line** through $(1,1)$ and $(3,9)$ has slope $4$. This is the average rate across the interval. It does not say that the curve has slope $4$ at every point.`,
        },
        {
          id: 'practice-removable-limit',
          prompt: String.raw`Find $\displaystyle\lim_{x\to2}\frac{x^2-4}{x-2}$. Is the **original function** defined at $x=2$? Explain both answers.`,
          hint: String.raw`Factor $x^2-4$ as a difference of squares. Simplify only for $x\ne2$, then consider nearby values.`,
          solution: String.raw`For $x\ne2$, factor and cancel the common factor:

$$\frac{x^2-4}{x-2}=\frac{(x-2)(x+2)}{x-2}=x+2.$$

As $x$ approaches $2$, $x+2$ approaches $4$, so the limit is **$4$**.

The original function is **not defined at $x=2$**, because its denominator is zero. Simplifying nearby values does not fill the hole in the original function.`,
        },
        {
          id: 'practice-polynomial-rate',
          prompt: String.raw`Differentiate $g(x)=4x^3-2x+7$. Then find $g'(2)$.

This is an original practice calculation using the polynomial rules from your notes.`,
          hint: String.raw`Apply the power rule to each term. A constant differentiates to zero. Find the derivative expression before substituting $x=2$.`,
          solution: String.raw`Differentiate one term at a time:

$$g'(x)=4\cdot3x^2-2+0=12x^2-2.$$

Now substitute $x=2$:

$$g'(2)=12(2)^2-2=48-2=46.$$

The answer $46$ is the instantaneous rate of change at $x=2$. The constant $7$ shifts the graph vertically, so it does not change its slopes.`,
        },
        {
          id: 'practice-tangent-prediction',
          prompt: String.raw`For $f(x)=x^2$, write the tangent line at $x=3$. Use it to estimate $3.02^2$, and explain why the result is an approximation.`,
          hint: String.raw`Use $y=f(a)+f'(a)(x-a)$ with $a=3$. The change from $3$ to $3.02$ is $\Delta x=0.02$.`,
          solution: String.raw`The point is $(3,9)$ and the derivative is $f'(x)=2x$, so the slope at $3$ is $6$.

The tangent line is

$$y=9+6(x-3)=6x-9.$$

For a small step of $0.02$:

$$3.02^2\approx9+6(0.02)=9.12.$$

The exact value is $9.1204$. The tangent estimate omits the quadratic term $(0.02)^2=0.0004$, so it is low by $0.0004$. A tangent line matches the local value and slope; it does not reproduce the whole curve.`,
        },
      ],
    },
    {
      id: 'calculus-derivatives-quiz',
      kind: 'quiz',
      title: 'Put the pieces together',
      description: 'Limits, derivatives, and tangent lines. Six questions, with room to learn.',
      duration: 5,
      section: '1.3–2.3 · Chapter review',
      citations: calculus('1.3 Limits and continuity; 2.1–2.3 Derivatives and tangent lines'),
      questions: [
        {
          id: 'derivatives-hole',
          prompt: 'For r(x)=(x²−4)/(x−2), what is the limit as x approaches 2?',
          options: ['0', '2', '4', 'It cannot exist because r(2) is undefined.'],
          answer: 2,
          explanation:
            'For x≠2, factor and cancel to get r(x)=x+2. Nearby values approach 4 even though r(2) is undefined.',
        },
        {
          id: 'derivatives-both-sides',
          prompt:
            'A function approaches 1 from the left and 3 from the right at x=a. What is its two-sided limit there?',
          options: ['1', '2, the average of the two', '3', 'The two-sided limit does not exist.'],
          answer: 3,
          explanation:
            'A two-sided limit requires the left and right limits to agree. Averaging them does not define a limit.',
        },
        {
          id: 'derivatives-polynomial',
          prompt: 'If f(x)=4x³−2x+7, which expression is f′(x)?',
          options: ['12x²−2', '4x²−2', '12x³−2x', '12x²+7'],
          answer: 0,
          explanation:
            'Apply the power rule term by term: 4x³ becomes 12x², −2x becomes −2, and the constant 7 becomes 0.',
        },
        {
          id: 'derivatives-value',
          prompt: 'For f(x)=x² at x=3, what do f(3) and f′(3) equal?',
          options: ['f(3)=6 and f′(3)=9', 'f(3)=9 and f′(3)=6', 'Both equal 6', 'Both equal 9'],
          answer: 1,
          explanation:
            'The value is 3²=9. The derivative is 2x, so the rate at x=3 is 6. Height and slope are different quantities.',
        },
        {
          id: 'derivatives-tangent',
          prompt: 'Which is the tangent line to y=x² at x=3?',
          options: ['y=6x+9', 'y=3x', 'y=9+6(x−3)', 'y=9+3(x−6)'],
          answer: 2,
          explanation:
            'The line needs to pass through (3,9) with slope 6. Point-slope form gives y=9+6(x−3), or y=6x−9.',
        },
        {
          id: 'derivatives-corner',
          prompt: 'Why is f(x)=|x| not differentiable at x=0?',
          options: [
            'The function is undefined at 0.',
            'Every continuous function has derivative 0.',
            'A derivative cannot be negative.',
            'Its left and right slopes disagree.',
          ],
          answer: 3,
          explanation:
            'The graph is continuous, but the left slope is −1 and the right slope is +1. The derivative limit therefore does not exist at the corner.',
        },
      ],
    },
    {
      id: 'calculus-flashcards',
      kind: 'flashcards',
      title: 'The ideas worth keeping',
      description: 'Twelve small prompts for a little active recall.',
      duration: 6,
      section: '1–2.3 · Recall practice',
      citations: calculus('1.1–2.3 Functions, limits, derivatives, and tangent lines'),
      cards: [
        {
          id: 'calc-card-function',
          front: 'What makes a rule a function?',
          back: 'Each input in its domain has exactly one output. Different inputs may share an output.',
        },
        {
          id: 'calc-card-domain',
          front: 'Domain vs. range?',
          back: 'The domain contains allowed inputs. The range contains outputs actually produced.',
        },
        {
          id: 'calc-card-secant',
          front: 'How do you find average rate of change from a to b?',
          back: '[f(b)−f(a)]/(b−a), with a≠b. It is the secant-line slope.',
        },
        {
          id: 'calc-card-limit',
          front: 'Does a limit depend on the function being defined at the point?',
          back: 'No. A limit describes nearby values. (x²−4)/(x−2) has limit 4 at x=2 although its value there is undefined.',
        },
        {
          id: 'calc-card-two-sided',
          front: 'What must left and right limits do for a two-sided limit to exist?',
          back: 'Both must exist and agree.',
        },
        {
          id: 'calc-card-continuity',
          front: 'What are the three conditions for continuity at a?',
          back: 'f(a) is defined; the limit at a exists; and that limit equals f(a).',
        },
        {
          id: 'calc-card-derivative',
          front: 'What does f′(a) mean?',
          back: 'The instantaneous rate of change at a, or the slope of the tangent line there.',
        },
        {
          id: 'calc-card-definition',
          front: 'Write the derivative as a limit.',
          back: 'f′(a)=lim as h→0 of [f(a+h)−f(a)]/h, when this finite limit exists.',
        },
        {
          id: 'calc-card-power',
          front: 'Differentiate xⁿ for an integer n≥1.',
          back: 'n·xⁿ⁻¹. Multiply by the old exponent and lower the exponent by one.',
        },
        {
          id: 'calc-card-constant',
          front: 'Why is the derivative of a constant zero?',
          back: 'Its output does not change as the input changes. Its graph is a horizontal line.',
        },
        {
          id: 'calc-card-tangent',
          front: 'What is the tangent-line formula at x=a?',
          back: 'y=f(a)+f′(a)(x−a). Start with the value at a, then add slope × horizontal step.',
        },
        {
          id: 'calc-card-corner',
          front: 'Can a function be continuous but not differentiable?',
          back: 'Yes. |x| is continuous at 0, but its left slope −1 and right slope +1 disagree.',
        },
      ],
    },
    {
      id: 'calculus-summary',
      kind: 'lesson',
      title: 'Your chapter, on one page',
      description: 'A calm, compact recap to revisit before your next class.',
      duration: 3,
      section: '1–2.3 · Summary',
      citations: calculus('Study route; 1.1–2.3'),
      content: String.raw`## The thread connecting it all

A **function** tells us an output. An **average rate** measures change across an interval. A **limit** lets that interval shrink. A **derivative** describes change at an instant. A **tangent line** turns that rate into a local prediction.

### Five things to keep nearby

| Idea | What to remember |
| --- | --- |
| Function | One output per allowed input |
| Average rate | $[f(b)-f(a)]/(b-a)$ |
| Limit | Nearby behavior; left and right must agree |
| Derivative | Instantaneous rate and tangent slope |
| Tangent line | $y=f(a)+f'(a)(x-a)$ |

### The example that ties the chapter together

For $f(x)=x^2$:

- The value at $3$ is $9$.
- The average rate from $1$ to $3$ is $4$.
- The derivative is $f'(x)=2x$.
- The instantaneous rate at $3$ is $6$.
- The tangent line there is $y=9+6(x-3)$.
- A nearby estimate is $f(3.02)\approx9.12$.

### Three mistakes you can now catch

1. **Confusing value and rate:** $f(3)$ and $f'(3)$ answer different questions.
2. **Plugging zero into a difference quotient:** take a limit after simplifying for nonzero $h$.
3. **Forgetting a missing input:** canceling a factor does not repair a hole in the original function.

### Before you close the notebook

Explain why the secant slope uses two points, but the derivative describes one instant. Then write a tangent-line equation without looking at the formula above. If those feel comfortable, you have the central ideas of this chapter.`,
    },
  ],
};

const biologyCourse: Course = {
  schemaVersion: 1,
  id: 'biology',
  title: 'The cell & its world',
  description: 'Meet the small structures doing the big work of life.',
  subject: 'Biology',
  color: 'peach',
  icon: 'biology',
  sourceIds: ['biology-notes'],
  chapters: 'Cell foundations · Sections 1–3',
  createdAt,
  updatedAt: createdAt,
  materials: [
    {
      id: 'biology-cells',
      kind: 'lesson',
      title: 'A whole world in a cell',
      description: 'The basic cellular toolkit, and how compartments divide the work.',
      duration: 6,
      section: '1–2 · Cells & organelles',
      citations: biology('1. A shared unit of life; 2. Compartments with different jobs'),
      content: `## Small does not mean simple

Cells are the basic structural and functional units of living organisms. Some organisms are a single cell; others are made of many cells working together.

Cell theory gives us three starting ideas: organisms consist of cells, the cell is the basic unit of life, and new cells arise from existing cells.

### The shared essentials

The basic cellular toolkit includes a **plasma membrane**, **cytoplasm**, **genetic material**, and **ribosomes**. These are the starting features to look for in a typical cell.

- The membrane forms a selective boundary with the surroundings.
- The cytoplasm includes the cytosol and structures suspended in it.
- Genetic material stores biological instructions.
- Ribosomes assemble proteins using instructions carried by messenger RNA.

### Two ways to organize a cell

**Prokaryotic cells**, such as bacteria and archaea, lack a membrane-bound nucleus. Their DNA occupies a nucleoid region.

A typical **eukaryotic cell** has a membrane-bound nucleus and other membrane-bound organelles. Plants and animals are eukaryotes. Some specialized cells lose components as they mature: mammalian red blood cells, for example, lack a nucleus and ribosomes.

> No nucleus does not mean no DNA. Prokaryotes still have genetic material and ribosomes.

### Different compartments, different jobs

| Structure | A useful job to remember |
| --- | --- |
| Nucleus | Houses most of a eukaryotic cell's DNA |
| Ribosome | Assembles proteins |
| Rough ER and Golgi apparatus | Help process and route many proteins |
| Mitochondrion | Makes much of the ATP during aerobic respiration |
| Chloroplast | Converts light energy to chemical energy in photosynthesis |

Mitochondria convert energy into a form cells can use; they do not create energy from nothing.

### Plants need more than sunlight

Plant cells generally have a cellulose cell wall and a large central vacuole. Cells in photosynthetic tissues also have chloroplasts. Plant cells **also have mitochondria** and carry out cellular respiration.

The cell wall adds support outside the plasma membrane. It does not replace that selective membrane.

**Recall prompt:** Without looking back, name the four parts of the basic cellular toolkit. Then explain why a plant needs both chloroplasts and mitochondria.`,
    },
    {
      id: 'biology-transport-slides',
      kind: 'slides',
      title: 'The art of crossing a membrane',
      description: 'A cell tour, diffusion, osmosis, and active transport in six steps.',
      duration: 6,
      section: '2–3 · Cells & membrane transport',
      citations: biology('2. Compartments with different jobs; 3. Crossing a membrane'),
      slides: [
        {
          title: 'First, meet the cell',
          body: 'A photosynthetic plant cell divides work among specialized compartments.',
          bullets: ['Chloroplasts capture light energy.', 'Mitochondria make ATP.'],
          image: {
            src: '/illustrations/cell-tour.svg',
            alt: 'A simplified plant cell showing its wall, plasma membrane, nucleus, central vacuole, chloroplast, and mitochondrion.',
            caption: 'Original schematic · a photosynthetic plant cell',
          },
          notes:
            'The original illustration is a simplified organizational map, not a microscopic scale drawing. Plant cells also carry out cellular respiration. The cell wall supports the cell; it does not replace the plasma membrane.',
        },
        {
          title: 'A boundary with choices',
          body: 'Water-facing heads point outward. Lipid tails face each other inside the membrane.',
          bullets: ['Proteins help some substances cross.'],
          image: {
            src: '/illustrations/membrane-transport.svg',
            alt: 'A phospholipid bilayer has water-facing heads, inward-facing tails, and a protein channel.',
            caption: 'Original schematic · a selective boundary',
          },
          notes:
            'The bilayer separates watery environments inside and outside the cell. Small nonpolar molecules such as oxygen cross relatively easily; ions usually require proteins.',
        },
        {
          title: 'Diffusion follows a gradient',
          body: 'Particles move down their relevant gradient. A protein can help without making transport active.',
          bullets: [
            'Simple diffusion: through the bilayer.',
            'Facilitated diffusion: through a protein.',
          ],
          image: {
            src: '/illustrations/membrane-transport.svg',
            alt: 'Oxygen diffuses directly through a phospholipid bilayer while an ion passes through a protein channel; both illustrated routes are passive.',
            caption: 'Original schematic · two passive routes',
          },
          notes:
            'For ions, the electrochemical gradient includes both concentration and electrical differences. The arrows show movement down the relevant gradient; they do not represent ATP-powered pumping.',
        },
        {
          title: 'Water has its own name for this',
          body: 'With equal pressure and an impermeant solute, water moves toward higher effective solute concentration.',
          bullets: ['This net water movement is osmosis.'],
          image: {
            src: '/illustrations/osmosis.svg',
            alt: 'Water enters a cell in hypotonic surroundings and leaves in hypertonic surroundings under the stated assumptions.',
            caption: 'Original schematic · follow the net water movement',
          },
          notes:
            'Osmosis is net water movement across a selectively permeable membrane. Solute permeability matters when predicting cell volume. The diagram assumes the relevant solute cannot readily cross.',
        },
        {
          title: 'Sometimes the cell pays for a trip',
          body: 'Active transport uses energy to move substances against their electrochemical gradients.',
          bullets: ['An ATP-powered ion pump is one example.'],
          image: {
            src: '/illustrations/active-pump.svg',
            alt: 'An ATP-powered membrane pump moves ions against their gradient.',
            caption: 'Original schematic · energy supports active transport',
          },
          notes:
            'A channel allowing ions down their electrochemical gradient is passive. Merely using a membrane protein does not make a process active. ATP provides energy directly in this example.',
        },
        {
          title: 'Predict before you memorize',
          body: 'Check what can cross, the gradient, and whether energy is needed.',
          bullets: ['Water entry can swell a cell.', 'Water loss can shrink it.'],
          image: {
            src: '/illustrations/osmosis.svg',
            alt: 'Contrasting surrounding solute concentrations lead to opposite net water movements.',
            caption: 'Use the conditions to predict the change',
          },
          notes:
            'With relevant solutes unable to cross readily, hypotonic surroundings promote net water entry and hypertonic surroundings promote net water loss. Isotonic surroundings produce no net volume change from water, though water still moves both ways.',
        },
      ],
    },
    {
      id: 'biology-quiz',
      kind: 'quiz',
      title: 'Think like a cell',
      description: 'Five questions about structures, gradients, and little journeys.',
      duration: 4,
      section: '1–3 · Check your understanding',
      citations: biology('1–3 Cell foundations'),
      questions: [
        {
          id: 'bio-shared',
          prompt: 'Which structure is found in both prokaryotic and eukaryotic cells?',
          options: ['A membrane-bound nucleus', 'Chloroplasts', 'Ribosomes', 'A Golgi apparatus'],
          answer: 2,
          explanation:
            'Ribosomes are part of the basic toolkit of both prokaryotic and eukaryotic cells. Prokaryotes lack the membrane-bound organelles listed in the other options.',
        },
        {
          id: 'bio-plants',
          prompt: 'Which statement about plant cells is accurate?',
          options: [
            'They use chloroplasts instead of mitochondria.',
            'They can contain both chloroplasts and mitochondria.',
            'Their cell wall replaces the plasma membrane.',
            'They never carry out cellular respiration.',
          ],
          answer: 1,
          explanation:
            'Photosynthetic plant cells have chloroplasts, and plant cells also have mitochondria for cellular respiration. A cell wall does not replace the membrane.',
        },
        {
          id: 'bio-facilitated',
          prompt: 'An ion moves through a channel down its electrochemical gradient. What is this?',
          options: [
            'Facilitated diffusion',
            'Active transport',
            'Protein synthesis',
            'Photosynthesis',
          ],
          answer: 0,
          explanation:
            'A channel can support passive movement down a gradient. The presence of a membrane protein alone does not make transport active.',
        },
        {
          id: 'bio-water',
          prompt:
            'At equal pressure, water can cross a membrane but the dissolved solute cannot. Which direction is the net water movement?',
          options: [
            'Always out of the cell',
            'Toward the lower solute concentration',
            'There can never be net water movement',
            'Toward the higher effective solute concentration',
          ],
          answer: 3,
          explanation:
            'Under these assumptions, osmosis moves water toward the side with the higher effective solute concentration.',
        },
        {
          id: 'bio-equilibrium',
          prompt: 'What happens to particles at diffusion equilibrium?',
          options: [
            'They stop moving.',
            'They keep moving, with no net directional movement.',
            'They all move in only one direction.',
            'They require ATP for every movement.',
          ],
          answer: 1,
          explanation:
            'Equilibrium is dynamic. Random movement continues, but equal opposing movements produce no net change.',
        },
      ],
    },
    {
      id: 'biology-flashcards',
      kind: 'flashcards',
      title: 'Small structures, lasting memories',
      description: 'Eight essentials for your next biology session.',
      duration: 4,
      section: '1–3 · Recall practice',
      citations: biology('1–3 Cell foundations'),
      cards: [
        {
          id: 'bio-card-shared',
          front: 'What four features make up the basic cellular toolkit?',
          back: 'A plasma membrane, cytoplasm, genetic material, and ribosomes. Specialized cells may lose some components as they mature.',
        },
        {
          id: 'bio-card-nucleus',
          front: 'What separates typical prokaryotic from eukaryotic organization?',
          back: 'Typical eukaryotic cells have a membrane-bound nucleus and other membrane-bound organelles. Prokaryotes do not; their DNA occupies a nucleoid region.',
        },
        {
          id: 'bio-card-ribosomes',
          front: 'What do ribosomes do?',
          back: 'They assemble proteins using instructions carried by messenger RNA.',
        },
        {
          id: 'bio-card-mitochondria',
          front: 'Do plant cells have mitochondria?',
          back: 'Yes. Plant cells carry out cellular respiration as well as, in photosynthetic tissues, photosynthesis.',
        },
        {
          id: 'bio-card-bilayer',
          front: 'How are phospholipids arranged in a membrane?',
          back: 'Water-loving heads face the watery environments; water-avoiding tails point inward toward each other.',
        },
        {
          id: 'bio-card-passive',
          front: 'What makes facilitated diffusion passive?',
          back: 'Movement is down the relevant gradient without the cell supplying energy for that movement, even though a protein helps.',
        },
        {
          id: 'bio-card-osmosis',
          front: 'What is osmosis?',
          back: 'Net movement of water across a selectively permeable membrane. With equal pressure and an impermeant solute, water moves toward higher effective solute concentration.',
        },
        {
          id: 'bio-card-active',
          front: 'What does active transport need?',
          back: 'Energy, directly or indirectly, to move substances against their electrochemical gradients.',
        },
      ],
    },
  ],
};

const physicsCourse: Course = {
  schemaVersion: 1,
  id: 'physics',
  title: 'A little quantum curiosity',
  description: 'A gentle first look at photons, probabilities, and the very small.',
  subject: 'Physics',
  color: 'lavender',
  icon: 'physics',
  sourceIds: ['physics-notes'],
  chapters: 'Quantum foundations · Sections 1–3',
  createdAt,
  updatedAt: createdAt,
  materials: [
    {
      id: 'physics-photons',
      kind: 'lesson',
      title: 'Light, one little packet at a time',
      description: 'Photons, probabilities, and a gentler way into quantum ideas.',
      duration: 8,
      section: '1 & 3 · Photons & quantum states',
      citations: physics('1. Light arrives in quanta; 3. States, probabilities, and uncertainty'),
      content: String.raw`## Two useful ways to describe light

Light produces interference, a behavior we associate with waves. It also exchanges energy in discrete packets called **photons**. These descriptions help explain different observations.

The energy of a photon is

$$E=hf,$$

where $h$ is Planck's constant and $f$ is the light's frequency.

### Frequency sets the energy of each photon

A higher-frequency photon carries more energy. In a vacuum,

$$c=f\lambda,$$

so a shorter wavelength means a higher frequency and therefore more energy per photon.

**Brightness and photon energy are different ideas.** At a fixed frequency, doubling the number of photons doubles their total energy. It does not make each photon more energetic.

### The photoelectric clue

Light can eject electrons from a material. In the introductory one-photon model, a photon must supply enough energy to overcome the material's **work function**, $\Phi$.

When emission occurs, the maximum electron kinetic energy is

$$K_{\max}=hf-\Phi.$$

Below the threshold frequency, each photon has too little energy for this process. Increasing intensity adds more insufficiently energetic photons; it does not trigger one-photon emission.

Above threshold, increasing intensity at a fixed frequency increases the photon arrival rate. The maximum electron kinetic energy stays the same in this model.

> This is the usual introductory model. Very intense light can produce additional effects beyond its scope.

### Try a prediction

Two light beams have the same frequency. Beam B has twice as many photons per second as beam A.

- **Energy per photon:** the same.
- **Energy arriving per second:** twice as much for B.
- **Maximum photoelectron kinetic energy:** the same for the same material, provided the frequency is above threshold.

**Keep this distinction:** The number of photons tells you how many packets arrive. Frequency tells you the energy in each packet.

### What a quantum state tells us

A quantum state describes probabilities for possible measurement outcomes. Repeating the same preparation many times reveals a predictable distribution, even when the next individual result is uncertain.

A **superposition** is a linear combination of states relative to a chosen basis. It can produce interference; it is more than simply not knowing which classical alternative is true.

For position and momentum, the spreads of their measurement distributions satisfy

$$\sigma_x\sigma_p\geq\frac{\hbar}{2}.$$

Here $\hbar=h/(2\pi)$. Making a state's position spread smaller raises the minimum allowed momentum spread. The relation concerns properties of quantum states, not just imperfect instruments, and the product need not be exactly the minimum.

**Try explaining it:** A single result can be uncertain while the distribution over many trials is predictable. How is that different from saying “anything can happen”?`,
    },
    {
      id: 'physics-two-slits',
      kind: 'slides',
      title: 'Two slits. Many small surprises.',
      description: 'A careful first look at the experiment behind the mystery.',
      duration: 5,
      section: '2 · Interference',
      citations: physics('2. Two paths, one surprising pattern'),
      slides: [
        {
          title: 'Start with a simple setup',
          body: 'A coherent source, two slits, and a screen. Each detection is localized.',
          bullets: ['Photons or electrons can show this behavior.'],
          image: {
            src: '/illustrations/photon-wave.svg',
            alt: 'A coherent source illuminates two openings, with detections recorded on a screen.',
            caption: 'Original schematic · the two-slit setup',
          },
          notes:
            'The diagram is conceptual and shows no individual particle trajectory. A single localized event is one observation; the distribution over many trials is another.',
        },
        {
          title: 'Give the pattern time to grow',
          body: 'Many localized detections reveal interference when coherent paths remain indistinguishable.',
          bullets: ['Each event is one dot.', 'The pattern needs many trials.'],
          image: {
            src: '/illustrations/photon-wave.svg',
            alt: 'A coherent source illuminates two slits; individual detector dots accumulate in an interference pattern on a screen.',
            caption: 'Original schematic · illustrative dots, not measured data',
          },
          notes:
            'Quantum theory predicts probabilities for outcomes; many repetitions reveal the distribution. The original diagram shows schematic wavefronts, not individual particle trajectories. Its illustrative detector dots are not experimental measurements.',
        },
        {
          title: 'One at a time still works',
          body: 'The pattern can build even when particles are sent one at a time.',
          bullets: [
            'It does not require particles colliding with one another.',
            'Indistinguishable alternatives contribute probability amplitudes.',
          ],
          notes: 'Add amplitudes first, then take their squared magnitude to obtain probabilities.',
        },
        {
          title: 'Which path changes the question',
          body: 'A physical interaction can make the alternatives distinguishable and remove ordinary interference.',
          bullets: ['A conscious observer is not required.'],
          image: {
            src: '/illustrations/which-path.svg',
            alt: 'An illustrative screen pattern has interference bands without a path record and no bands when paths are distinguishable.',
            caption: 'Original conceptual comparison · not measured data',
          },
          notes:
            'The key is distinguishability of the alternatives. Recording partial path information can reduce interference; fully distinguishable paths remove the ordinary pattern. It does not depend on a person reading the record.',
        },
        {
          title: 'Keep both observations in view',
          body: 'Individual detections are localized. The accumulated distribution can show interference.',
          bullets: [
            'Do not mistake one random result for an unpredictable distribution.',
            'Avoid treating the particle as just a tiny classical ball on a known route.',
          ],
          notes:
            'The full quantum description is more precise than switching between everyday pictures.',
        },
      ],
    },
    {
      id: 'physics-quiz',
      kind: 'quiz',
      title: 'A quantum check-in',
      description: 'Five conceptual questions. No advanced maths required.',
      duration: 4,
      section: '1–3 · Check your understanding',
      citations: physics('1–3 Quantum foundations'),
      questions: [
        {
          id: 'physics-energy',
          prompt: 'What happens to a photon’s energy when its frequency doubles?',
          options: ['It halves.', 'It stays the same.', 'It doubles.', 'It becomes zero.'],
          answer: 2,
          explanation: 'E=hf, so photon energy is directly proportional to frequency.',
        },
        {
          id: 'physics-brightness',
          prompt:
            'At a fixed frequency above the photoelectric threshold, increasing light intensity changes what in the introductory model?',
          options: [
            'The photon arrival rate increases.',
            'The energy of every photon increases.',
            'The maximum photoelectron kinetic energy increases.',
            'The work function of the material doubles.',
          ],
          answer: 0,
          explanation:
            'At fixed frequency, individual photons still have energy hf. More intensity means more energy arriving per second and more photons, not a larger maximum kinetic energy.',
        },
        {
          id: 'physics-single',
          prompt:
            'Can a two-slit interference pattern build when particles are sent one at a time?',
          options: [
            'No, particles must collide to interfere.',
            'Only if a person watches each particle.',
            'Only if every detection occurs at the same point.',
            'Yes, under suitable coherence and indistinguishability conditions.',
          ],
          answer: 3,
          explanation:
            'Each detection is localized, but many single-particle trials can build an interference pattern. Collisions between particles are not required.',
        },
        {
          id: 'physics-observer',
          prompt: 'What can remove ordinary two-slit interference?',
          options: [
            'A person thinking about the experiment.',
            'An interaction that makes the paths distinguishable.',
            'Sending particles one at a time.',
            'Recording many localized detections without path information.',
          ],
          answer: 1,
          explanation:
            'Physical interactions that record which-path information make the alternatives distinguishable. A conscious observer is not needed.',
        },
        {
          id: 'physics-uncertainty',
          prompt: 'What does the position–momentum uncertainty relation primarily constrain?',
          options: [
            'How carefully a scientist can read a ruler.',
            'The number of particles in a laboratory.',
            'The simultaneous spreads of position and momentum in a quantum state.',
            'The speed of light.',
          ],
          answer: 2,
          explanation:
            'The relation σx·σp≥ℏ/2 constrains the measurement-distribution spreads of a state. It is not merely an instrument defect.',
        },
      ],
    },
    {
      id: 'physics-flashcards',
      kind: 'flashcards',
      title: 'Keep the curiosity',
      description: 'Eight ideas to recall, explain, and connect.',
      duration: 4,
      section: '1–3 · Recall practice',
      citations: physics('1–3 Quantum foundations'),
      cards: [
        {
          id: 'physics-card-photon',
          front: 'How is photon energy related to frequency?',
          back: 'E=hf. Higher frequency means more energy per photon.',
        },
        {
          id: 'physics-card-wavelength',
          front: 'In a vacuum, does a shorter wavelength mean more or less photon energy?',
          back: 'More. Since c=fλ, shorter wavelength means higher frequency, and E=hf.',
        },
        {
          id: 'physics-card-intensity',
          front: 'At fixed frequency, does more intensity make each photon more energetic?',
          back: 'No. It increases the arriving energy per second through a greater photon arrival rate; each photon still has energy hf.',
        },
        {
          id: 'physics-card-work',
          front: 'What is a material’s work function?',
          back: 'The minimum energy needed to remove an electron in the introductory photoelectric model.',
        },
        {
          id: 'physics-card-detection',
          front: 'What builds the two-slit interference pattern?',
          back: 'Many localized detections whose distribution reflects interference between coherent, indistinguishable alternatives.',
        },
        {
          id: 'physics-card-observer',
          front: 'Does changing interference require a conscious observer?',
          back: 'No. Physical interactions that make path information distinguishable can change interference.',
        },
        {
          id: 'physics-card-superposition',
          front: 'What is a superposition?',
          back: 'A linear combination of quantum states relative to a chosen basis. It can allow interference and is not merely ignorance of a classical alternative.',
        },
        {
          id: 'physics-card-uncertainty',
          front: 'What does σx·σp≥ℏ/2 tell us?',
          back: 'A quantum state cannot have arbitrarily small position and momentum spreads simultaneously. The product need not equal the minimum.',
        },
      ],
    },
  ],
};

// Original source texts are embedded so agents can read them through the source API.
const calculusNotes = `# Calculus, made clear

Original example notes for the Mori study portal. This is an original teaching
sample, not an extract from a textbook or a file uploaded by a user.

Scope: Chapters 1–2.3. Prerequisites: basic algebra, coordinates, and exponents.

## 1.1 Functions: an input, one output

A function assigns exactly one output to each input in its domain. For
\`f(x) = x²\`, the input 3 gives the output 9: \`f(3) = 9\`. The domain is the set of
allowed inputs; the range is the set of outputs actually produced. Over the
real numbers, \`f(x) = x²\` has domain all real numbers and range \`[0, ∞)\`.

A graph represents a function of x when each vertical line meets it at most
once. Different inputs may share an output: both 2 and −2 map to 4 under \`x²\`.
That does not violate the function rule.

Domain restrictions come from the expression and the situation. For
\`g(x) = 1/(x−2)\`, exclude 2 because division by zero is undefined. For
\`h(x) = √(x−1)\` with real outputs, require \`x ≥ 1\`. A time model for a short
experiment may have a practical domain such as \`0 ≤ t ≤ 10\` even if its formula
is algebraically defined beyond those times.

## 1.2 Change over an interval

The average rate of change of f from a to b, with \`a ≠ b\`, is
\`[f(b)−f(a)]/(b−a)\`. Geometrically this is the slope of the secant line through
the two corresponding graph points. For \`f(x)=x²\` from x=1 to x=3, the average
rate is \`(9−1)/(3−1)=4\`. The output units are divided by the input units.

For a position function measured in metres and time in seconds, an average
rate of change is an average velocity in metres per second. Negative velocity
means position is decreasing relative to the chosen coordinate direction; it
does not mean the elapsed time is negative.

## 1.3 Limits and continuity

The statement \`lim(x→a) f(x)=L\` means the values of f(x) can be made as close
as desired to L by taking x sufficiently close to a, with x different from a.
For \`f(x)=x²\`, values approach 4 as x approaches 2 from either side. For example,
1.9²=3.61, 1.99²=3.9601, 2.01²=4.0401, and 2.1²=4.41.

A two-sided limit exists when the left-hand and right-hand limits both exist
and agree. If the left limit is 1 and the right limit is 3, there is no
two-sided limit. A limit is about nearby behavior; it need not equal the value
at the point, and the function need not be defined there.

For \`r(x)=(x²−4)/(x−2)\`, x=2 is excluded. Factoring the numerator gives
\`r(x)=x+2\` for \`x ≠ 2\`, so \`lim(x→2) r(x)=4\`. The graph has a hole at (2,4).
Canceling a factor simplifies nearby behavior but does not restore the
excluded input in the original function.

A function is continuous at a if f(a) is defined, the limit as x approaches a
exists, and the limit equals f(a). The original r is not continuous at 2,
although defining a new function with the same nearby values and value 4 at
2 fills the hole. Polynomials are continuous at every real input.

## 2.1 The derivative: change at an instant

The derivative at a is the limit of average rates of change:

\`f′(a) = lim(h→0) [f(a+h)−f(a)]/h\`, if this finite limit exists.

The derivative is the instantaneous rate of change and the slope of the
tangent line at a. The small interval h may be positive or negative; it
approaches zero but is not zero while the quotient is formed.

For \`f(x)=x²\`, expand \`(a+h)²=a²+2ah+h²\`. The difference quotient simplifies
to \`(2ah+h²)/h = 2a+h\` for \`h ≠ 0\`. Its limit is \`2a\`. Thus \`f′(x)=2x\`, and
the tangent slope at x=3 is 6. An output such as f(3)=9 is a height; f′(3)=6
is a rate. They answer different questions.

Being continuous is not enough to guarantee a derivative. The function
\`f(x)=|x|\` is continuous at 0 but has left slope −1 and right slope +1, so
it is not differentiable there. Differentiability at a implies continuity at a.

## 2.2 A small toolkit of derivative rules

For the polynomial examples in these notes:

- A constant has derivative zero: \`(c)′=0\`.
- For an integer \`n ≥ 1\`, \`(xⁿ)′=n xⁿ⁻¹\`.
- A constant multiple comes along: \`(c f)′=c f′\`.
- Differentiate sums and differences term by term.

Examples: \`(x³)′=3x²\`; \`(4x³−2x+7)′=12x²−2\`;
\`(3x²+5x−4)′=6x+5\`. At x=2 the last derivative equals 17.

For differentiable functions, the product rule is \`(uv)′=u′v+uv′\`, and the
chain rule is \`(f(g(x)))′=f′(g(x))g′(x)\`. They are mentioned as a next step;
most work in this sample needs only the polynomial rules above. A frequent
mistake is to differentiate x³ as 3x³: the power must decrease by one.

## 2.3 Tangent lines and local predictions

The tangent line to y=f(x) at x=a is
\`y = f(a) + f′(a)(x−a)\`. It uses both the point \`(a,f(a))\` and the slope
\`f′(a)\`. For \`f(x)=x²\` at a=3, this becomes \`y=9+6(x−3)=6x−9\`.
Substituting x=3 gives y=9, as it should.

Near a, the tangent line gives the linear approximation
\`f(a+Δx) ≈ f(a)+f′(a)Δx\`. For x² near a=3, using Δx=0.02 gives
\`3.02² ≈ 9+6(0.02)=9.12\`. The exact value is 9.1204, so the approximation
is low by 0.0004. In this example the omitted term is \`(Δx)²\`; a larger
step generally produces a larger error. A tangent approximation is local,
not a promise of accuracy far from the point of contact.

If \`s(t)=t²\` metres for \`t ≥ 0\` seconds, then \`v(t)=2t\` metres per second.
At t=3 the instantaneous velocity is 6 m/s. Average velocity from t=3 to
t=3.2 is \`(10.24−9)/0.2=6.2\` m/s. These are compatible: the object is
speeding up across that interval.

## Study route

1. Identify a function, its domain, and its outputs (1.1).
2. Compute a secant slope and interpret its units (1.2).
3. Separate a limit from the function value at the point (1.3).
4. Explain how a limiting secant slope becomes a derivative (2.1).
5. Differentiate simple polynomials (2.2).
6. Build a tangent line and use a small local prediction (2.3).

All examples and exercises are original. Quiz explanations and flashcards in
the sample course are derived from these notes.
`;

const biologyNotes = `# The cell & its world

Original example notes for the Mori study portal. This teaching sample is
not an extract from a textbook or a file uploaded by a user.

Scope: Cell foundations, sections 1–3.

## 1. A shared unit of life

Cells are the basic structural and functional units of living organisms.
Cell theory states that living organisms consist of one or more cells, cells
are the basic unit of life, and new cells arise from existing cells.

The basic cellular toolkit includes a plasma membrane, cytoplasm, genetic
material, and ribosomes. Specialized cells can lose some components; mature
mammalian red blood cells, for example, lack a nucleus and ribosomes.
The membrane separates a cell from its surroundings and selectively controls
exchange. Cytoplasm includes the cytosol and the structures suspended in it.
Ribosomes assemble proteins using instructions carried by messenger RNA.

Prokaryotic cells, including bacteria and archaea, lack a membrane-bound
nucleus. Their DNA occupies a nucleoid region. The typical eukaryotic cell has a
membrane-bound nucleus and other membrane-bound organelles. Lack of a
nucleus does not mean lack of DNA or lack of ribosomes. Eukaryotic cells are
generally larger, but size alone is not a dependable classification test.

## 2. Compartments with different jobs

In a typical eukaryotic cell, the nucleus houses most of the DNA. Ribosomes
make proteins; the rough endoplasmic reticulum and Golgi apparatus help
process and route many proteins destined for secretion or membranes.
Mitochondria carry out much of aerobic cellular respiration and make ATP,
a molecule that transfers energy for cellular work. Mitochondria convert
energy; they do not create it from nothing.

Plant cells generally have a cellulose cell wall outside the plasma membrane,
a large central vacuole, and, in photosynthetic tissues, chloroplasts.
Chloroplasts convert light energy to chemical energy through photosynthesis.
Plant cells also have mitochondria and carry out cellular respiration.
Animal cells lack chloroplasts and cellulose cell walls. A cell wall adds
support; it does not replace the selectively permeable plasma membrane.

## 3. Crossing a membrane

The plasma membrane is primarily a phospholipid bilayer with associated
proteins. The hydrophilic heads face the watery environments inside and
outside the cell; hydrophobic tails face inward toward each other. Small
nonpolar molecules such as oxygen can cross the lipid bilayer relatively
easily; ions usually require membrane proteins.

Diffusion is the net movement of particles down a concentration gradient
because of random molecular motion. At equilibrium, particles keep moving,
but there is no net movement in one direction. Simple diffusion and
facilitated diffusion are passive: they do not require the cell to supply
energy for movement down the relevant gradient. Facilitated diffusion uses
membrane proteins such as channels or carriers. For ions, the relevant
driving force is an electrochemical gradient, combining concentration and
electrical differences.

Osmosis is the net movement of water across a selectively permeable membrane.
In a simple comparison at equal pressure, with a solute that cannot cross,
water moves toward the side with a higher effective solute concentration.
The permeability of the solute matters when predicting cell volume.

Active transport uses energy, directly or indirectly, to move substances
against their electrochemical gradients. An ATP-powered ion pump is one
example. A channel that lets ions move down their electrochemical gradient
is not automatically an active transporter simply because it is a protein.

If a cell is placed in a hypotonic solution relative to its interior, and
the relevant solutes cannot readily cross the membrane, net water entry can
make it swell. In a hypertonic solution, net water loss can make it shrink.
In an isotonic solution, there is no net water movement that changes its
volume, though water continues to cross in both directions. Plant cell walls
help resist excess expansion as water enters.

## Study route

Explain the basic cellular toolkit, compare prokaryotic and eukaryotic organization,
connect organelles to their jobs, and predict membrane transport by checking
what can cross, the gradient, and whether energy is required.

All sample questions and flashcards are derived from these original notes.
`;

const physicsNotes = `# A little quantum curiosity

Original example notes for the Mori study portal. This conceptual teaching
sample is not an extract from a textbook or a file uploaded by a user.

Scope: Quantum foundations, sections 1–3. No advanced mathematics required.

## 1. Light arrives in quanta

Light can exhibit interference, a wave-like behavior, and it exchanges energy
in discrete amounts called photons. A photon's energy is \`E=hf\`, where h is
Planck's constant and f is frequency. For the same frequency, doubling the
number of photons doubles their total energy but does not change each
photon's energy. A higher-frequency photon has more energy than a
lower-frequency photon. In a vacuum, frequency and wavelength obey \`c=fλ\`,
so a shorter wavelength corresponds to a higher photon energy.

In the photoelectric effect, light can eject electrons from a material. In
the ideal introductory model, one photon transfers energy to one electron.
Emission requires enough energy to overcome a material-dependent work
function Φ, with maximum electron kinetic energy \`K_max=hf−Φ\` when \`hf ≥ Φ\`.
Below the threshold frequency, increasing intensity does not cause
one-photon emission. Above threshold, increasing intensity at fixed
frequency increases the photon arrival rate; the maximum kinetic energy
stays fixed in this model. Very intense light can involve additional effects
outside this introductory model.

## 2. Two paths, one surprising pattern

Send particles such as electrons or photons toward a barrier with two open
slits and record detections on a screen. Each detection is localized. With
coherent illumination and no available information distinguishing the
paths, many individual detections build an interference pattern. Quantum
theory adds probability amplitudes for alternatives that remain
indistinguishable, then takes the squared magnitude to obtain a probability.

The setup can send particles one at a time, so the interference does not
require two particles colliding with one another. The prediction concerns
the distribution built from many trials, not a precise prediction of the
location of the next individual detection.

If an interaction records which slit was taken so that the alternatives
become distinguishable, the ordinary interference pattern is reduced or
lost. This change depends on physical interactions and distinguishability,
not on a conscious person looking at the apparatus. Avoid picturing a
quantum object as merely a tiny classical ball following a known route.

## 3. States, probabilities, and uncertainty

A quantum state encodes probabilities for possible measurement outcomes.
A superposition is a linear combination of states relative to a chosen
basis. It can allow interference; it is not simply a declaration that we
have forgotten which pre-existing classical alternative is true.

Measurement outcomes follow the probabilities predicted by the state and
the measurement performed. Repeating an experiment on similarly prepared
systems lets us estimate those probabilities. A single random result does
not mean the underlying probability distribution is unpredictable.

For position x and momentum p, the standard deviations of their measurement
distributions obey \`σ_x σ_p ≥ ℏ/2\`. Here \`ℏ=h/(2π)\`. The uncertainty relation
sets a limit on the spreads that a quantum state can have simultaneously.
It is not solely a claim about clumsy instruments or an experimenter
disturbing a previously definite classical position and momentum.

Position and momentum are different quantities: momentum is mass times
velocity in the nonrelativistic setting. If a state's position spread is
made smaller, the minimum allowed momentum spread grows. The relation is
an inequality; it does not say that every state has a product exactly equal
to \`ℏ/2\`.

## Study route

Relate photon energy to frequency, distinguish a localized detection from
the interference pattern built over many detections, and describe
uncertainty as a property of quantum states rather than just faulty tools.

All sample questions and flashcards are derived from these original notes.
`;

function exampleSource(id: string, name: string, text: string): Source {
  return {
    id,
    name,
    type: 'text',
    size: new TextEncoder().encode(text).length,
    createdAt,
    url: `/sources/${id}.md`,
    text,
  };
}

export const demoWorkspace: Workspace = {
  courses: [calculusCourse, biologyCourse, physicsCourse],
  sources: [
    exampleSource('calculus-notes', 'Calculus · original example notes.md', calculusNotes),
    exampleSource('biology-notes', 'Cell biology · original example notes.md', biologyNotes),
    exampleSource('physics-notes', 'Quantum physics · original example notes.md', physicsNotes),
  ],
  requests: [],
};
