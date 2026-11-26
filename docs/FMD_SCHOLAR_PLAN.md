# FMD Scholar: build plan

**Source:** `FMD_Master_PDR_Expanded_Revised.pdf` §8 (FMD Scholar), plus §2 (ecosystem), §10 (file generation), §13 (safety), §14 (pricing), §16 (Scholar metrics), §18 (student journey), §19 (QA-08), §21 (open decisions) and Annex D (personalisation).
**Written:** 15 Nov 2026. **Status:** built on sample data on `feat/scholar` (15 Nov 2026); full build, journey walk-through and review pending. Design: `docs/superpowers/specs/2026-11-15-fmd-scholar-design.md`. Fills the "Scholar" row of `IMPLEMENTATION_ROADMAP.md`.
**Scope:** the FMD Scholar frontend in `web/`, built on sample data like FMD Main. The backend (FastAPI, `main-websie/server`) and the AI model are later. Requirement IDs (SCH-xx, ECO-04, COM-08, ANL-03, QA-08, E2E-05) are from `PRD_TRACEABILITY.md` §7.

---

## 0. Progress

All parts are **DEMO** until the backend and a model vendor (OD-14) exist.

| # | Part | Requirements | Status |
|---|---|---|---|
| 0 | Design round: mockups approved by the owner | Roadmap | **Done** (study mode, 15 Nov 2026) |
| 1.1 | Access gate and entitlement | SCH-01, SCH-04, SCH-05, ECO-04 | **Built** (demo) |
| 1.2 | Scholar shell and home | §8.5 | **Built** (demo) |
| 1.3 | Usage meter and limits | SCH-02, SCH-03, COM-08 | **Built** (demo) |
| 2.1 | Ask: doubt clarification with levels | SCH-06, SCH-07, SCH-11 | **Built** (demo) |
| 2.2 | Study tools: quizzes, flashcards, summaries, revision plans | SCH-08 | **Built** (demo) |
| 2.3 | Viva practice | SCH-09 | **Built** (demo) |
| 2.4 | Ask my documents (uploads with page references) | SCH-10 | **Built** (demo) |
| 3.1 | Presentation builder | SCH-12, SCH-13, SCH-14, SCH-16, SCH-17, SCH-18 | **Built** (demo) |
| 3.2 | Presentation export | SCH-15 (BX) | **Built** (demo) |
| 4.1 | Research workflows | SCH-19 – SCH-24 | **Built** (demo) |
| 5.1 | Workspace: projects, library, tags, history | §8.5 | **Built** (demo) |
| 5.2 | Export, delete and retention | §8.5 | **Built** (demo) |
| 6 | Cross-cutting: integrity labels, a11y, analytics events, journey QA | QA-08, ANL-03, E2E-05 | **Built** (demo) |

We go top to bottom. A part is ticked only when it meets `FMD_MAIN_PLAN.md` §2 "Done for every part".

---

## 1. How we build

Everything in `FMD_MAIN_PLAN.md` §1 applies (where code goes, look, formats, `<Fresh>`, `useMe()`, one `*.test.ts` per part for real logic). What's specific to Scholar:

**Where code goes**
- Pages: `src/app/(scholar)/scholar/<route>/page.tsx`, its own route group and layout, so Scholar is a separate app (ECO-01) that shares sign-in with FMD Main.
- Components: `src/components/scholar/<part>/`. Reuse `components/app/kit.tsx`, `Sheet.tsx` and the chat pieces from `components/main/assistant/Chat.tsx` where they fit; copy-and-adapt only if Scholar's chat really differs.
- Demo data: `src/sample/scholar.ts` (and `scholar-<part>.ts` if it grows past one file). Persist with the existing `sample/store.ts`; uploaded files with `sample/files.ts` (IndexedDB).
- Demo AI: a labelled rule-based provider like FMD Main's (`server/adapters/ai.ts`), answering from a small reviewed set of seeded topics (for example: dental caries, pulpitis, Class II cavity preparation, local anaesthesia, periodontal classification). Anything outside the set gets an honest "demo covers these topics only" reply, not a made-up answer.

**Reuse, don't rebuild**
- Entitlement and usage: `sample/billing.ts` already has the student plan, `usage("student")` (200 questions and 10 presentations a month, demo limits) and `SCHOLAR_EXTRA`. Scholar reads these; it does not keep its own copy.
- Demo sign-in: the `student` role already exists in `lib/demo.ts`; the "FMD Scholar workspace (coming soon)" menu item becomes the link to `/scholar`.
- Safety: `lib/aiSafety.ts` guards, plus the Scholar labels below.

