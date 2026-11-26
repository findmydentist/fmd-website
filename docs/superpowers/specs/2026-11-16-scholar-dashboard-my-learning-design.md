# FMD Scholar: dashboard and My learning

Date: 2026-11-16 · Status: approved by the owner (mockup "scholar-dashboard", name "My learning")

## Why

Scholar is unlimited with the student membership (PRD_CHANGES P11), so the Usage page and meters have nothing left to say. The owner wants Home to be more interactive and useful for a student preparing for exams, and the old Usage slot to show something insightful instead.

## What changes

**Home** (`/scholar`), top to bottom:
1. Greeting and date. On the right, the nearest upcoming exam (from a project's date or a revision plan's exam date): days left as a ring, and the plan's progress ("Plan 4 of 12 days done · on track", where on track means days ticked ≥ days elapsed).
2. An ask box. Submitting opens Ask with the question already asked.
3. **Today's plan:** today's topic from the active revision plan, as four tasks to tick: read the summary, flashcards, a 5-question quiz, one viva question. Each opens the right tool on that topic; ticks are kept per day. No plan: a prompt to make one.
4. **Suggested next:** the weakest topic and why (its quiz average), with "Explain it again" (Ask) and "Try 5 questions" (Quiz). No data yet: a gentle start suggestion.
5. **Question of the day:** one quiz question picked by date, answered right there, with the explanation.
6. **Where you're strong and weak:** a bar per topic the student has practised.
7. **Continue:** the three most recent items.
8. **This week:** seven day blocks (studied or not) and counts (study days, questions asked, quizzes, vivas).

**My learning** (`/scholar/learning`, in the left menu where Usage was): four stats (study days this month, average quiz score, vivas practised, plan days done), strength by topic with a label (Strong, Good, Building, Revise), and up to three suggestions, each with a button to do it now and "Add to my plan" (puts the topic on the next plan day).

## Rules

- Everything comes from the student's own saved work: quiz results (score of finished quizzes), viva self-ratings (1–3 → 33/67/100%), plan days ticked, and when items were saved (IST days). Nothing is invented; with no data, sections say what to do first.
- Practice only: labels say "from your quiz scores and viva ratings", never "assessment" or a grade.
- No limits, costs or meters anywhere.

## Approaches considered

- **Compute from saved items (chosen):** no new storage beyond today's ticks; always consistent with the library.
- Keep a separate activity log: more precise counts (e.g. flashcards flipped) but a second source of truth to keep in sync. Not worth it in the demo.

## Left to the builder

Exact thresholds for labels (proposed: ≥80 Strong, ≥65 Good, ≥50 Building, else Revise), layout details, empty-state wording.
