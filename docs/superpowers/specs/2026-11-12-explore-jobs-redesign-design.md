# FMD Main: Explore and Jobs redesign

Date: 2026-11-12 · Status: draft for approval

## Why

FMD Main works but looks basic. The owner rated a parallel redesign (swaraj-shubh's fork, `swaraj-shubh/fmd-website`, commit `53341253`) 8/10 and wants 10/10. The gap, in the owner's words: **plain and not premium, not "wow"; the light blue doesn't feel premium; sections are cluttered and hard to read.** Reference products: Apple, Instagram, Airbnb, Razorpay, Cashfree.

This round redesigns two sections, **Explore** and **Jobs**, and sets the visual language the rest of FMD Main (Find a dentist next, then the remaining pages) will follow in later rounds.

## Goals

1. **A premium visual language ("calm and bright")** for FMD Main, in light and dark.
2. **Explore works like Instagram** (posts, carousels, stories, reels, discovery grid, likes, comments, saves, shares, follows, profiles, direct messages) in FMD's own design.
3. **Jobs works like LinkedIn for dentistry**: apply inside FMD with a reusable profile, message the poster, track the application. Dentist roles and clinic team roles are kept in **separate spaces**.
4. **High-quality real imagery** everywhere these sections show media (this fixes today's blurry 100×77 px Explore images).

## Non-goals (this round)

- Real backend: no uploads, storage, real messaging or persistence beyond the browser. **Everything runs on sample data** (`web/src/sample/*`, the same pattern as the rest of FMD Main), shaped so a backend can replace it later.
- Find a dentist and other FMD Main pages (next rounds). They may pick up shared tokens or components, but they aren't redesigned here.
- The landing page (`/`), which stays dark and as it is.
- FMD Clinic.
- Merging or reconciling swaraj-shubh's fork. It's used only as a reference for what to beat.

## Anti-goals (a failure even if it works)

- A dark mode that feels cheap, generic or off-brand. It must be FMD's own obsidian and royal-blue look, refined.
- Clutter: dense screens, many competing colours, borders everywhere, small low-contrast text.
- Pale light-blue fills as the main colour.
- Looking like a copy of Instagram or LinkedIn (their logos, icons, exact layouts or colours). Same patterns, FMD's own look.
- Blurry or upscaled images.
- Dentist and non-dentist jobs mixed in one list.

## Visual language

**Light ("calm and bright", chosen by the owner from three options):**
- Page `#f5f5f7`-like off-white, pure white cards. Separate things with space and soft shadows, not borders.
- Near-black text (`#1d1d1f`-like). **One accent: deep royal blue** (about `#0a3fd1`; the existing `white-royal` theme's `#1e4fd6` family), used only for actions, links, verified ticks and highlights, at full strength. No pale-blue fills as surfaces.
- Big confident headlines in the brand font (Plus Jakarta Sans, already self-hosted), short lines, generous spacing; one obvious focus per screen.
- Photos carry the page (Airbnb-style): large media, rounded corners, minimal chrome around content (Instagram-style).

**Dark (owner: "premium aesthetic, match our FMD style"):**
- The existing FMD dark identity (`obsidian-royal`: near-black `#04050a` and `#0b0e18` surfaces, royal blue `#5b8cff` accent, soft blue glow), refined with the same space, type and calm rules as light. Same layouts and components, not a different design.

**Where it lives:** the app's existing theme system (`web/src/lib/themes.ts`, `data-theme` on `<html>`, tokens in `web/src/app/globals.css`, `ThemeToggle`). The light theme used by FMD Main (`white-royal`) is retuned to these values. The navy top bar stays (the owner already approved it).

## Explore

Layout: **Direction A, "the familiar feed"** (chosen from three mockups): story row on top, a full-width feed below, a bottom tab bar on phones and a left or top nav on desktop.

**Own identity, Instagram's purpose (owner, 2026-11-13):** Explore must convey what Instagram does without *looking* like Instagram. That means:
- **FMD's own icon set:** custom SVG marks drawn for FMD, built from the tooth and smile language (a "smile" arc for appreciate instead of a heart, a tooth-outline save, a speech-bubble-with-tooth for comments, a "pass it on" arrow for share), not lucide's or Instagram's glyphs.
- **Own story treatment:** soft rounded-square "capsules" with an FMD blue progress arc, not gradient circles.
- **Own card shape and type**, and FMD wording: "Appreciate" instead of like, "Keep" instead of save, "Pass on" instead of share, "Moments" instead of stories, "Clips" instead of reels.

A first-time viewer should recognise the patterns but never mistake it for Instagram.

**Who does what:** dentists, clinics and students **create** (posts, reels, stories). Patients **watch and interact** (like, comment, save, share, follow, message) and **never post**.

**Must have:**
- **Feed:** photo, multi-photo carousel (swipe and dots) and video posts. Double-tap to like with a heart pop, a like button, comment count, save, share sheet, overflow menu (report, copy link, unfollow). Captions with "more", hashtags and the time posted. Tabs: For you, Following.
- **Stories:** a row of rings (unseen and seen states), plus "Your story" for creators. Opening one gives the full-screen viewer: tap or hold, progress bars, swipe to the next person, reply by message, close.
- **Reels:** a full-screen vertical swipe player with a right-hand action rail (like, comment, share, save) and sound toggle.
- **Discovery grid:** search (people, treatments, hashtags), topic chips, a mixed grid of tiles with tall reel tiles.
- **Profiles** (dentist, clinic, student): avatar, name, verified tick, specialty and city, follower, following and post counts, Follow and Message (and **Book** for dentists and clinics), highlights row, a 3-across grid with Posts, Reels and Tagged or Saved tabs.
- **Comments:** a sheet with replies and likes on comments.
- **Messages:** an inbox and one-to-one chats (text, sharing a post, reacting to a story). The same inbox is used by Jobs (below).
- **Create** (creators only): new post, reel or story flow on sample data.
- **FMD touches** (what makes it ours): verified-dentist tick; a treatment chip on case posts (for example "Aligners · 9 months"); "Book Dr. X" on clinic and dentist content; a consent note on before/after cases; "Ask FMD AI" to explain a post or reel in plain words (builder's call where it sits).

Existing code to build on: `web/src/components/main/explore/{Explore,Create}.tsx`, `web/src/sample/content.ts` (posts, likes, follows, comments, reports, drafts), and routes `/explore`, `/explore/[postId]`, `/explore/mine`, `/explore/new`.

## Jobs

**Who does what:** **clinics, dentists and dental companies post** jobs (owner confirmed companies stay). **Anyone can browse.** Applying happens **inside FMD**. A company's job page shows the company (logo, about, office photos) instead of clinic photos, and has no Book button.

**Two separate spaces** (owner, explicitly: not mixed):
- **Dentist roles:** associate dentists, consultants and specialists (MDS), locum dentists. **Only verified dentists can apply.** The applicant profile shows council registration, qualifications (BDS, MDS and specialisation) and years of practice. Designed for everyone from neighbourhood clinics to India's most reputed premium practices: a top-tier careers feel, restrained and confident, with the clinic's photos and reputation up front.
- **Clinic team roles:** interns (the owner placed interns here), assistants, hygienists, front desk, coordinators, educators and others. Anyone signed in can apply.

**Must have:**
- **Board:** each space has its own entry, listings and filters (role, city, type, experience, pay). Large, calm cards with employer logo or photo, verified badge, pay and key facts.
- **Job page:** the clinic's photos, about the clinic, the role day to day, requirements, pay, location, posted or expiry date; Apply and Message.
- **Applicant profile:** filled **once**, reused for every application (name, contact, role, qualifications, experience, skills, languages, CV file; dentist fields as above). Edited from the account.
- **Apply:** one step using the profile, with an optional note. Then status tracking: Sent, Seen, Shortlisted, Not this time.
- **Ask questions:** message the poster before or after applying (shared inbox with Explore).
- **Poster side:** post a job (choosing the space), my jobs, an applicant list per job with profile view, Shortlist, Decline and Reply.

Existing code to build on: `web/src/components/main/jobs/Jobs.tsx`, `web/src/sample/jobs.ts` (roles, types, filters, jobs; today's apply is email, URL or phone, which this replaces), and routes `/jobs`, `/jobs/[id]`, `/jobs/new`, `/jobs/mine`.

## Imagery

Free-licence stock photography (Unsplash or Pexels), downloaded into `web/public` at full resolution (at least 1600 px on the long side for feed media; portrait for reels and stories), served through `next/image` (already configured). Short reel clips from the same sources, compressed. No hotlinking. **Builder's call.**

## Constraints

- Stack as is: Next.js 16 (App Router, Cache Components, Turbopack; read `node_modules/next/dist/docs/` before writing code, per `web/AGENTS.md`), React, Tailwind, `motion`, `lucide-react`. No new UI framework.
- Sample-data functions keep the async, API-shaped signatures used across `src/sample`, with `*.test.ts` tests (`npm test`).
- Must work at phone width (no sideways scroll), with keyboard and screen reader, and with reduced motion respected. Touch devices already drop `backdrop-filter` (`globals.css`), so the design can't depend on blur.
- Demo roles from `web/src/lib/demo.ts` (patient, dentist, clinic owner, clinic staff, student, company) drive what each person can do.

## Calls made by Claude (owner to check)

- **Identity and permissions:** gates use whoever is signed in. That's the real account from `useMe()` when the backend is up; otherwise the demo user from `useDemoUser()`, with the demo dentist (Dr. Karthik Iyer) treated as verified. A small helper maps both to one shape (role, verified, clinic). Today Explore and Jobs only read `useMe()`, so demo sign-in unlocks nothing there.
- **Existing post kinds:** articles become text-on-image carousel posts (the Instagram "slides" pattern dentists already use). Polls stay as a post type, restyled. Sponsored posts keep a clear "Sponsored" label. The Learn tab is dropped; its content shows in For you and is findable through search and topic chips. Tabs: For you, Following, plus Reels in the tab bar.
- **Clinics:** a clinic is its own profile (posts, followers, jobs, inbox), separate from the owner's personal profile. The owner posts and posts jobs as the clinic. Front-desk staff can read and reply to clinic messages and manage applicants, but can't publish posts or jobs.
- **Company jobs:** companies can post into either space. A role that needs a registered dentist (for example a clinical educator requiring BDS) goes in Dentist roles, with the verified-only rule. Anything else goes in Clinic team roles.
- **Messaging guardrails:** plain direct messages, plus a short note in patient-to-dentist chats ("Not medical advice. Book a consultation for anything clinical") with a Book shortcut. Dentists and clinics can turn off messages from people they don't follow.

## Left to the builder

Exact spacing and type scale, component breakdown, motion details, where "Ask FMD AI" sits, the sample content itself (realistic Indian dental context), the desktop layout of the feed, and how highlights and the create flow look.
