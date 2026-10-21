# Calculus, made clear

Original example notes for the Mori study portal. This is an original teaching
sample, not an extract from a textbook or a file uploaded by a user.

Scope: Chapters 1–2.3. Prerequisites: basic algebra, coordinates, and exponents.

## 1.1 Functions: an input, one output

A function assigns exactly one output to each input in its domain. For
`f(x) = x²`, the input 3 gives the output 9: `f(3) = 9`. The domain is the set of
allowed inputs; the range is the set of outputs actually produced. Over the
real numbers, `f(x) = x²` has domain all real numbers and range `[0, ∞)`.

A graph represents a function of x when each vertical line meets it at most
once. Different inputs may share an output: both 2 and −2 map to 4 under `x²`.
That does not violate the function rule.

Domain restrictions come from the expression and the situation. For
`g(x) = 1/(x−2)`, exclude 2 because division by zero is undefined. For
`h(x) = √(x−1)` with real outputs, require `x ≥ 1`. A time model for a short
experiment may have a practical domain such as `0 ≤ t ≤ 10` even if its formula
is algebraically defined beyond those times.

## 1.2 Change over an interval

The average rate of change of f from a to b, with `a ≠ b`, is
`[f(b)−f(a)]/(b−a)`. Geometrically this is the slope of the secant line through
the two corresponding graph points. For `f(x)=x²` from x=1 to x=3, the average
rate is `(9−1)/(3−1)=4`. The output units are divided by the input units.

For a position function measured in metres and time in seconds, an average
rate of change is an average velocity in metres per second. Negative velocity
means position is decreasing relative to the chosen coordinate direction; it
does not mean the elapsed time is negative.

## 1.3 Limits and continuity

The statement `lim(x→a) f(x)=L` means the values of f(x) can be made as close
as desired to L by taking x sufficiently close to a, with x different from a.
For `f(x)=x²`, values approach 4 as x approaches 2 from either side. For example,
1.9²=3.61, 1.99²=3.9601, 2.01²=4.0401, and 2.1²=4.41.

A two-sided limit exists when the left-hand and right-hand limits both exist
and agree. If the left limit is 1 and the right limit is 3, there is no
two-sided limit. A limit is about nearby behavior; it need not equal the value
at the point, and the function need not be defined there.

For `r(x)=(x²−4)/(x−2)`, x=2 is excluded. Factoring the numerator gives
`r(x)=x+2` for `x ≠ 2`, so `lim(x→2) r(x)=4`. The graph has a hole at (2,4).
Canceling a factor simplifies nearby behavior but does not restore the
excluded input in the original function.

A function is continuous at a if f(a) is defined, the limit as x approaches a
exists, and the limit equals f(a). The original r is not continuous at 2,
although defining a new function with the same nearby values and value 4 at
2 fills the hole. Polynomials are continuous at every real input.

## 2.1 The derivative: change at an instant

The derivative at a is the limit of average rates of change:

`f′(a) = lim(h→0) [f(a+h)−f(a)]/h`, if this finite limit exists.

The derivative is the instantaneous rate of change and the slope of the
tangent line at a. The small interval h may be positive or negative; it
approaches zero but is not zero while the quotient is formed.

For `f(x)=x²`, expand `(a+h)²=a²+2ah+h²`. The difference quotient simplifies
to `(2ah+h²)/h = 2a+h` for `h ≠ 0`. Its limit is `2a`. Thus `f′(x)=2x`, and
the tangent slope at x=3 is 6. An output such as f(3)=9 is a height; f′(3)=6
is a rate. They answer different questions.

Being continuous is not enough to guarantee a derivative. The function
`f(x)=|x|` is continuous at 0 but has left slope −1 and right slope +1, so
it is not differentiable there. Differentiability at a implies continuity at a.

## 2.2 A small toolkit of derivative rules

For the polynomial examples in these notes:

- A constant has derivative zero: `(c)′=0`.
- For an integer `n ≥ 1`, `(xⁿ)′=n xⁿ⁻¹`.
- A constant multiple comes along: `(c f)′=c f′`.
- Differentiate sums and differences term by term.

Examples: `(x³)′=3x²`; `(4x³−2x+7)′=12x²−2`;
`(3x²+5x−4)′=6x+5`. At x=2 the last derivative equals 17.

For differentiable functions, the product rule is `(uv)′=u′v+uv′`, and the
chain rule is `(f(g(x)))′=f′(g(x))g′(x)`. They are mentioned as a next step;
most work in this sample needs only the polynomial rules above. A frequent
mistake is to differentiate x³ as 3x³: the power must decrease by one.

## 2.3 Tangent lines and local predictions

The tangent line to y=f(x) at x=a is
`y = f(a) + f′(a)(x−a)`. It uses both the point `(a,f(a))` and the slope
`f′(a)`. For `f(x)=x²` at a=3, this becomes `y=9+6(x−3)=6x−9`.
Substituting x=3 gives y=9, as it should.

Near a, the tangent line gives the linear approximation
`f(a+Δx) ≈ f(a)+f′(a)Δx`. For x² near a=3, using Δx=0.02 gives
`3.02² ≈ 9+6(0.02)=9.12`. The exact value is 9.1204, so the approximation
is low by 0.0004. In this example the omitted term is `(Δx)²`; a larger
step generally produces a larger error. A tangent approximation is local,
not a promise of accuracy far from the point of contact.

If `s(t)=t²` metres for `t ≥ 0` seconds, then `v(t)=2t` metres per second.
At t=3 the instantaneous velocity is 6 m/s. Average velocity from t=3 to
t=3.2 is `(10.24−9)/0.2=6.2` m/s. These are compatible: the object is
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
