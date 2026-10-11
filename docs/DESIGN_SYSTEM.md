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

| Element | Convention | Example |
|---|---|---|
| Brand | Prompt glyph plus name | `>_ TechBash` |
| Section heading | Shell command line above the title | `$ ./techbash --about` |
| Button and link-button | Square brackets, uppercase | `[ START DEMO ]` |
| Badge | Tight brackets, uppercase | `[BEGINNER]` |
| Panel | 1px border, `+` at the four corners, optional title bar | `+-- [ preview ] --+` |
| List marker | `>` for items, `#` for comments | `> 5 questions` |
| Progress | Filled and empty cells | `[###-------] 3/10` |
| Status | Short uppercase word with a prefix | `OK`, `! ERROR`, `... SENDING` |
| Cursor | Block that blinks | `_` or `█` |

Rules for characters:

- Use `+ - | > _ # [ ]` and box-drawing characters (`─ │ ┌ ┐ └ ┘`). Do not mix in emoji.
- Real ASCII art (multi-line `<pre>`) is for the logo and a few illustrations. It is
  marked `aria-hidden="true"` and always has a text equivalent next to it.
- Panel borders are CSS borders with corner glyphs, so panels reflow at any width.
  Do not draw full boxes with text characters.

## Color

Tokens are defined in `app/globals.css` under `@theme` and used through Tailwind utilities
(`bg-bg`, `text-fg`, `border-line`, `text-accent`, ...).

| Token | Value | Role | Contrast on `bg` |
|---|---|---|---|
| `bg` | `#0b0f0c` | Page background | — |
| `surface` | `#111712` | Panel and input background | — |
| `line` | `#2f4234` | Borders and rules (decorative) | — |
| `fg` | `#d7e4d9` | Body text | 14.5:1 |
| `muted` | `#8fa595` | Secondary text, comments | 7.3:1 |
| `accent` | `#4ade80` | Primary accent: links, primary button, focus | 10.9:1 |
| `amber` | `#fbbf24` | Secondary accent: highlights, demo and warning labels | 11.4:1 |
| `danger` | `#f87171` | Errors | 6.9:1 |

Semantic use:

- Accent green means "interactive" or "success". Do not use it for plain body text.
- Amber marks things that need a second look: demo content, intermediate difficulty,
  warnings.
- Red is only for errors and wrong answers. Meaning is never carried by color alone;
  errors also carry a `!` prefix and text.
- Text on an accent or amber background uses `bg` as its color.

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

| Component | Purpose | Notes |
|---|---|---|
| `Button`, `ButtonLink` | Actions and navigation CTAs | Variants `primary`, `secondary`. Renders its label inside `[ ]`. `ButtonLink` wraps `next/link`. |
| `Panel` | Bordered container | Optional `title` shown as `[ title ]` in a top bar. Corner glyphs come from the `ascii-corners` utility. |
| `Badge` | Short status or label | Tones `accent`, `amber`, `muted`, `danger`. |
| `Field` | Label, input or textarea, hint and error | Wires `id`, `aria-describedby`, `aria-invalid`. |
| `PageHeading` | Prompt line, `<h1>` and intro | Used at the top of every page except Home. |

Feature components (`components/home`, `components/quiz`, `components/contact`,
`components/layout`) compose these and must not restyle them with one-off classes.

CSS utilities in `app/globals.css`:

| Utility | Effect |
|---|---|
| `ascii-corners` | Adds `+` glyphs to the four corners of a bordered box |
| `cursor-blink` | Blinking block cursor |
| `ascii-rule` | Horizontal rule drawn as a dashed line |

## Interaction states

| State | Treatment |
|---|---|
| Hover | Colors invert: accent background, `bg` text. Transition 120ms on color only. |
| Focus (keyboard) | `outline: 2px solid accent`, `outline-offset: 2px`. Never removed. |
| Active | Element shifts down 1px. |
| Selected (quiz option) | Accent border and text, marker changes from `( )` to `(x)`. |
| Loading | Label becomes `... SENDING` (or similar), control is disabled, `aria-busy="true"`. |
| Error | `danger` border, message below starting with `!`, linked by `aria-describedby`. |
| Disabled | 50% opacity, dashed border, `cursor: not-allowed`, no hover inversion. |
| Planned (not yet available) | Dashed border, `muted` text, `[PLANNED]` badge. Not focusable as a link. |

## Responsive behavior

- Mobile first. Breakpoints are Tailwind defaults; `sm` (640px) and `md` (768px) are the
  ones in use.
- Navbar: below `md` the four links collapse behind a `[ MENU ]` toggle that opens a
  full-width list with large tap targets. From `md` up they sit in a row.
- Hero: the wide ASCII logo is shown from `sm` up. Below that a compact logo is shown so
  nothing scrolls sideways.
- Grids: one column on mobile, two from `sm`, three from `lg` where content allows.
- Tap targets are at least 44px tall on touch layouts.
- The page never scrolls horizontally. A `<pre>` that cannot fit scrolls inside its own box.

## Accessibility and motion

- Contrast: body text and controls meet WCAG AA (4.5:1). Values are in the color table.
- A skip link to `#main` is the first focusable element.
- One `<h1>` per page. ASCII art is never the only heading.
- Form controls have visible `<label>`s. Errors use `aria-invalid` and `aria-describedby`;
  the form-level result uses a live region.
- Quiz options are native radio inputs, so arrow keys work.
- Motion is limited to the cursor blink and short color transitions. Under
  `prefers-reduced-motion: reduce` animations stop and transitions are removed.

## Keeping the identity consistent

- Add a color, size or border style as a token first. No hex values in components.
- New buttons, badges and panels use the existing components. Extend a variant instead of
  styling a `<div>` to look similar.
- Every bracketed label is uppercase. Every panel has square corners.
- Use Lucide icons only when a character cannot say it. Keep them 16px and `currentColor`.
- Do not add gradients, glass effects, drop shadows, rounded cards or decorative animation.
- Update this file when a token, component or convention changes.
