# Design System

TechBash looks like a terminal that someone designed carefully. The ASCII language is the
structure of the interface, not decoration on top of it.

## Visual principles

1. **Text is the material.** Borders, buttons, progress and status are drawn with
   characters or with lines that read as characters.
2. **One typeface, one grid.** Everything is monospaced. Alignment does the work that
   color and shadow do elsewhere.
3. **Dark, quiet, high contrast.** Near-black surface, light text, one accent in use at a
   time.
4. **Square and flat.** No rounded corners, shadows, gradients or blur.
5. **Readable first.** If an ASCII effect hurts legibility or accessibility, drop the effect.

## ASCII language

| Element                | Convention                                              | Example                        |
| ---------------------- | ------------------------------------------------------- | ------------------------------ |
| Brand                  | Prompt glyph plus name                                  | `>_ TechBash`                  |
| Section heading        | Shell command line above the title                      | `$ ./techbash --about`         |
| Button and link-button | Square brackets, uppercase                              | `[ START DEMO ]`               |
| Badge                  | Tight brackets, uppercase                               | `[BEGINNER]`                   |
| Panel                  | 1px border, `+` at the four corners, optional title bar | `+-- [ preview ] --+`          |
| List marker            | `>` for items, `#` for comments                         | `> 5 questions`                |
| Progress               | Filled and empty cells                                  | `[###-------] 3/10`            |
| Status                 | Short uppercase word with a prefix                      | `OK`, `! ERROR`, `... SENDING` |
| Cursor                 | Underscore that blinks                                  | `_`                            |

Rules for characters:

- Use plain ASCII: `+ - | > _ # [ ] ( ) / \`. Do not use emoji.
- Do not use Unicode box-drawing or block characters (`─ │ ┌ █`). The Latin subset of
  JetBrains Mono that `next/font` ships does not contain them, so they would render in a
  fallback font and break alignment.
- Real ASCII art (multi-line `<pre>`) is for the logo and a few illustrations. It is
  marked `aria-hidden="true"` and always has a text equivalent next to it.
- Panel borders are CSS borders with corner glyphs, so panels reflow at any width.
  Do not draw full boxes with text characters.

## Color

Tokens are defined in `app/globals.css` under `@theme` and used through Tailwind utilities
(`bg-bg`, `text-fg`, `border-line`, `text-accent`, ...).

| Token     | Value     | Role                                                  | Contrast on `bg` |
| --------- | --------- | ----------------------------------------------------- | ---------------- |
| `bg`      | `#0b0f0c` | Page background                                       | —                |
| `surface` | `#111712` | Panel and input background                            | —                |
| `line`    | `#2f4234` | Borders and rules (decorative)                        | —                |
| `fg`      | `#d7e4d9` | Body text                                             | 14.5:1           |
| `muted`   | `#8fa595` | Secondary text, comments                              | 7.3:1            |
| `accent`  | `#4ade80` | Primary accent: links, primary button, focus          | 10.9:1           |
| `amber`   | `#fbbf24` | Secondary accent: highlights, demo and warning labels | 11.4:1           |
| `danger`  | `#f87171` | Errors                                                | 6.9:1            |

Semantic use:

- Accent green means "interactive" or "success". Do not use it for plain body text.
- Amber marks things that need a second look: demo content, intermediate difficulty,
  warnings.
- Red is only for errors and wrong answers. Meaning is never carried by color alone;
  errors also carry a `!` prefix and text.
- Text on an accent or amber background uses `bg` as its color.
- Difficulty badges: beginner is `accent`, intermediate is `amber`, advanced is `fg`.
  Advanced is not red, because red is reserved for errors.

The palette is provisional (ADR-004). Changing it means editing the token values only.

## Typography

- Family: JetBrains Mono (`next/font/google`, variable `--font-mono`), falling back to
  `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- Body: 15px on mobile, 16px from `sm`, line height 1.6.
- Headings: uppercase, weight 700, letter spacing `0.04em`. Sizes follow the Tailwind
  scale: page title `text-2xl` → `sm:text-4xl`, section title `text-lg` → `sm:text-xl`.
- Labels, badges and buttons: uppercase, `text-sm`, letter spacing `0.08em`.
- Paragraphs are limited to about 70 characters (`max-w-prose` or `max-w-[70ch]`).
- `<pre>` art uses `line-height: 1.1` and never wraps.

## Spacing and borders

- Spacing uses the Tailwind 4px scale. Common steps: `2`, `4`, `6`, `10`, `16`.
- Page container: `max-w-5xl`, horizontal padding `px-4` (`sm:px-6`).
- Vertical rhythm between page sections: `py-12` (`sm:py-16`).
- Borders are 1px solid `line`. Dashed borders mark planned or disabled content.
- Corner radius is `0` everywhere.
- No box shadows.

## Components

All in `components/ui/`.

| Component                       | Purpose                                       | Notes                                                                                                                  |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Button`, `ButtonLink`          | Actions and navigation CTAs                   | Variants `primary`, `secondary`, `danger`. Renders its label inside `[ ]`. `ButtonLink` wraps `next/link`.             |
| `Panel`                         | Bordered container                            | Optional `title` shown as `[ title ]` on the top border. `dashed` marks planned content. Draws four `+` corner glyphs. |
| `Badge`                         | Short status or label                         | Tones `accent`, `amber`, `fg`, `muted`, `danger`.                                                                      |
| `Field`                         | Label, input / textarea / select, hint, error | `multiline` for a textarea, `options` for a select. `id` override when a page repeats a form.                          |
| `Checkbox`                      | Native checkbox drawn as `[x]` / `[ ]`        | Visible focus via `has-focus-visible`.                                                                                 |
| `ActionForm`                    | Form bound to a Server Action                 | Pending label, live result (`OK ...` / `! ...`), issue list, one-time secret, `confirmLabel` for a two-click delete.   |
| `Table`, `EmptyRow`             | Data tables                                   | Scrolls inside its own bordered box (`TableScroller`), never the page; says so below when wider than the screen.       |
| `Stat`                          | Dashboard number                              | Label, value, optional detail.                                                                                         |
| `PageHeading`, `SectionHeading` | `$ command` + `<h1>`; `# Title` `<h2>`        |                                                                                                                        |
| `Loading`                       | Suspense fallback                             | `... label_` in a status region.                                                                                       |

