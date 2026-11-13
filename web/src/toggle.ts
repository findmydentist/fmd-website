// Site-wide switches: change a value here and redeploy.

/**
 * Where the home page's 3D models load from:
 *   true  → Cloudinary (the URLs in src/lib/models.ts; upload or re-upload with `node scripts/upload-models.mjs`)
 *   false → the site's own copies in web/public
 */
export const USE_CLOUDINARY_MODELS = false;

/** Only used when USE_CLOUDINARY_MODELS is false: bump it after rebuilding a model in web/public, or browsers keep the old one. */
export const LOCAL_MODELS_VERSION = 6;

/**
 * The frontend-only demo (README, "Frontend-only demo"): sign-in, accounts and the rest of FMD Main run in the browser
 * against four demo accounts, with no backend. On everywhere, the live site included, so FMD Main can be shown there.
 * Set NEXT_PUBLIC_FMD_DEMO=0 (at build time) to use the real FastAPI backend instead.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_FMD_DEMO !== "0";

/**
 * Log in, the account menu and the signed-in app shell's links. On wherever the demo runs (the live site included);
 * with the real backend, on in development only until the backend is live.
 */
export const SHOW_ACCOUNT = DEMO_MODE || process.env.NODE_ENV !== "production";

/** Invite friends (plan 10.3). Off until FMD's legal and professional-ethics review approves it (PDR Annex I). */
export const REFERRALS = false;
