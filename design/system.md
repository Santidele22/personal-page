# Design system — personal-page (synced 2026-06)

Sources read: `personal-app/src/app/styles/global.css`, `personal-app/astro.config.mjs`, `personal-app/src/app/layouts/BaseLayout.astro`, `personal-app/src/widgets/{hero,about,projects,services,contact}/`, `personal-app/src/entities/project/ProjectCard.astro`, `personal-app/src/shared/ui/` (mapped via explorer with `path:line` evidence).

Aesthetic: wabi-sabi / sumi-e. Washi paper background, ink foreground, aka (red seal) as the single accent. Square cards (no radius), no shadows on grid cards, generous whitespace, Shippori Mincho headings.

## Colors

Light (`:root`, global.css:37-58):

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#f4efe4` | washi paper page bg |
| `--foreground` | `#23201a` | ink text, primary buttons |
| `--card` | `#fbf8f0` | card surface |
| `--secondary` | `#ece5d4` | alternating section bands (`bg-secondary/40`), chips |
| `--muted` | `#ebe4d2` | muted surfaces |
| `--muted-foreground` | `#6f6657` | body/lede copy, eyebrows |
| `--accent` | `#e9e1cd` | hover accents |
| `--border` | `#ddd2bc` | hairline borders everywhere |
| `--aka` | `#c73e3a` | the one accent: icons, final heading period, hover borders, hanko seals |
| `--aka-deep` | `#a02f2b` | pressed/deep red |
| `--ink-soft` | `#57503f` | secondary ink |
| `--destructive` | `#a6362f` | destructive |
| `--ring` | `#c73e3a` | focus ring |

Dark (`.dark`, global.css:61-82): `--background #14110d`, `--foreground #eae3d3`, `--card #1c1812`, `--secondary #241f17`, `--muted #231e16`, `--muted-foreground #a29681`, `--accent #2a241a`, `--border #322b20`, `--aka #d95448`, `--aka-deep #c73e3a`, `--ink-soft #b3a78e`, `--destructive #d95448`. Dark works purely through CSS variables — components use **zero** `dark:` utility classes.

## Typography

Self-hosted woff2 via Astro experimental fonts (`astro.config.mjs:118-152`, activated in `BaseLayout.astro:65-67`):

| Font | CSS var | Tailwind | Weights | Role |
| --- | --- | --- | --- | --- |
| Shippori Mincho | `--font-shippori` | `font-mincho` | 400/600 | headings (h1/h2/h3), quote text |
| Zen Kaku Gothic New | `--font-zen` | `font-sans` | 400/500/700 | body default (body sets `font-sans`) |
| Geist Mono | `--font-geist-mono` | `font-mono` | 400/600 | tiny accents only (hanko `</>` seal) |

Artboard fallback stacks (no external fonts allowed in artboards): mincho → `'Shippori Mincho','Hiragino Mincho ProN','Yu Mincho',serif`; zen → `'Zen Kaku Gothic New','Hiragino Kaku Gothic ProN','Yu Gothic',system-ui,sans-serif`; mono → `'Geist Mono',ui-monospace,'SF Mono',monospace`.

Conventions:
- Section h2: `mt-3 font-mincho text-3xl font-semibold tracking-tight sm:text-4xl`; final period wrapped in `<span class="text-aka">.</span>`.
- Eyebrow/kicker: 13px, `font-medium tracking-[0.25em] uppercase text-muted-foreground`, preceded by a `size-4 text-aka` icon and short aka rule.
- Lede: `text-[15px] leading-relaxed text-muted-foreground`, `mt-4`.
- Card h3: `font-mincho text-xl font-semibold tracking-tight`.
- Body copy: `text-[15px] leading-relaxed text-muted-foreground`; `body` sets `font-feature-settings: "palt" 1`.

## Spacing / layout

- Container: `mx-auto max-w-6xl px-5 sm:px-8`.
- Section rhythm: `py-16 lg:py-24`; alternating sections get `border-y border-border bg-secondary/40`.
- Anchors: `scroll-mt-20`; `html { scroll-padding-top: 5rem; scroll-behavior: smooth }`.
- Radius: `--radius: 0.375rem`; chips `rounded-sm`, buttons `rounded-md`; **grid cards are square (no radius)**.

## Components

- **Section heading block**: eyebrow (aka icon + uppercase label) → mincho h2 with aka final period → muted lede; optional "Ver todos" arrow link top-right.
- **Card**: `border border-border bg-card p-6/p-7 hover:border-aka/60 transition-colors`, no radius, no shadow.
- **Chips**: `rounded-sm bg-secondary px-2 py-0.5 text-[11px] font-medium tracking-wide`.
- **Icon tile**: `size-11 border border-aka/40 text-aka`.
- **Primary button**: `rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-aka hover:text-[#fdf8ee]`.
- **Secondary button**: `rounded-md border border-border px-6 py-3 text-sm hover:border-aka hover:text-aka`.
- **Hanko seal** (`.hanko`): square aka block with inset shadow, mono `</>` or initials, `#fdf8ee` ink.
- **Framed art**: `shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]` + aka corner brackets; soft `bg-aka opacity-[0.06] rounded-full` blobs behind.
- **SeigaihaBand**: SVG concentric wave pattern at `opacity-[0.16]` as section divider.
- **Noise**: fixed washi `feTurbulence` overlay on `body::after` at 0.045 opacity.
- **Reveal**: `.reveal` keyframe `translateY(20px) → 0`, 0.7s, staggered via `--reveal-delay`; all motion zeroed under `prefers-reduced-motion`.

## Rules for new sections

1. Only `--aka` for accent color; never introduce a second hue.
2. Square cards, hairline `--border`, hover swaps border to `aka/60`.
3. Mincho for anything a reader should feel (headings, quotes); Zen for everything functional.
4. Dark mode comes free via tokens — reference vars, never hard-code hex in components.
5. Respect `prefers-reduced-motion` for every animation.
