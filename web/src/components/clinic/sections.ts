/**
 * FMD Clinic sections that have a page. The sidebar, Home's cards and notifications link only to these; the rest show
 * as "Soon" instead of leading to a 404. Add a slug here when its page under app/clinic/[clinicId]/ lands.
 */
const BUILT = new Set(["", "calendar", "patients"]);

/** The link for a clinic section (with any ?query), or null while that section isn't built. */
export const sectionHref = (base: string, slug: string) => (BUILT.has(slug.split("?")[0]!) ? (slug ? `${base}/${slug}` : base) : null);
