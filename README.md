# FindMyDentist (FMD)

A dentistry-only platform that connects patients, dentists, clinics, dental students and dental companies: AI-guided discovery, booking, private records, professional content, jobs, clinic operations and care coordination. The product is defined by the **Master PDR** (`FMD_Master_PDR_Expanded_Revised.pdf`, sections 1–21 and annexes A–N).

> **Status: pre-release.** [findmydentist.io](https://www.findmydentist.io) shows the homepage only; every other page is open on previews and localhost. The apps run in **frontend demo mode** by default: sign-in, accounts and FMD Main work in the browser against fixed demo accounts and sample data, and nothing is sent to a server. Outside services (SMS, AI models, payments) are labelled stand-ins. See [What is not live](#what-is-not-live).

**Stack:** Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Three.js (React Three Fiber) · Lucide. Hosted on Vercel.

## Contents

- [Quick start](#quick-start)
- [Try the demo](#try-the-demo)
- [What is built](#what-is-built)
- [Design system](#design-system)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [What is not live](#what-is-not-live)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [Conventions](#conventions)

## Preview

<p align="center">
  <img src="web/public/img/hero/earth-4320.webp" alt="Hero: Earth rim light" width="48%">
  <img src="web/public/img/hero/mascot.webp" alt="FMD mascot" width="22%">
  <img src="web/public/img/coming-soon-scene.webp" alt="Closing 'Coming soon' scene" width="48%">
</p>

*Hero, mascot and closing scene from the homepage. All people shown in the product are fictitious demo data.*

## Quick start

Requires **Node 22+** (tests use Node's built-in TypeScript type-stripping).

```bash
cd web
npm install
cp .env.example .env   # optional: nothing is required for the demo
npm run dev            # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint, React Compiler rules included |
| `npm test` | About 250 tests on `node:test`, no framework or database needed |
| `npx tsc --noEmit` | Type check (run `npx next typegen` first on a fresh clone for the route types) |

> **Known test gap:** four suites (`fmd`, `bookings`, `reviews`, `support`) fail to load because `lib/fmd.ts` and `sample/bookings.ts` use TypeScript parameter properties, which Node's strip-only mode rejects. The code is fine in the app; the fix is to write those constructors out.

> **Windows/OneDrive tip:** if a change doesn't show in development, save the file again or restart `npm run dev`; the file watcher can miss some saves.

## Try the demo

Open `/login` and tap **Try a demo?**. One tap logs you in as any of these (or type the number with password `Demo@1234`, or the code `123456`):

| Person | Role | Lands on | Mobile | Email |
|---|---|---|---|---|
| Priya Sharma | Patient | Home | `90000 00001` | `patient@demo.fmd.test` |
| Dr. Karthik Iyer | Dentist, verified | Home | `90000 00002` | `dentist@demo.fmd.test` |
| Dr. Ananya Rao | Clinic owner, Smile Studio | FMD Clinic | `90000 00003` | `owner@demo.fmd.test` |
| Dr. Meera Nair | New dentist, not verified | Home | `90000 00004` | `newdentist@demo.fmd.test` |
| Rhea Kapoor | Dental student | FMD Scholar | `90000 00005` | `student@demo.fmd.test` |
| Kavya Menon | Front desk, Smile Studio | FMD Clinic | (no FMD Main account) | |

Sign-up, password reset and most account-setting changes are off in demo mode. Demo data lives in the browser (localStorage) and can be cleared with the browser's site data. `/demo` picks the same people as roles.

### Walkthrough: a new dentist getting verified

Log in as **Dr. Meera Nair**. She has just signed up as a dentist without her registration, so she has no blue tick and can't post in Explore. Her profile (`/account`) shows **Not verified** in red, a **Get verified** chip and a card with the steps. Statuses are colour-coded everywhere: red not verified, yellow pending, green verified.

1. Open **Profile → Edit profile** (`/account/dentist`).
2. Fill in **Get verified**: dental council and registration number, education (at least the BDS, with college and year) and the registration certificate (any PDF, JPG or PNG; it stays in the browser). **Submit for verification** sets the status to **Pending**.
3. Fill in the public profile: photo, about, fees, languages, treatments, clinics, work experience, memberships and awards. **Preview as a patient** shows it as patients will.
4. Under **Demo controls**, **Approve as FMD (demo)** plays FMD's verification team: the blue tick appears and **Create a post** opens in Explore.
5. **Start over (demo)** clears the registration so the walkthrough can be run again.

Changing the council or registration number of a verified profile sends it back to **Pending**, as the backend does.

## What is built

### Homepage

A pinned, scroll-scrubbed sequence driven by one timeline (`components/hero/phases.ts`): headline → light along the Earth's rim → the meditating mascot rising with a 3D turn → the FMD AI conversation → the mascot descends and the page continues. Fully reversible, simplified on phones, a still composition under reduced motion. Below it, one midnight-navy world (`LowerWorld.tsx`) carries the sections, in the order of `app/page.tsx`:

| Section | File | What it does |
|---|---|---|
| Hero | `hero/*` | Scroll-scrubbed Earth, mascot and FMD AI stage |
| Search | `Search.tsx` | Dentist search continuing out of the hero |
| AI features | `AiFeatures.tsx` | FMD AI's capabilities orbiting the guide |
| Walkthrough | `Walkthrough.tsx` | "From a question to the right care": six steps on a wave tablist |
| Explore | `Explore.tsx` | Editorial preview of the feed |
| Trust Standard | `Journey.tsx` | Six safeguards on a rotating orbit, pausable, still under reduced motion |
| Private Vault | `Records.tsx` | Records, sharing and access history |
| FMD Edge | `Concierge.tsx` | Enquiry form; says "received", never "confirmed" |
| Dentists | `Dentists.tsx` | Cards and profile drawer; verified and sponsored kept apart |
| Trust | `Trust.tsx` | Verification, privacy, AI disclaimer |
| Products | `Products.tsx` | FMD Main, FMD Clinic, FMD Scholar |
| Coming soon | `ComingSoon.tsx` | Night-horizon scene with the waitlist form |
| Footer | `Footer.tsx` | Links and legal |

### FMD Main

| Area | Routes | Notes |
|---|---|---|
| Accounts | `/login`, `/register`, `/onboarding`, `/account`, `/account/settings`, `/account/privacy` | Purpose-separated consents, devices you're logged in on, deletion request |
| Find a dentist | `/dentists`, `/dentists/[id]`, `/clinics/[id]` | Filters by treatment, area, language and fees; verified and sponsored kept apart; no invented ratings |
| Booking | `/book/[dentistId]`, `/appointments` | Explicit confirmation, reschedule and cancel, status history |
| Records | `/records` | Private vault, time-limited sharing with a dentist, access history |
| FMD AI | `/assistant` | Plain-language guidance, urgent-symptom escalation, no dosing or diagnosis |
| FMD Edge | `/concierge` | Human-coordinated enquiries |
| Explore | `/explore` and below | See below |
| Chats | `/messages` | See below |
| Jobs and Consultation | `/jobs` and below | See below |
| Membership | `/plans`, `/membership`, `/checkout/[plan]` | PDR prices and GST note; checkout is a labelled stand-in |
| Notifications, help | `/notifications`, `/help` | Searchable help, tickets |

- **Explore** (`/explore`): Moments (24-hour updates; a full FMD-blue ring while unseen), a feed of photos, carousels, note slides, clips and polls, with Appreciate, Talk (comments with replies), Pass on, Keep and Ask FMD AI. Also Clips (`/explore/reels`), Discover (`/explore/search`), topic pages for patients with one concern (`/explore/topic/[slug]`), creator profiles (`/explore/u/[handle]`) and Create (`/explore/new`). Dentists, clinics and students post; patients watch and take part.
- **Chats** (`/messages`): one inbox for Explore and Jobs, on frosted surfaces. Chats between a patient and a clinician always carry "Not medical advice".
- **Jobs** (`/jobs`): three spaces. **Dentist roles** (`/jobs/dentists`, monthly or permanent, verified dentists only), **Clinic team** (`/jobs/team`) and **Consultation** (below). Apply inside FMD with one career profile (`/account/career`) and track applications (`/jobs/applications`); employers post (`/jobs/new`) and shortlist (`/jobs/mine`).
- **Consultation** (`/jobs/consult`): hiring a specialist for a case, not a job. Clinics post cases (the procedure, never the patient), verified dentists list themselves as visiting consultants, and either side asks. Once the other agrees, the visit is an appointment on both sides tagged **Hired consultant**: on the consultant's profile and in My consultations (`/jobs/consult/mine`), and on the clinic's FMD Clinic calendar. Logic and tests in `sample/consults.ts`.
- **Sample data:** posts, moments, chats, jobs, consultations and applications live in the browser (`web/src/sample/*`), shaped like the future API. Photos are CC0 or public domain from Wikimedia Commons (`node scripts/fetch-media.mjs`).

### FMD Scholar

The study workspace that comes with the student membership (`/scholar`). Laptops get the menu on the left, phones a tab bar. Log in as **Rhea Kapoor** to open it; any other account can use **Demo: set me up as a paid student** on Scholar's gate.

- **Ask:** doubts at four depths, beginner to specialist. Anything uncertain is marked; every source is the student's own file with a page number, or flagged as unverified. It never makes up references.
- **Study and viva:** quizzes, flashcards, spaced repetition, a mistake notebook, picture questions from credited clinical photos, topic summaries, a day-by-day revision plan, syllabus coverage by BDS year and subject, and viva practice (spoken too) with examiner follow-ups.
- **Presentations:** outline first, then slides with speaker notes; regenerate one slide, a section or the whole deck; export a PDF handout or Markdown.
- **Research:** drafts for each step from research question to response to reviewers. It refuses to write results, data, ethics approvals or references.
- **Projects and library:** upload notes into a project and ask about them; everything is saved, searchable, taggable, exportable and deletable.

Answers come from five sample topics (pulpitis, caries, Class II preparation, local anaesthesia, periodontal staging) until an AI model is chosen; a dental academic should review them before anyone relies on them. Clinical photos: `node scripts/fetch-scholar-images.mjs` (Wikimedia Commons, credited in `sample/scholar/pictures.ts`).

### FMD Clinic

Routes under `/clinic/[clinicId]/…`; the demo clinic is Smile Studio (`/clinic/smile-studio`). Open it as Dr. Ananya Rao (owner) or Kavya Menon (front desk).

| Section | What it does |
|---|---|
| Home | FMD Manager's briefing with approvals, the day's numbers, next appointments, follow-ups |
| Calendar | Week strip, list and by-dentist views, booking with clash checks and suggestions, status changes, waitlist; consultant visits tagged **Hired consultant** |
| Patients | Search, duplicates, records with visits, chart and notes (signed or draft) |
| Billing | Bills paid in full on the day, today's collection by payment mode, discounts and voids with a reason |
| Tasks | Checklists and shift handover |
| Reports | Clinic Pulse, daily operations and collection, utilisation, no-shows, patient base, new patients by source, recall, case acceptance, pending treatment, procedure mix, revenue summary, GST register |
| AI manager | Approval queue, questions answered from the clinic's own figures, scheduled jobs; it drafts, people approve |
| Team, Settings | Roles and invites; clinic details, GST mapping, AI permissions, each dentist's own profile |

An associate dentist sees Home, Calendar, Patients, Tasks and Settings. `components/clinic/sections.ts` lists the sections that have pages; anything else shows as **Soon** rather than a dead link.

## Design system

- **Theme:** colour is CSS variables on `[data-theme]` in `app/globals.css`; components read tokens only. The default and the live look is **Obsidian Royal** (`lib/themes.ts`). The brand accent is `--accent` (#5b8cff, a periwinkle royal blue). Filled controls with white text use the accent mixed 22% towards black, so labels keep 4.5:1 contrast.
- **Type:** Plus Jakarta Sans for the brand and interface, **Inter** with optical sizing as the reading face for dense everyday text (`.type-read`: notifications, chats, Consultation), Source Serif 4 for Scholar's answers and slides, Geist Mono for codes and numbers.
- **Surfaces:** `.frost` is the frosted card (translucent, blurred, a hairline of light on its top edge) over `.frost-stage`'s soft FMD-blue glow; used by notifications and chats. `.fmd-glow` is the log-in field's warm aura.
- **Motion:** purposeful and short; everything still under `prefers-reduced-motion`.

## Architecture

```
web/src/
  app/                pages and route handlers, grouped: (main) FMD Main, (scholar) FMD Scholar, clinic/ FMD Clinic
    api/              assistant, concierge and waitlist endpoints
  components/         UI by product: hero and sections (homepage), main/*, scholar/*, clinic/*, auth, app (shared kit)
  lib/                fmd.ts (API client), fmdDemo.ts (the in-browser demo backend), demo.ts (demo roles),
                      viewer.ts (who is looking, and what they may do), catalog.ts, device.ts
  sample/             sample data and domain logic shaped like the future API, each with node:test tests
  server/             small local server for the assistant and auth endpoints (SQLite in development)
  toggle.ts           site-wide switches (below)
  proxy.ts            on the live hosts, every page but the homepage redirects home
```

FMD Main's account, booking and records calls go to the **FastAPI backend** (`/api/v1/*`, forwarded to `FMD_API_URL` by `next.config.ts`), or, in demo mode, to `lib/fmdDemo.ts` in the browser. The backend is developed separately and isn't part of this repository.

**Site switches** (`web/src/toggle.ts`):

| Switch | Effect |
|---|---|
| `DEMO_MODE` | Frontend-only demo (on unless `NEXT_PUBLIC_FMD_DEMO=0` at build time) |
| `LIVE_HOSTS` | Hosts that show the homepage only; empty the list when the rest of the app goes live |
| `SHOW_ACCOUNT` | Log in and the account menu (on wherever the demo runs) |
| `REFERRALS` | Invite friends; off until legal and professional-ethics review |
| `USE_CLOUDINARY_MODELS`, `LOCAL_MODELS_VERSION` | Where the homepage's 3D models load from, and their cache version |

## Configuration

`web/.env.example` documents every variable. None is needed for the demo.

| Variable | Purpose |
|---|---|
| `FMD_API_URL` | Where `/api/v1/*` is forwarded (default `http://localhost:8000`) |
| `NEXT_PUBLIC_FMD_DEMO` | `0` uses the real backend instead of the in-browser demo (read at build time) |
| `DATABASE_URL` | PostgreSQL connection for the homepage waitlist |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Waitlist and FMD Edge notification emails |
| `FMD_DB`, `FMD_SEED_DEMO` | The local server's SQLite file and demo seeding (optional) |
| `FMD_ADMIN_EMAILS`, `FMD_OPS_EMAILS`, `FMD_ACCOUNTANT_EMAILS` | Staff roles given by email at sign-up (optional) |
| `CLOUDINARY_*` | Only for `scripts/upload-models.mjs` |

Never commit `.env*` files.

## Deployment

Vercel deploys `main` to [findmydentist.io](https://www.findmydentist.io) and builds a preview for every pull request. While `LIVE_HOSTS` lists the production hosts, the live site shows the homepage only; use a preview URL or localhost to see the apps.

## What is not live

| Needs | Current stand-in |
|---|---|
| FastAPI backend connected to the live site | In-browser demo backend (`lib/fmdDemo.ts`) |
| SMS / WhatsApp / email for sign-in | Fixed demo code `123456` |
| AI model, speech, vision | Rule-based assistant and Scholar's five sample topics, labelled in the UI |
| Payment gateway | Checkout is a labelled stand-in |
| Legal, clinical and tax review | Draft privacy notice and terms; clinical wording unreviewed |

All demo dentists, clinics, patients and posts are fictitious and flagged as demo in the UI. Open product decisions and their provisional defaults are in `docs/OPEN_DECISIONS.md`.

## Roadmap

| Milestone | Status |
|---|---|
| M0 Audit and traceability | Done |
| M1 Homepage | Done |
| M2 FMD Main (incl. Explore, Chats, Jobs, Consultation) | Done on sample data |
| M3 FMD Clinic | Done on sample data |
| M4 FMD Scholar | Done on sample answers; needs an AI model and academic review |
| M5 Admin and Accountant portals | Not started in this repository |
| M6 Annex features (warranty, treatment journey, content import, migration, reviews, referral, BI, accessibility pass) | Not started |
| M7 End-to-end QA and handover | Not started |

## Documentation

| File | Contents |
|---|---|
| `docs/PRD_TRACEABILITY.md` | Every PDR requirement with its ID, status, evidence and tests |
| `docs/OPEN_DECISIONS.md` | Decisions only FMD can make, the defaults used meanwhile, and the decision log |
| `docs/IMPLEMENTATION_ROADMAP.md` | Milestones, architecture, external dependencies |
| `docs/FMD_MAIN_PLAN.md`, `docs/FMD_SCHOLAR_PLAN.md` | Product plans for FMD Main and FMD Scholar |
| `docs/FRONTEND_REVIEW.md` | Review of `web/` with a checklist of what is done and left |
| `docs/PRD_CHANGES.md` | Proposed changes to the PDR |
| `docs/superpowers/specs/` | Design specs for individual features |
| `fmd-end-to-end-build-plan.md` | Earlier planning document (superseded where the traceability file says so) |

## Conventions

- Build a feature as a vertical slice: data and rules (with tests) → page → every UI state (loading, empty, error, success) → update the traceability row.
- Sample modules in `web/src/sample/` keep the shape of the future API, so a screen switches to the backend by changing its data module only.
- Every outside dependency goes behind an adapter that reports when it isn't configured and never claims success it didn't verify.
- Colours, type and surfaces come from the tokens and classes in [Design system](#design-system); no hard-coded hues in components.
- Next.js 16 differs from older versions; read `web/node_modules/next/dist/docs/` before changing framework-level code.
