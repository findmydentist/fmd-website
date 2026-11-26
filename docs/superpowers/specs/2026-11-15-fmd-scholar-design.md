# FMD Scholar: design

Date: 2026-11-15 · Status: draft for approval · Plan of record: [`docs/FMD_SCHOLAR_PLAN.md`](../../FMD_SCHOLAR_PLAN.md) (parts, rules, API contracts). This doc adds the design decisions from the design round; where they differ, this doc wins.

## Why

FMD Scholar is the AI study workspace that comes with the ₹400/yr student membership (PDR §8). Like the rest of the frontend-first build, the goal now is that founders, the team and investors can see and use every Scholar screen on sample data and agree on it before the backend and an AI vendor exist.

## Goals

1. Every part in `FMD_SCHOLAR_PLAN.md` §0 (1.1 to 6) built as a working demo on sample data, phone and laptop, light and dark.
2. A distinct **study mode** look: Scholar should feel like a quiet, reading-first study app, not a feed.
3. Honesty rules hold everywhere: nothing fabricated (especially references), uncertainty visible, usage cost shown before it's spent.

## Non-goals

- Backend, real AI model, real file generation (PPTX), real payments.
- Changing FMD Main's look or its theme system beyond reading it.
- Scholar access for dentists or companies.

## Anti-goals (a failure even if it works)

- A reference that looks real but isn't (invented author, journal, DOI or year), anywhere, including demo content.
- Looking like FMD Main's feed or a generic chat app: dense chrome, cards everywhere, chat bubbles for long answers.
- Usage being spent without warning, or an answer cut off at the limit.
- Small, low-contrast text on the paper background.

## Constraints

- Next.js 16 / React 19 app in `web/`; sample-data pattern (`src/sample/*`, async functions shaped like the API, `sample/store.ts` for persistence, `sample/files.ts` for uploads).
- No new dependencies (Source Serif 4 is a font, loaded the same way as Plus Jakarta Sans via `next/font`).
- Rules from `FMD_MAIN_PLAN.md` §1–2 (formats, states, a11y, one `*.test.ts` per part for real logic, checks).
- Work on a new branch `feat/scholar` from `main`, not on `feat/explore-jobs-redesign`.

## Approaches

Two looks were mocked up side by side on the same Ask screen:
- **A. Calm and bright**, FMD Main's Explore/Jobs language (sans-serif, white cards on grey, persistent left rail). Fastest, most shared code, feels like part of FMD Main.
- **B. Study mode**, its own reading-first look (warm paper, serif answers, narrow column, sources in the margin, menu tucked away).

**The owner picked B** (15 Nov 2026), then approved B in dark and on phone, and asked for a light/dark toggle on both.

How to build it: one sensible way, the existing frontend-first pattern (route group + sample module + shared kit). A separate app or package was ruled out: it would duplicate sign-in, membership and the kit for no gain at demo stage.

## Visual language: study mode (decided)

**Light, "paper":** background `#f7f4ee`, cards `#fffdf9`, ink `#2b2722`, muted `#7d746a`, faint `#9a8f82`, hairlines `#e6dfd3` / `#ddd5c8`. Accent: FMD royal blue `#0a3fd1` (links, citation numbers, selected states, primary meter). Amber `#c98a2b` / text `#6b4a14` for "Uncertain", unverified references and the 80% meter.

**Dark, "night":** FMD obsidian warmed slightly: background `#0d0c0b`, raised `#171513`, hairline `#2a2622`, ink `#ebe5da`, body `#d9d2c5`, muted `#b3ab9f`, faint `#8f877b`. Accent `#6f97ff`; amber `#d9a24a` / text `#e3c28c`.

**Type:** answers, questions, slide titles and page titles in **Source Serif 4** (~17px body on laptop, 16.5px phone, line-height ~1.7, measure ≤ 62ch). Everything else (UI, labels, meters, buttons) in Plus Jakarta Sans. Small caps-style uppercase labels for section heads (`DEPTH`, `SOURCES`, `NEXT`).

**Layout:**
- Laptop: slim top bar (logo + context, usage pill, Menu, theme toggle). No persistent rail; "Menu" opens the navigation (Home, Ask, Study, Viva, Decks, Research, Library, Usage, Settings, Back to FMD). Content in a centred reading column with a right margin for depth, sources and next steps.
- Phone: top bar (logo, usage pill, theme toggle); depth as chips above the answer; sources under the answer; ask box pinned above a bottom tab bar (Home, Ask, Create, Library, Me). Create opens a sheet (Quiz, Flashcards, Viva, Deck, Research).
- Separation by space and hairlines, few cards. Answers are prose, never chat bubbles; the user's question is the page heading.

**Theme toggle (decided: both laptop and phone):** reuse `ThemeToggle` from `components/nav/ThemeSwitcher.tsx`, which flips the global theme between FMD's light and dark and stores it. Scholar maps that to paper/night with scoped tokens: a `.scholar` wrapper in `globals.css` redefines the colour variables for light themes (paper) and dark themes (night). *Builder's call made here:* this keeps one theme preference across FMD Main and Scholar rather than adding new theme IDs.

**Labels in this look:** "Uncertain: …" as an amber left-rule italic note; citations as blue superscript numbers keyed to the margin list; each source says **Your file · name, p. N**, **Verified · …** (not used in demo) or **Unverified · check this source** in amber. AI note under every output. "Demo" tag in faint text.

## Screens approved in the design round

Mockups in `.superpowers/brainstorm/` (local, not committed):
1. **Ask** (laptop light, laptop dark, phone light): question as serif heading, depth picker, prose answer, Uncertain note, margin sources, Next (Explain simpler · Quiz me on this · Make flashcards), ask box at the bottom.
2. **Home:** greeting with next exam date, four starts (Ask a doubt, Practise a viva, Build a seminar, Research help), Continue list with kind labels, this month's meters (amber from 80%), reset date, projects.
3. **Viva session:** "Question n of 5", examiner question in serif, user's answer, examiner follow-up as blue-ruled italic, actions Answer · Speak answer · Skip · Show model outline; session steps on the right; "Practice only" note.
4. **Presentation editor:** slide thumbnails left, 16:9 slide + speaker notes centre, right margin with this slide's sources, unverified-reference warning for the deck, and Change this: Edit text · Regenerate slide (cost) · Regenerate section · Regenerate deck (cost); "your edits are kept"; AI-disclosure note. Unknowns in a paper are written "not stated in the paper".

**Left to the builder, in the same language** (no separate mockup round, by owner's go-ahead): research workspace, Library, Usage, Settings, "limit reached", access gate states, study tools (quiz, flashcards, summary, revision plan), viva set-up and review, deck set-up and outline, Ask my documents, and phone versions of every screen. Follow the patterns above: serif for content, margin for metadata, one primary action per screen.

## Behaviour

As in `FMD_SCHOLAR_PLAN.md` §4, parts 1.1 to 6, including entitlement states, usage counting and limits, demo AI over a fixed topic set, citation states, refusals in research, export as PDF/Markdown with PPTX shown as coming, and the journeys in §5. Demo defaults for open decisions are in that plan's §6.

## Left to the builder

- Component breakdown, file names under `components/scholar/`, sample-module split.
- The seeded demo topics' wording (reviewed for dental accuracy; no invented references).
- Exact responsive breakpoints, motion, empty-state copy.
