# FMD Website — Frontend Review

**Scope:** the Next.js site in `web/` (Next.js 16.4.6, React 19.3, Tailwind v4, three.js / react-three-fiber, motion).
**Date:** 19 November 2026
**Method:**
- read the code, ran `tsc`, `eslint` and the test suite;
- built and served the production build (`next build` + `next start`);
- in headless Chromium, emulating a phone (390×844, touch) with Playwright:
  - measured each page's load (first and largest paint, layout shift, number of requests, bytes);
  - ran an automated accessibility scan (axe-core, WCAG 2 A/AA and best-practice rules) on `/`, `/login`, `/explore` and `/dentists`.

The machine used software graphics (no GPU), so timings are a rough guide, not real-device numbers. The bytes and request counts are exact.

---

## Checklist

Tick an item (`[x]`) when its fix is merged into `findmydentist/fmd-website`, and add the pull request number.

### Done

- [x] Next.js 16.4.2 → 16.4.6: fixes security advisories GHSA-mfr8-8qww-v76h and GHSA-vc7v-qv4w-wrv8 (PR #13)
- [x] `npm audit`: 0 vulnerabilities. Removed the unused `@nestjs-modules/mailer`; updated zod and the ESLint tooling (PR #13)
- [x] Lint errors cleared: two `any` types in `api/waitlist/route.ts` and `lib/db.ts` (PR #13)
- [x] Samsung Internet's forced dark mode no longer recolours the site (`color-scheme` meta and CSS) (PR #13)
- [x] Production (findmydentist.io) shows only the home page; login and app pages redirect home (PR #11)
- [x] Faster page changes and loading skeletons for Explore and Find a dentist (PR #11, PR #12)

### Left: P0 (fix before more traffic reaches production)

- [ ] **P0-1** Homepage downloads ~38 MB on a phone
  - [ ] load each section's video only near the screen, still image until then
  - [ ] re-encode the videos (most under 500 KB; `tooth.webm` is 7.2 MB)
  - [ ] stills only when data saver is on or the connection is slow
  - [ ] lighter hero turntable frames on phones
  - [ ] remove the up-front progress bar
- [ ] **P0-2** Waitlist email HTML injection
  - [ ] escape every value placed in the email HTML
  - [ ] accept only known `role` values
  - [ ] length caps on name, city and email (both forms)
- [ ] **P0-3** Rate limit and bot protection on the waitlist and FMD Edge forms
  - [ ] rate limit per IP (Vercel firewall or KV)
  - [ ] hidden spam-trap field
  - [ ] optional: Cloudflare Turnstile
- [ ] **P0-4** Security headers (HSTS, CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) and `poweredByHeader: false`

### Left: P1 (quality, maintainability, correctness)

- [ ] **P1-1** Remove unused `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `class-validator`, `class-transformer`
- [ ] **P1-2** One database layer (Neon Postgres); remove `rejectUnauthorized: false`; move the concierge table to a migration
- [ ] **P1-3** Split `Account.tsx` / `Profile.tsx`: a data hook plus one file per layout, then pick one layout
- [ ] **P1-4** Homepage sections as server components, client only where interactive
- [ ] **P1-5** `global-error.tsx`, `error.tsx`, `(main)/loading.tsx`, error boundaries around the 3D canvases
- [ ] **P1-6** Accessibility scan failures
  - [ ] contrast: white on `bg-sky-600` (`/explore`)
  - [ ] contrast: dentist card image badges (`/dentists`)
  - [ ] `aria-pressed` on a link (`Search.tsx:830`)
  - [ ] homepage list markup (`list` / `listitem`)
  - [ ] check the 31 `outline-none` uses have a visible focus style
  - [ ] check the 41 `alt=""` images are only decorative
- [ ] **P1-7** `noindex` on staging and preview hosts (`proxy.ts`, `robots.ts`)
- [ ] **P1-8** Repo clean-up: delete unused binaries, move big media to Cloudinary or LFS, compress `logo.png`
- [ ] **P1-9** Typed data layer per area (one demo/API switch), TanStack Query or SWR
- [ ] **P1-10** One `lib/storage.ts` helper instead of ~30 copy-pasted try/catch blocks
- [ ] **P1-11** Neon pooled connection or `@neondatabase/serverless`
- [ ] **P1-12** Send the waitlist email after the response (`after()`)
- [ ] **P1-13** Shared rate limit for FMD AI; trusted IP header

### Left: P2 (polish and process)

- [ ] **P2-1** CI on pull requests (types, lint, tests, build, smoke test, accessibility scan); fix the Vercel "Authorization required" check
- [ ] **P2-2** Make `npm test` match the real test runner; add form and end-to-end tests
- [ ] **P2-3** Lighthouse CI budgets and Vercel Speed Insights
- [ ] **P2-4** Error monitoring (Sentry or similar)
- [ ] **P2-5** Split `globals.css` by area
- [ ] **P2-6** Waitlist privacy notice (DPDP) and `autoComplete` attributes
- [ ] **P2-7** Clear the 7 lint warnings and commented-out code; rename `public/dental record`; tsconfig target ES2022
- [ ] **P2-8** Write down supported browsers and test old iOS Safari

### Left: reviews still to do (section 7)

- [ ] Real-device performance (mid-range Android on 4G, iPhone Safari)
- [ ] Manual accessibility (keyboard, TalkBack/VoiceOver, 200% zoom, reduced motion)
- [ ] Cross-browser (iOS Safari, Firefox, Samsung Internet, older iOS)
- [ ] SEO content and Search Console
- [ ] Security once the real backend is connected (auth cookies, CSRF, uploads, AI safety)
- [ ] Privacy and DPDP compliance
- [ ] Translations (5 languages)
- [ ] Email deliverability (SPF, DKIM, DMARC) and rendering
- [ ] Content and UX, page by page
- [ ] Caching and delivery on the live site
- [ ] Automatic dependency updates (Dependabot or Renovate)

---

## Contents

0. [Checklist](#checklist)
1. [Summary](#1-summary)
2. [What is already good](#2-what-is-already-good)
3. [Measurements](#3-measurements)
4. [P0: fix before more traffic reaches production](#4-p0-fix-before-more-traffic-reaches-production)
5. [P1: quality, maintainability, correctness](#5-p1-quality-maintainability-correctness)
6. [P2: polish and process](#6-p2-polish-and-process)
7. [Not yet reviewed (needs its own pass)](#7-not-yet-reviewed-needs-its-own-pass)
8. [How I would have built it](#8-how-i-would-have-built-it)
9. [Suggested order of work](#9-suggested-order-of-work)

---

## 1. Summary

The product craft is strong: the visual design, motion, loading skeletons, the theme system and the frontend-only demo layer are all well done.

What's weak:
- **How much the homepage downloads on a phone** (about 38 MB).
- **The security of the two public forms** (waitlist and FMD Edge).
- **The basic production setup:** security headers, error pages, CI, the repo's size.

None of it needs a rewrite. It is roughly two weeks of focused work, and the P0 items are a few days.

---

## 2. What is already good

- **TypeScript in strict mode**; **139 tests** pass on the data and demo layer; lint has no errors.
- **Nothing jumps while pages load:** layout shift was 0 on every page measured.
- **Fast first content:** about 0.2–0.8 s on the production build.
- **Heavy code is loaded only when needed:**
  - three.js (a 1 MB chunk) is not in the homepage's initial JavaScript;
  - the 3D components are loaded with `next/dynamic({ ssr: false })` (`Hero.tsx`, `MascotArt.tsx`, `Chat.tsx`).
- **Fallbacks for weaker devices:** phones and computers with software graphics play videos instead of live 3D (`MascotArt.tsx`, `lib/device.ts`).
- **Fonts are self-hosted** with `next/font` (Plus Jakarta Sans and Geist Mono).
- **SEO groundwork is in place:**
  - metadata, Open Graph and Twitter images;
  - `sitemap.ts`, `robots.ts` and JSON-LD structured data;
  - `noindex` on private pages (login, account, records and so on).
- **Themes without a flash on load** (an inline script in `layout.tsx`), and reduced-motion support in the CSS.
- **Analytics carry no private data:** `lib/analytics.ts` lists every event and the properties it may carry, so health details can't slip into analytics.
- **The production site shows only the home page** (`src/proxy.ts`, `LIVE_HOSTS` in `toggle.ts`), with the staging site separate.
- **The FMD AI route has a rate limit** (`server/assistant.ts`); see P1 #13 for its limits.

---

## 3. Measurements

Phone emulation, production build, after load plus 4 seconds:

| Page | First paint | Largest paint | Layout shift | Requests | Downloaded | DOM elements |
|---|---|---|---|---|---|---|
| `/` | 824 ms | 1124 ms (an image) | 0 | 201 | **~38 MB** | 2335 |
| `/login` | 652 ms | 652 ms | 0 | 34 | ~100 KB | 240 |
| `/explore` | 196 ms | 1072 ms (an image) | 0 | 77 | ~1.8 MB | 808 |
| `/dentists` | 196 ms | 612 ms | 0 | 66 | ~217 KB | 1158 |

Other numbers:
- **Homepage HTML:** 340 KB.
- **Homepage initial JavaScript:** 17 chunks, 343 KB gzipped.
- **Largest JS chunk:** 1,041 KB raw / 283 KB gzipped. This is three.js, loaded later.
- **`web/public`:** 200 MB.
- **The git repository (`.git`):** 2.1 GB.

What the homepage downloads, by size (phone):

| File | Size |
|---|---|
| `/models/videos/tooth.webm` | 7.2 MB |
| `/models/videos/reading.webm` | 2.8 MB |
| `/models/videos/guide-left.webm` | 2.7 MB |
| `/models/videos/guide.webm` | 2.5 MB |
| `/models/videos/laptop.webm` | 1.4 MB |
| `/models/videos/assistant-idle.webm` | 1.3 MB |
| `/models/videos/assistant-explaining.webm` | 1.3 MB |
| `/models/videos/scholar.webm` | 1.2 MB |
| `/models/videos/assistant-thinking.webm` | 1.1 MB |
| `/models/videos/assistant-listening.webm` | 0.9 MB |
| `/models/videos/vault.webm` | 0.9 MB |
| `/models/videos/butler.webm` | 0.7 MB |
| `/models/videos/heart.webm` | 0.7 MB |

The hero's turntable frames (about 7.3 MB) load on touch devices as well.

---

## 4. P0: fix before more traffic reaches production

### P0-1. The homepage downloads about 38 MB on a phone

**Where:** `src/components/preloadModels.ts` (`loadVideos`, `loadFrames`), `src/components/MascotArt.tsx`

**What happens:**
- When the homepage opens, the preloader downloads every section's mascot video, all 14 `.webm` files (about 26 MB). On touch devices it also downloads the hero's turntable frames (about 7 MB).
- All of this happens up front, behind a progress bar, whether or not the visitor scrolls that far.

**Why it matters:**
- On Indian mobile data this is slow and costs visitors money; on a prepaid plan it eats a real share of a daily allowance.
- Low-end Android phones hold all of it in memory, which makes scrolling stutter and can crash the tab.
- It also hurts Google's mobile ranking signals (Core Web Vitals), and slow sites lose people before the waitlist form.

**Fix:**
1. **Load per section, near the screen.** Download a section's video only when it is about one screen away, using `IntersectionObserver` with `rootMargin: "100% 0px"`. Until then, show its still image (`/models/stills/*.webp`, which already exist).
2. **Re-encode the videos.** They are short loops of a mascot on a plain background, so a lower bitrate (VP9/AV1 CRF ~40, 30 fps, sized to the box they are shown in) should bring most under 500 KB. `tooth.webm` at 7.2 MB is the first to fix.
3. **Respect data saver.** When `navigator.connection?.saveData` is set or the connection is slow (`effectiveType` is `2g` or `3g`), show only the stills.
4. **Hero frames:** load a smaller set (fewer angles) on phones, or use one video for the turntable.
5. **Remove the up-front progress bar** once nothing is downloaded up front.

**Target:** under 3 MB transferred for the first screen and under 8 MB for a full scroll on a phone.

### P0-2. HTML injection in the waitlist confirmation email (phishing risk)

**Where:** `src/app/api/waitlist/route.ts`

**What happens:**
- `cleanName`, `role`, `state` and `cleanCity` are placed straight into the email's HTML: `Hi <strong>${cleanName}</strong>`, `as a <strong>${role}</strong>`, and so on.
- `role` is never checked against the allowed values. `name` has no length limit.
- The email goes to whatever address is typed into the form.

**Why it matters:** anyone can type a victim's email address and a "name" containing HTML, such as a styled link saying "Verify your account". The victim gets that email from FMD's real Google Workspace address, so it passes SPF and DKIM and looks genuine. That is a ready-made phishing tool using FMD's name.

**Fix:**
- Escape every value before it goes into the HTML (`&`, `<`, `>`, `"`, `'`), using a small `escapeHtml()` helper.
- Accept only known `role` values (the same list the form offers).
- Cap the lengths: name ≤ 80, city ≤ 80, email ≤ 254.
- Remove newlines from anything used in email headers.
- The FMD Edge route (`api/concierge/enquiries/route.ts`) only sends plain text to the team's own inbox, so it is lower risk. Give it the same length caps anyway.

### P0-3. No rate limit or bot protection on the public forms

**Where:** `api/waitlist/route.ts`, `api/concierge/enquiries/route.ts`

**What happens:** any script can call both routes as often as it likes.

**Why it matters:**
- **Email bombing:** one script can send thousands of confirmation emails to any address through FMD's Google Workspace account. Google then throttles or suspends the account, and FMD's domain lands on spam lists. That breaks all of FMD's email, not just the waitlist.
- **Junk data:** the waitlist table fills with fake sign-ups, and the Neon database's usage grows.

**Fix:**
- A rate limit per IP address, about 5 requests per 10 minutes for each form. Use Vercel's firewall rate-limit rules (no code), or a counter in Vercel KV / Upstash Redis. An in-memory counter does not work on serverless, because each instance has its own memory.
- A hidden spam-trap field that people never fill but bots do; reject any request where it's filled.
- For a stronger check, Cloudflare Turnstile (free and invisible to most visitors).
- Never send more than one confirmation email to the same address; the existing duplicate-email check (409) already covers most of this.

### P0-4. No security headers

**Where:** `web/next.config.ts`

**What happens:** responses carry no `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options` / `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy` header, but they do send `X-Powered-By: Next.js`.

**Why it matters:**
- Other sites can load FMD inside a frame (clickjacking).
- Nothing limits which scripts may run if an injection bug ever appears.
- The `X-Powered-By` header tells attackers which framework the site runs.

**Fix:** add the following to `headers()` in `next.config.ts` for every path, and set `poweredByHeader: false`.

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(self), microphone=(self)
Content-Security-Policy: (start as Content-Security-Policy-Report-Only, then enforce)
```

The site uses inline scripts (theme, JSON-LD, the production flag). Next.js supports a per-request random value (a nonce) for those through the proxy. Alternatively, start with `script-src 'self' 'unsafe-inline'` and tighten later.

---

## 5. P1: quality, maintainability, correctness

### P1-1. Five dependencies are never used

**Where:** `web/package.json`

`@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `class-validator` and `class-transformer` are not imported anywhere in `src/` or `scripts/`. They are leftovers from backend work.

**Why it matters:** slower installs and builds, a bigger security-audit surface, and they confuse new developers about what the app uses.

**Fix:** `npm uninstall` all five.

### P1-2. Two separate database layers, one with certificate checking turned off

**Where:** `src/lib/db.ts` and `src/server/db.ts`

- **`lib/db.ts`:** a Postgres pool (Neon) with `ssl: { rejectUnauthorized: false }`. The connection is encrypted but the server's certificate is never checked, so a man-in-the-middle is possible.
- **`server/db.ts`:** SQLite through Node's built-in `node:sqlite`. On Vercel it writes to `/tmp`, which belongs to one instance and is wiped on restart. Anything FMD AI stores there (chats, accounts) silently disappears and differs between instances.

**Fix:**
- Use one database layer, on Neon Postgres, for everything.
- Remove `rejectUnauthorized: false`: Neon's certificates are publicly trusted, so `ssl: true` or `?sslmode=require` in the URL works.
- Run the table creation in `api/concierge/enquiries/route.ts` (`CREATE TABLE IF NOT EXISTS` on first request) as a migration instead.

### P1-3. Very large components; all six profile layouts are built on every render

**Where:**
- `src/components/main/account/Account.tsx`: 1,929 lines
- `src/components/main/dentists/Profile.tsx`: 1,044 lines
- `src/components/auth/AuthForms.tsx`: 921 lines
- `src/components/main/dentists/Search.tsx`: 868 lines

**What happens:** `Account()` and `ProviderPage()` build the JSX for all six layouts (`insta`, `insta2`, `cards`, `facebook`, `linkedin`, `exploreStyle`) as constants, then show one of them.

**Why it matters:**
- Work is wasted on every state change.
- Changes are hard to review, and people working on different layouts keep running into merge conflicts.
- One layout's bug can break the whole page.

**Fix:**
- Move the shared data into a hook: `useAccountProfile()` / `useProviderProfile()`.
- Put each layout in its own file (`account/layouts/Insta.tsx` and so on) that receives the data as props.
- Choose the layout with a map, so only the chosen one renders:

```tsx
const LAYOUT = { insta: Insta, cards: Cards, … };
<LAYOUT[layout] {...data} />
```

- Once the team picks a layout, delete the others; the picker was meant for comparing them.

### P1-4. The whole homepage runs in the browser

**Where:** `src/app/page.tsx` and `src/components/sections/*`

**What happens:**
- Every homepage section except the footer starts with `"use client"`, including sections that are mostly static text.
- The homepage HTML is 340 KB, and its initial JavaScript is 343 KB gzipped.

**Why it matters:** every visitor's phone downloads, parses and runs the JavaScript for content that could have been plain HTML. On mid-range Android phones that delays the page becoming usable.

**Fix:**
- Make each section a server component by default.
- Move only the interactive parts into small client components: forms, the 3D or video mascot, scroll-reveal animations, the navbar.
- Scroll reveals can mostly be done with CSS (`animation-timeline: view()` with a fallback) or with one shared `IntersectionObserver`.

### P1-5. No error pages or route loading states

**Where:** `src/app`

**What happens:** there is no `error.tsx` or `global-error.tsx`, and no `loading.tsx` (some routes have Suspense skeletons instead).

**Why it matters:**
- One crashing component (for example the 3D canvas when WebGL fails, or bad demo data in localStorage) blanks the whole page. Visitors see a white screen with no way to recover.
- Error tracking needs these files to catch errors.

**Fix:**
- `app/global-error.tsx`: a branded "Something went wrong" page with a Reload button.
- `app/error.tsx` and `app/(main)/error.tsx`: errors stay inside the page, so the navbar still works.
- `loading.tsx` in the `(main)` group, reusing `Skeletons.tsx`.
- An error boundary around each 3D canvas that falls back to the still image.

### P1-6. Accessibility failures from the automated scan

| Rule | Severity | Where | Count | Fix |
|---|---|---|---|---|
| Colour contrast | serious | white text on `bg-sky-600` (Follow buttons, post actions) | 8 on `/explore` | `#0284c7` with white is about 4.1:1; small text needs 4.5:1. Use `bg-sky-700`, or make the text 14px bold or larger |
| Colour contrast | serious | dentist card image badges (`.left-0.rounded-r-md.py-1`) | 25 on `/dentists` | darker badge background, or a solid backing behind the text |
| `aria-allowed-attr` | critical | `aria-pressed` on the profile link, `Search.tsx:830` | 15 on `/dentists` | `aria-pressed` is only for buttons. Use `aria-current="true"` on the selected card, or make the select action a `<button>` |
| `list` / `listitem` | serious | homepage list (`.space-y-4` with `div[data-reveal]` children) | 1 + 3 on `/` | put each item in an `<li>` inside a `<ul>`, or use `role="list"` / `role="listitem"` |

Also found while reading the code:
- **Focus outlines removed:** 31 places use `outline-none` / `focus:outline-none`. Each needs a visible focus replacement (most have a border-colour change; check every one).
- **Empty alt text:** 41 images use `alt=""`. That is right for decorative images, but check that none carries meaning (dentist photos, post images).

Automated scans find only about a third of accessibility problems. See section 7 for the manual pass.

### P1-7. The staging site can be indexed by search engines

**Where:** `src/app/robots.ts`, `src/app/layout.tsx`

**What happens:**
- `robots.ts` allows crawling on every host.
- The staging and preview sites (any host not in `LIVE_HOSTS`) serve the full app, including demo pages.
- Nothing stops Google from indexing them.

**Why it matters:** duplicate copies of the site, and demo pages ("Demo profile", made-up dentists) showing in Google under FMD's name.

**Fix:** on hosts that are not production, send `X-Robots-Tag: noindex, nofollow` from `src/proxy.ts`, which already checks the host. Also make `robots.ts` return `Disallow: /` when `VERCEL_ENV !== "production"`.

### P1-8. A 2.1 GB repository with unused binaries

**Where:** `web/public`, which is 200 MB with 399 files tracked in git

- **Never referenced (only commented out):** `mascot-sitting-org.glb` (59 MB), `mascot-sitting-raw.glb` (2.6 MB), `meditate.png` (1.5 MB).
- **A full-size PNG:** `logo.png` (872 KB), used in JSON-LD as the organisation logo. The navbar already uses a small WebP.
- **Folders to check:** `public/frames` (51 MB), `public/models` (71 MB) and `public/dental record` (9.3 MB; the space in the name also makes URLs awkward).

**Why it matters:** slow clones for every developer and CI run, slow Vercel deploys, and history that can't shrink without rewriting it.

**Fix:**
- Delete the unused files.
- Move large media to Cloudinary (already set up, `USE_CLOUDINARY_MODELS` in `toggle.ts`) or Git LFS.
- Compress `logo.png` to about 30 KB (512×512).
- Later, if the size still hurts, clean the history with `git filter-repo` (coordinate with everyone first).

### P1-9. The demo layer and the real app are mixed in the same code

**Where:** `toggle.ts` (`DEMO_MODE`), `lib/fmd.ts` / `lib/fmdDemo.ts`, `src/sample/*`

The demo (localStorage accounts, sample data) is well built, but `src/sample/*` is imported directly by many components (for example `feed`, `getSaved` and `toggleFollow` in `Account.tsx` and `Profile.tsx`).

**Why it matters:** when the real API lands, every component has to be rewritten, and the demo and real data paths can't be tested separately.

**Fix:**
- Components call one typed data module per area (`data/content.ts`, `data/providers.ts`, …).
- Each module chooses between demo and real API in one place.
- Add TanStack Query (or SWR) for caching, retries and refetch-after-mutation. That replaces the hand-written `load()` / `reload()` / `onChange` callbacks used today.

### P1-10. Browser storage access copy-pasted about 30 times

**Where:** 30 `localStorage` uses across `src`, each wrapped in its own try/catch (for example `ProfileLayout.tsx`, `Stories.tsx`, `Account.tsx`).

**Fix:** one `lib/storage.ts` with `get<T>(key, fallback)`, `set(key, value)` and a `useStoredState(key, initial)` hook. This also fixes the "read after mount" pattern, which needs an eslint-disable in several places today.

### P1-11. Postgres pool per serverless instance

**Where:** `src/lib/db.ts`

A `pg.Pool` is created per serverless instance with default settings. Under load, many instances can use up Neon's connection limit.

**Fix:** use Neon's pooled connection string (`-pooler` host), or the `@neondatabase/serverless` driver, which is designed for serverless functions.

### P1-12. Email sending holds up the response

**Where:** `api/waitlist/route.ts`

The route waits for the SMTP send before replying, which adds 1–3 seconds to every sign-up.

**Fix:** reply as soon as the database write succeeds, and send the email after the response with `after()` from `next/server`.

### P1-13. The FMD AI rate limit is per instance

**Where:** `src/server/assistant.ts` (`rateLimit`)

**What happens:** the limit is kept in memory, so on serverless each instance counts separately. The IP address is read from `x-forwarded-for`, which a caller can fake unless it comes from Vercel's own header.

**Why it matters:** if FMD AI calls a paid model, someone can run up the bill.

**Fix:**
- Use the same shared rate limiter as P0-3.
- Read the IP from `x-real-ip` or `request.ip`, which Vercel sets.

---

## 6. P2: polish and process

### P2-1. No CI

**Where:** there is no `.github/workflows`.

**Fix:** a GitHub Actions workflow on every pull request:
1. `npm ci`
2. `tsc --noEmit`
3. `eslint`
4. the tests
5. `next build`
6. a Playwright smoke test plus an axe scan of `/`, `/explore`, `/dentists` and `/login`

Block merging when it fails. The Vercel check on pull requests currently fails with "Authorization required to deploy"; fix that in Vercel so previews work.

### P2-2. The test script doesn't match how the tests run

**Where:** `package.json` (`"test": "node --experimental-strip-types …"`)

The tests were run with `npx tsx --test` during this review.

**Fix:** pick one runner and make `npm test` work. Vitest is a common choice; tsx is the smallest change. Then add:
- component tests for the forms (waitlist, sign-in);
- Playwright end-to-end tests for the key flows: join the waitlist, demo sign-in, search for a dentist, book.

### P2-3. No performance budget or real-user monitoring

**Fix:**
- Lighthouse CI on pull requests (mobile), with budgets: homepage JavaScript < 250 KB gzipped, largest paint < 2.5 s, layout shift < 0.1, total first-screen bytes < 3 MB.
- Turn on Vercel Speed Insights (or `useReportWebVitals`) to see real visitors' Core Web Vitals.

### P2-4. No error monitoring

**Fix:** Sentry (or similar) for client and server errors, connected through `global-error.tsx` and `instrumentation.ts`. Today a crash on a visitor's phone is never seen.

### P2-5. `globals.css` is 1,513 lines

**Fix:** split it by area, imported from `globals.css`:
- `styles/themes.css`
- `styles/transitions.css`
- `styles/auth.css`
- `styles/home.css`
- `styles/components.css`

Move one-off classes into the components that use them.

### P2-6. Waitlist form: privacy notice and fields

**Where:** `src/components/sections/ComingSoon.tsx`

**What happens:** the form collects name, email, role, state and city, with no privacy notice or consent line. Only 2 fields have `autoComplete` attributes.

**Fix:**
- Add one line under the button: "We'll only use this to tell you when FMD launches. Privacy policy." India's DPDP Act 2023 expects a notice at the point data is collected.
- Add `autoComplete="name"`, `"email"`, `"address-level1"` and `"address-level2"`, which helps phone users a lot.

### P2-7. Leftover code and naming

- Lint shows 7 warnings, such as the unused `ActionLink` in `Walkthrough.tsx` and commented-out actions. Clear them, then make lint fail on warnings in CI.
- Rename the folder `public/dental record` (it has a space) to `dental-records`.
- Remove commented-out sections (`<Dentists />`, the x.com and facebook links in the footer) or put them behind toggles in `toggle.ts`. Git history keeps the old code.
- `tsconfig` targets ES2017. Raise it to ES2022, since every browser the site supports handles it.

### P2-8. Browser support

The site uses `color-mix()`, view transitions, `clip-path` animations and `backdrop-filter`. Check, and write down, which browsers are supported (two latest versions of Chrome, Safari, Firefox and Samsung Internet), and test old iOS Safari (15/16) for the `color-mix` fallback.

---

## 7. Not yet reviewed (needs its own pass)

The P0–P2 list above is **not everything**. It covers what could be found by reading the code, a production build, measurements in an emulated phone and an automated scan. These areas need their own focused review:

| Area | What to check | How |
|---|---|---|
| **Real-device performance** | Homepage on a mid-range Android phone (for example a Redmi or Samsung A series) on 4G: memory, scroll smoothness, battery drain from the 3D and videos, and iPhone Safari | Chrome remote debugging and WebPageTest on a real Moto G4 / 4G profile |
| **Manual accessibility** | Keyboard-only use of every page (tab order, focus traps in sheets and the story viewer, Esc to close); a screen-reader pass (TalkBack, VoiceOver) on the waitlist, sign-in, search and booking; 200% zoom; reduced motion | Manual, against the WCAG 2.2 AA checklist |
| **Cross-browser** | iOS Safari, Firefox and Samsung Internet (whose forced dark mode was just fixed); older iOS | BrowserStack or real devices |
| **SEO content** | Heading structure of the homepage, internal linking, page titles and descriptions; share previews on WhatsApp, LinkedIn and X; Google Search Console setup | Lighthouse SEO, Search Console, opengraph.xyz |
| **Security beyond the forms** | How auth cookies, CSRF and sessions will work when the real FastAPI backend replaces the demo (`/api/v1` rewrite in `next.config.ts`); upload handling in `Create.tsx`; the FMD AI prompt-injection and safety layer (`lib/aiSafety.ts`) | A dedicated security review once the backend is connected |
| **Privacy and compliance** | DPDP Act notices and consent; health data kept in the browser's storage in demo mode; data deletion; whether analytics needs consent once a vendor is chosen | Review with legal against the PDR's privacy sections |
| **Internationalisation** | `lib/i18n.ts` defines 5 languages (en, hi, te, kn, ta): how much of the UI is translated, text overflow in Tamil and Telugu, number and date formats | Switch languages and check every page |
| **Email** | SPF, DKIM and DMARC for findmydentist.io; the confirmation email in Gmail, Outlook and Apple Mail, in dark mode | mail-tester.com, Litmus |
| **Content and UX** | Copy consistency, empty and error states on every page, form validation messages, the phone layout of every app page | Design review, page by page |
| **Caching and delivery** | Vercel caching of HTML (static versus dynamic per route); image sizes from `next/image`; whether `/models` files really get the year-long cache header in production | Check response headers on the live site |
| **Dependencies over time** | Renovate or Dependabot to keep Next.js, React and three.js patched (the Next.js advisory fixed in PR #13 had been there unnoticed) | Turn on Dependabot |

---

## 8. How I would have built it

- **Homepage:**
  - server-rendered sections by default; interactive "islands" only for the 3D/video mascots, forms, the navbar and animations;
  - each mascot loads when its section approaches, with the still image first;
  - no up-front preloader;
  - a strict budget: first screen < 3 MB and < 250 KB of JavaScript.
- **App area (`(main)`):**
  - server components for page shells and layouts;
  - a typed data layer with TanStack Query, behind one switch between demo and API;
  - each feature in its own folder (`features/profile`, `features/explore`, …) with components small enough to review (under about 300 lines).
- **Forms:**
  - one zod schema per form, shared by the browser and the server;
  - server actions or route handlers that validate, rate-limit, escape and log;
  - emails sent after the response.
- **Errors:** `error.tsx`, `global-error.tsx` and `loading.tsx` per route group; error boundaries around every 3D canvas; Sentry from day one.
- **Assets:** stored on Cloudinary or a CDN, never in git; AVIF/WebP images, low-bitrate video; a check in CI that fails when a file in `public/` is over 500 KB.
- **Security:** headers and CSP from the first deploy; `noindex` on everything except production; no certificate shortcuts.
- **Process:**
  - CI on every pull request: types, lint, tests, build, axe scan, Lighthouse budget;
  - Dependabot;
  - one design-token file shared by Tailwind and the 3D scenes.

---

## 9. Suggested order of work

| Step | Items | Rough size |
|---|---|---|
| 1 (this week) | P0-2 email escaping and validation; P0-3 rate limits and a spam trap; P0-4 security headers; P1-7 noindex on staging | 1–2 days |
| 2 | P0-1 videos loaded per section, re-encoded, data saver respected | 2–3 days |
| 3 | P1-1 unused dependencies; P1-2 one database with proper SSL; P1-5 error pages; P1-6 contrast and ARIA fixes; P1-12 email sent after the response | 2 days |
| 4 | P2-1 CI; P2-2 test runner and smoke tests; P2-4 Sentry; P2-3 Speed Insights | 1–2 days |
| 5 | P1-3 split `Account.tsx` and `Profile.tsx`, and pick one layout; P1-4 server-component homepage | 3–4 days |
| 6 | P1-8 repo clean-up; P1-9 data layer; P1-10 storage helper; P2 polish | ongoing |
| 7 | Section 7 reviews: real devices, manual accessibility, cross-browser, security when the backend lands | separate passes |
