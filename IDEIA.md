# ideia

An interactive derivation builder. The player is handed a program and a grammar,
and has to hang the parse tree that connects them — by hand, piece by piece.

## The metaphor

The screen is a room.

On the **floor**, the token stream of a short program, laid out horizontally in
a single line. It never moves.

On the **ceiling**, one hook: the start symbol.

Between them, a tall empty space — that space is the tree waiting to be built.

Off to the side, a **toolbox of forks**. Each fork is one production rule of the
grammar: a ring at the top, and branches descending from it, each branch ending
in a hook of its own. Rings and hooks are labelled with simple geometric icons —
circle, triangle, square, diamond — one shape per non-terminal.

The player drags a fork from the toolbox and drops its ring onto a free hook.
The ring only fits a hook of the same shape, so a production can only be applied
to a goal it actually derives. Then the player stretches the fork's branches
downward, toward the floor, and hangs more forks on them.

The hanging is finished when every branch has reached the floor and every token
is accounted for.

## Why the metaphor carries the grammar

Two rules do the real work:

**Branches may not cross.** A parse tree's leaves must match the token stream in
order. If crossing is forbidden, the ordering constraint is enforced by the
physics of the room — the player feels it instead of being told it. This is the
central mechanic.

**The floor is fixed.** The tokens cannot be moved or reordered, so the yield of
the tree is fixed in advance.

Together, those two mean a hanging is physically possible exactly when the
derivation is valid. The puzzle and the parsing problem are the same problem —
which is the whole point, and is worth protecting as the grammars get bigger.

## Languages, as a difficulty ramp

1. **`aⁿbⁿ`, `0ⁿ1ⁿ0ⁿ` and friends** — the tiny grammars from the opening chapter
   of every formal-languages book. Two or three rules, a two-symbol alphabet.
   Here the lesson is just the mechanic: nesting, depth, matching.

2. **Arithmetic with precedence** — `E → E + T | T`, `T → T * F | F`,
   `F → ( E ) | num`. This is where the tree *shape* becomes the lesson: why
   `2 + 3 * 4` can only hang one way, why left recursion leans the tree left,
   what a parenthesis actually buys. The first level that teaches something a
   student can't already see in the source text.

3. **LET**, the first language in Friedman & Wand's *Essentials of Programming
   Languages* (3rd ed.). Small, real, and has binding structure.

4. **A small ALGOL**, possibly with C's concrete syntax. Statement nesting, and
   eventually the dangling `else` — where one token stream hangs two different
   ways and both are legal. Ambiguity stops being a warning in a compiler and
   becomes something you can see with your hands.

*Considered and dropped: Forth.* Its grammar is effectively `program → word*` —
a flat tree with no shape to discover. Forth teaches the **stack**, which is
semantics, not syntax, and it is already taught that way elsewhere in the
course. It has nothing to offer a tree-shape puzzle.

## Valid and invalid programs

Each language ships with generated example programs, some inside the grammar and
some outside it. For an invalid program the goal inverts: the player has to fail
to build the tree, and the learning is in discovering *where* it jams.

## Stages of practice

The game grows in stages, and what changes between them is how much of the tree
the player builds by hand.

**Stage 1 — build all of it.** Small to almost-medium trees, few languages, no
automation. Every fork is hung by hand, including the dull chains like
`E → T → F`: this is where the mechanic is learned, so nothing is done for the
player. Languages: the counting grammars and arithmetic with precedence.

**Stage 2 — decide what matters.** Bigger programs and more languages (LET, the
small ALGOL). Each level comes with most of the tree already hung and leaves
open only the decisions that teach something — where precedence splits an
expression, which `if` a dangling `else` belongs to. The same program gets
harder by leaving more of it open.

Not in either stage yet: sealing a finished subtree into a single block, and
hanging forced forks automatically.

## Platform

Touch first, even though the first build runs in a browser.

The eventual target is a small screen, so the interaction is designed for touch
from the start rather than built for the mouse and ported later.

Tap-to-select-then-tap-to-place was tried first and failed: nobody could find
the gesture. What stayed is direct manipulation. A fork lands in the room
touching nothing, and every part of it is dragged: the branch moves the whole
fork, the ring moves only the ring, each hook moves only itself. Sibling hooks
push each other away gently, only sideways, and never swap order. Snapping is
just what happens when a piece is let go near a place that accepts it.

### Where it runs, eventually

Cloudflare, with Effect-TS throughout: Workers and Pages for delivery, plus
whichever Cloudflare storage primitive fits once the app actually has state to
keep.

That is a direction, not a task. The prototype needs no backend at all — one
hardcoded level, no accounts, no saved progress, nothing over the network. So
the infrastructure stays postponed, and postponing it costs nothing as long as
one cheap rule holds from the first line:

**No Node-only APIs, in the app or in the grammar engine.** Workers run a
web-standard runtime rather than Node, so anything written against `fs`,
`path`, Node streams or Node's `Buffer` would have to be rewritten to move
there. Staying on web-standard APIs — `fetch`, Web Crypto, `Request`/`Response`
— keeps that door open for free, and the grammar engine is pure computation
that has no reason to reach for Node in the first place.

Everything else waits until there is a reason: where levels live, whether
progress syncs between devices, whether there are accounts at all.

## First prototype

The grammar engine is the easy half: checking a derivation is on the order of a
hundred lines. All the risk is in whether hanging forks *feels* good or fiddly.

So the first build is one hardcoded `aⁿbⁿ` level — one hook, two forks,
snap-to-hook, no crossing, win detection. No grammar file format, no level
editor, nothing general. If it is satisfying to play, the idea is real and the
rest is work. If it is fiddly, better to find out before building a framework
on top of it.

## Open questions

1. **Do terminal branches snap to specific tokens?** A branch ending in `+`
   should probably refuse to land on a `(`. If it snaps only where it matches,
   that is the whole feedback channel and there may be no need for error
   messages at all.

   Tokens are categorized (numbers, indentificators, reserved words - each
   one is its proper categories, etc.) These are special kind of hooks.

2. **How is ε drawn?** A branch that reaches the floor consuming no token. This
   is exactly where students lose the thread, so it deserves a deliberate
   picture — a branch that stops short, or one that lands in the gap between two
   tokens.

   Lands in the gap.

3. **Top-down only, or bottom-up too?** As described the player always works
   downward from the ceiling. Letting them instead group tokens on the floor
   under a fork and hoist the assembly upward gives shift-reduce parsing with
   the same pieces — one app teaching both strategies. This changes the data
   model, so it wants deciding early.

   Why not both?

4. **Is stretching meaningful, or just layout?** If stretching only makes room
   for deep trees, it should be automatic. Stretching every branch by hand will
   get tedious.

   Whatever beautiful way to show the dragging act is fine.

5. **Continuous validation, or a "check" button?** Turning green as you go makes
   it a puzzle; checking at the end makes it a test. Those are different
   products.

   Check button

6. **How does the player claim a program is unparseable?** Without an explicit
   "this one cannot be hung" move, the invalid examples just leave them flailing
   until they quit, and the lesson is lost.

   A button too