**Labels that must never be faked (PDR §1, §8.2–8.4, §13)**
- Every AI output carries "AI-generated study material. Check it against your textbooks, guidelines or faculty."
- **No fabricated references, ever, including in the demo.** Demo citations are either from the user's own uploaded document (with its page number) or marked "Unverified: check this source". The demo never invents an author, journal, DOI or year that looks real.
- Uncertainty and conflicting evidence are shown as a visible "Uncertain" / "Evidence differs" note on the answer, not hidden in the prose (SCH-11).
- Research outputs say "Draft. Not completed research or original findings" (SCH-23).
- Sample content shows a "Demo" tag. Anything that would cost usage says so before it runs.

---

## 2. Done for every part

As `FMD_MAIN_PLAN.md` §2, plus:
- [ ] Every generated output shows its label, and its citations show verified / from your file / unverified.
- [ ] Each action that uses allowance shows the cost first ("Uses 1 of your 32 remaining questions").

---

## 3. App structure

### 3.1 Routes (all signed in, student with active Scholar access)

| Route | What |
|---|---|
| `/scholar` | Home: continue where you left off, projects, usage meter, quick starts (Ask, Viva, Seminar, Research) |
| `/scholar/ask`, `/scholar/ask/[id]` | Doubt chat with level picker; saved conversations |
| `/scholar/study/[kind]` | Quiz, flashcards, summary, revision plan (`kind` = quiz · flashcards · summary · plan) |
| `/scholar/viva`, `/scholar/viva/[id]` | Viva set-up, session, review |
| `/scholar/decks`, `/scholar/decks/[id]` | Presentation builder and editor |
| `/scholar/research`, `/scholar/research/[id]` | Research workflows |
| `/scholar/projects/[id]` | One project: its chats, files, outputs |
| `/scholar/library` | Everything saved: search, tags, filters |
| `/scholar/usage` | Detailed meter, reset date, upgrade path |
| `/scholar/settings` | Default level, export, delete, retention, AI-disclosure reminder |

Not entitled → `/scholar/access` (see 1.1). Signed out → `/login?next=/scholar`.

### 3.2 Navigation
- Laptop: left rail (Home, Ask, Study, Viva, Decks, Research, Library), top bar with project picker, usage pill and avatar menu (includes "Back to FMD").
- Phone: bottom tabs Home, Ask, Create (sheet: Quiz, Viva, Deck, Research), Library, Me.
- FMD Main's avatar menu shows "FMD Scholar" for students.

---

## 4. Parts

Each part: **Screens** · **Rules** · **States** · **Done when** · **API** (proposed contract for the backend team).

### 0. Design round
- Mockups for: Home, Ask with level picker and an "Uncertain" answer, viva session, deck editor, research draft, library, usage-limit reached, access gate. Phone and laptop.
- Owner approves before building (roadmap "Mockup first"). Decide here whether Scholar keeps the obsidian-royal theme or gets a study-mode variant.

### 1.1 Access gate and entitlement
- **Screens:** `/scholar/access` explaining who gets Scholar and why you don't yet: not a student → "Scholar comes with the ₹400/yr student membership" + link to `/plans`; student, unpaid → checkout; student ID pending → "We're checking your student ID"; expired → renew; in grace → banner with days left.
- **Rules:** access only with an active student membership (ECO-04); grace period from `billing.ts` (14 days, demo term, OD-05); dentists and companies have **no** Scholar access (SCH-05) and no self-activation. Work is kept read-only during expiry, not deleted.
- **Done when:** a test covers active / grace / expired / non-student / ID-pending → the right screen.
- **API:** `GET /scholar/entitlement → {status: active|grace|expired|none|pending, ends_at, grace_ends_at}`.

### 1.2 Scholar shell and home
- **Screens:** shell from §3.2; home with "Continue" (last 3 items), projects, meter, quick starts, and a one-time intro covering what Scholar is and isn't (no clinical advice for patients, verify sources, academic integrity).
- **States:** first visit (empty, with three suggested starts), returning, read-only (expired).