Feature components outside `ui/`: `rounds/progress-bar.tsx` (`[###-------] 3/10`),
`rounds/round-badges.tsx` (`[OPEN] [20 MIN] [CLUE BY CLUE]`), `rounds/round-runner.tsx`,
`people/person-card.tsx` (photo or `[DA]` initials frame), `admin/bar-chart.tsx` (bars of
`accent` / `amber` / `muted` fill in a `line` border; tabs are `aria-pressed` buttons;
the readout below is a live region), `admin/attempt-cell.tsx` (`-`, `... 3`, `OK 7*`), `admin/live-leaderboard.tsx` (round
strip, standings with a `+2` / `-1` / `=` move column: accent up, amber down, with screen
reader text), `admin/top-five-dialog.tsx` (native modal `<dialog>` holding a `Panel`: figlet
`TOP 5` banner, places typed in from the lowest up to #1, #1 in accent with a blinking
cursor; Escape, the backdrop or `[ CLOSE ]` closes it).

Feature components (`components/home`, `components/test`, `components/rounds`,
`components/admin`, `components/people`, `components/contact`, `components/layout`)
compose these and must not restyle them with one-off classes.

Code snippets (Bug Hunt) render in a bordered `surface` box with muted line numbers that
are `aria-hidden` and not selectable. Long lines wrap under their own number, so on a phone
no code hides behind a sideways scroll.

CSS utilities in `app/globals.css`:

| Utility          | Effect                                                          |
| ---------------- | --------------------------------------------------------------- |
| `ascii-corner`   | Positions one `+` glyph on a corner of a bordered box           |
| `ascii-grid`     | Faint dot grid background (hero only)                           |
| `animate-blink`  | Blinking cursor (theme animation token)                         |
| `animate-reveal` | Line typed in from the left (`clip-path`, 28 steps); top 5 only |

## Interaction states

| State                       | Treatment                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Hover                       | Colors invert: accent background, `bg` text. Transition 120ms on color only.       |
| Focus (keyboard)            | `outline: 2px solid accent`, `outline-offset: 2px`. Never removed.                 |
| Active                      | Element shifts down 1px.                                                           |
| Selected (quiz option)      | Accent border and text, marker changes from `( )` to `(x)`.                        |
| Loading                     | Label becomes `... SENDING` (or similar), control is disabled, `aria-busy="true"`. |
| Error                       | `danger` border, message below starting with `!`, linked by `aria-describedby`.    |
| Disabled                    | 50% opacity, dashed border, `cursor: not-allowed`, no hover inversion.             |
| Planned (not yet available) | Dashed border, `muted` text, `[PLANNED]` badge. Not focusable as a link.           |

## Responsive behavior

- Mobile first. Breakpoints are Tailwind defaults; `sm` (640px) and `md` (768px) are the
  ones in use.
- Navbar: below `md` the three links collapse behind a `[ MENU ]` toggle that opens a
  full-width list with large tap targets. From `md` up they sit in a row.
- Hero: one ASCII logo, 44 columns wide, with a fluid font size
  (`clamp(7px, 2.5vw, 18px)`) so it fits a 320px screen without scrolling.
- Grids: one column on mobile, two from `sm`, three from `lg` where content allows.
- Tap targets are at least 44px tall on touch layouts (`min-h-11`; 41px where the root
  font is 15px, below `sm`), including footer links, email and phone links and dashboard
  chart rows (compact from `lg`).
- Long words (names, emails) wrap: `body` sets `overflow-wrap: break-word`; flex children
  that hold user text need `min-w-0`.
- The page never scrolls horizontally. Verified on every page, logged out, as a participant
  and as an admin, at 320, 360, 375, 390, 414, 740 (landscape phone), 768, 1024, 1280 and
  1920px wide (2026-11-18).

## Accessibility and motion

- Contrast: body text and controls meet WCAG AA (4.5:1). Values are in the color table.
- A skip link to `#main` is the first focusable element.
- One `<h1>` per page. ASCII art is never the only heading.
- Form controls have visible `<label>`s. Errors use `aria-invalid` and `aria-describedby`;
  the form-level result uses a live region.
- Quiz options are native radio inputs, so arrow keys work.
- Motion is limited to the cursor blink, short color transitions and one exception: the
  leaderboard's top 5 popup types its places in (`animate-reveal`), a moment meant to be
  watched. Under `prefers-reduced-motion: reduce` animations stop and transitions are
  removed; the top 5 then shows complete at once.

## Keeping the identity consistent

- Add a color, size or border style as a token first. No hex values in components.
- New buttons, badges and panels use the existing components. Extend a variant instead of
  styling a `<div>` to look similar.
- Every bracketed label is uppercase. Every panel has square corners.
- Use Lucide icons only when a character cannot say it. Keep them 16px and `currentColor`.
- Do not add gradients, glass effects, drop shadows, rounded cards or decorative animation
  (the top 5 reveal is the one recorded exception).
- Update this file when a token, component or convention changes.