### 1.3 Usage meter and limits (removed 16 Nov 2026)
- **Superseded:** the owner made Scholar unlimited with the student membership (`PRD_CHANGES.md` P11). The meters, costs and Usage page are gone; a Progress page takes its place. The text below is kept for history.
- **Screens:** usage pill in top bar, `/scholar/usage` with per-feature meters, reset date, and the tentative ₹350 extra shown as "planned, not on sale" (`SCHOLAR_EXTRA`).
- **Rules:** warn at 80%; at 100% the action is refused with a clear message and the upgrade path, never a silent charge or a silent cut-off mid-answer (COM-08). Limits are config, not hard-coded in screens (SCH-02). Which actions count: one question, one quiz/flashcard set, one viva session, one deck generation, one research draft; regenerating a single slide counts as one question (demo assumption, OD-05).
- **Done when:** test for counting, 80% warn, refuse at limit, reset at month start (IST).
- **API:** `GET /scholar/usage → [{feature, used, limit, resets_at}]` (extends `/me/membership` usage).

### 2.1 Ask: doubt clarification
- **Screens:** chat with level picker (Beginner · UG · PG · Specialist), subject chip (basic sciences, preclinical, clinical subjects), answer with key points, "Uncertain" / "Evidence differs" notes, sources, and follow-up chips ("Explain simpler", "Give an example", "Quiz me on this").
- **Rules:** level changes the answer's depth, not its facts. Uses allowance per question. Patient-specific clinical questions ("my patient has…, what dose?") get the education-only boundary and no dosing for an individual, reusing `aiSafety.ts`.
- **States:** thinking, answer, out-of-demo-topic, limit reached, error with retry (retry doesn't double-count).
- **API:** `POST /scholar/ask {conversation_id?, text, level, subject?, project_id?, file_ids?} → {answer, notes[], sources[], usage}`.

### 2.2 Study tools
- **Screens:** from any answer or topic: quiz (MCQ with explanations, score), flashcards (flip, "again / good", simple spaced order), topic summary, revision plan (exam date + topics → day-by-day plan with checkboxes).
- **Rules:** generated from the topic or the user's own files; each set saved to the library. Revision-plan progress is learning personalisation and stays separate from patient/clinic data (Annex D).
- **Done when:** tests for quiz scoring and the revision-plan date spread (no day past the exam date, every topic placed).

### 2.3 Viva practice
- **Screens:** set-up (subject, topic, level, number of questions, "examiner style": gentle / standard / strict), session (one question at a time, type or speak the answer, examiner follow-up), review (model answer outline per question, what was missed, self-rating).
- **Rules:** model answers are outlines to study from, labelled. Voice uses the browser speech API already used in FMD Main if present; no new dependency.
- **Done when:** test for the session state machine (set-up → asking → follow-up → next → review; quit mid-way saves progress).

### 2.4 Ask my documents
- **Screens:** upload notes/lecture PDFs into a project, file list with status, ask questions scoped to selected files; answers cite "your file, p. 12" and open the file at that page.
- **Rules:** PDF, images and text only, size limit as in Records; files are read as data, never as instructions (prompt-injection rule from `assistant.ts`). If the answer isn't in the files, say so rather than answer from general knowledge without saying it.
- **Demo:** page references come from simple text matching on uploaded text-based PDFs or seeded sample notes; scanned images say "can't read this file in the demo".
- **API:** `POST /scholar/files` (multipart) → `{id, pages, status}`; `file_ids` on `/scholar/ask`.

### 3.1 Presentation builder
- **Screens:** set-up (topic, format: seminar · journal club · case presentation · classroom · conference; audience, duration, depth, slide count, style, citations on/off, speaker notes on/off, optional source papers); outline review (reorder, add, delete sections) → generate → slide editor (text edit per slide, speaker notes, references panel), regenerate at slide / section / whole deck.
- **Rules:** each slide's references show verified / from your file / unverified (SCH-16). Quotes from uploaded papers are short and attributed; long verbatim copying is refused (SCH-17). Regenerating keeps the user's manual edits unless they choose to replace them. Deck generation and regeneration use allowance (1.3).
- **Done when:** tests for outline → slide count matching duration/slide-count setting, and regenerate-one-slide leaving other slides untouched.
- **API:** `POST /scholar/decks` → outline; `POST /scholar/decks/{id}/generate`; `POST /scholar/decks/{id}/regenerate {scope: slide|section|deck, target_id?}`; `PATCH /scholar/decks/{id}/slides/{slide_id}`.

### 3.2 Presentation export
- **Demo:** export as PDF handout with `demoPdf` in `sample/files.ts` and as Markdown outline; "PowerPoint (.pptx)" button shown as "Coming with the file-generation service" (SCH-15 is BX).
- **Rules:** export includes the AI-assistance note and the unverified-reference list on the last slide.
- Skipped: a PPTX library in the browser. Add it only if the owner wants PPTX in the demo; otherwise the backend's file-generation service does it.

### 4.1 Research workflows
- **Screens:** one research project with steps the student can do in any order: question and objectives (PICO helper), hypotheses, study outline, literature-search plan (databases, keywords, inclusion/exclusion), paper summaries and comparison matrix from uploaded papers, methodology draft, data dictionary, questionnaire draft, stats concept explainer, manuscript structure, abstract, poster content, response to reviewers.
- **Rules (SCH-23, SCH-24):** never generates results, data, ethics approval numbers or references; asking for them gets a refusal that explains why. Every draft labelled "Draft, not completed research". Reference list stays "unverified" until the student ticks each one as checked. An integrity reminder on export: "Disclose AI assistance if your institution requires it."
- **Done when:** test that requests for fabricated results/references/ethics IDs are refused and that export lists unverified references.

### 5.1 Workspace
- **Screens:** projects (subject, seminar, research, exam prep) holding chats, files, decks, quizzes, research drafts; library with search, tags, filters by type and project; version history per deck and research draft (restore a version).
- **Rules:** user-controlled organisation; nothing auto-tagged without showing it.
- **API:** `GET/POST/PATCH/DELETE /scholar/projects`, `GET /scholar/library?q&tag&type&project`, `GET /scholar/items/{id}/versions`.

### 5.2 Export, delete, retention
- **Screens:** in `/scholar/settings`: export everything (zip of Markdown/PDF and original files), delete one item / a project / all Scholar data (with confirm), retention note (how long work is kept after membership ends, OD-new).
- **Rules:** deleting is real in the demo (removes from store and IndexedDB). Ties into FMD Main's privacy export/deletion (1.6).

### 6. Cross-cutting
- Accessibility: keyboard flashcards and viva, focus moves to new answers, answers announced politely, no meaning by colour alone in reference states.
- Analytics events (ANL-03, names only in the demo): `scholar_activated`, `scholar_feature_used {feature}`, `scholar_limit_reached`, `scholar_generation_failed`, `scholar_citation_flagged`, `scholar_export {format, ok}`, `scholar_upgrade_viewed`.
- QA-08: a check that every citation rendered has a state (verified / file / unverified).

---

## 5. Journeys to walk through before sign-off (E2E-05)

1. **Student start:** sign up as student, buy ₹400 (simulated), open Scholar, see home and meter.
2. **Doubt to quiz:** ask about pulpitis at UG level, switch to Beginner, turn the answer into a 5-question quiz, score it, find it in the library.
3. **Viva:** a strict 5-question viva on local anaesthesia, answer one by voice, review the model outlines.
4. **Own notes:** upload a lecture PDF, ask a question, open the cited page.
5. **Seminar:** 15-minute journal-club deck from an uploaded paper, regenerate slide 4, edit slide 6, export PDF; unverified references listed.
6. **Research:** draft a research question and methodology; ask the AI to "write the results" and see it refuse.
7. **Limits:** reach 100% questions, see the refusal and the tentative ₹350 path, nothing charged.
8. **Expiry:** membership expires, grace banner, then read-only access; renew restores it.
9. **Non-student:** sign in as a dentist, `/scholar` shows the access gate.

---

## 6. Decisions needed from the owner

| # | Question | Demo default until decided |
|---|---|---|
| OD-05 | Quotas per feature, reset period, what ₹350 buys (more usage, memory, or both), billing period, grace | 200 questions + 10 decks a month, monthly reset (IST), 14-day grace, ₹350 "planned, not on sale" |
| OD-05 | Do dentists get Scholar in any form? | No |
| OD-14 | Model vendor and file-generation service (PPTX) | Rule-based demo provider; PDF/Markdown export only |
| New | Retention of Scholar work after membership ends | Read-only for the grace period, then kept 90 days before deletion (to confirm with legal) |
| New | Verified sources: which textbooks/guidelines count, who validates the knowledge base | Nothing shown as "verified" in the demo except the user's own files |
| New | Scholar theme: same as FMD Main or a study variant | Decided in part 0 |
| New | Languages for Scholar (FMD Main supports 5) | English only in the demo |

Add answers to `OPEN_DECISIONS.md`, and any departure from PDR §8 to `PRD_CHANGES.md`.
