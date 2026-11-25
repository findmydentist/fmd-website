/**
 * Explore's search, for a patient with one thing on their mind (docs/superpowers/specs/2026-11-16-explore-refresh-design.md):
 * a short list of common treatments and problems, and a page per topic with a plain explainer, posts about only that
 * topic, and three dentists who treat it. Proposed API: GET /explore/topics · GET /explore/topics/{slug}.
 * The explainers are general education, to be reviewed by a dentist before launch; they never diagnose.
 */
import { feed, type FeedItem } from "./content.ts";
import { searchProviders, type ProviderCard } from "./providers.ts";

export type ExploreTopic = {
  slug: string;
  title: string;
  /** one line under the title in the list */
  hint: string;
  /** two or three short paragraphs, plain words */
  explainer: string[];
  /** words that put a post or a search on this topic */
  words: string[];
  specialty: string;
};

export const EXPLORE_TOPICS: ExploreTopic[] = [
  {
    slug: "braces-aligners",
    title: "Braces & aligners",
    hint: "Straightening teeth, at any age",
    explainer: [
      "Braces and clear aligners move teeth slowly into a better position, usually over months rather than weeks. Braces are fixed to the teeth; aligners are clear trays you change every week or two.",
      "Which one suits you depends on how your teeth and bite need to move. An orthodontist will look at both, often with photos, scans and X-rays, before suggesting a plan.",
    ],
    words: ["braces", "aligner", "orthodont", "crooked", "straighten"],
    specialty: "Orthodontist",
  },
  {
    slug: "root-canal",
    title: "Root canal",
    hint: "Saving a tooth that's badly decayed or infected",
    explainer: [
      "A root canal treatment cleans out the inflamed or infected pulp inside a tooth, then seals it. It's done under local anaesthetic and is usually no more uncomfortable than a filling.",
      "Afterwards the tooth often needs a crown to protect it. Lingering pain to hot or cold, or pain that wakes you at night, are reasons to see a dentist soon.",
    ],
    words: ["root canal", "endodont", "rct", "pulp"],
    specialty: "Endodontist",
  },
  {
    slug: "implants",
    title: "Implants",
    hint: "Replacing a missing tooth",
    explainer: [
      "A dental implant is a small titanium post placed in the jaw that holds a crown, bridge or denture. The bone needs a few months to bond with it before the final tooth goes on.",
      "Whether an implant suits you depends on your bone, gums and general health. Bridges and dentures are other ways to replace a missing tooth.",
    ],
    words: ["implant", "missing tooth", "missing teeth", "replace"],
    specialty: "Implantologist",
  },
  {
    slug: "gum-problems",
    title: "Gum problems",
    hint: "Bleeding, swollen or receding gums",
    explainer: [
      "Gums that bleed when you brush are often the first sign of gum inflammation, which usually improves with careful cleaning and a professional scale and polish.",
      "If it isn't treated it can damage the bone that holds teeth in place. A dentist or periodontist can check how deep the problem goes.",
    ],
    words: ["gum", "bleed", "perio", "receding"],
    specialty: "Periodontist",
  },
  {
    slug: "kids-teeth",
    title: "Kids' teeth",
    hint: "First visits, milk teeth and habits",
    explainer: [
      "A child's first dental visit is best around their first birthday, or when the first tooth appears. Early visits are short and mostly about getting comfortable.",
      "Milk teeth matter: they hold space for adult teeth and help with eating and speech. Brushing twice a day with a smear of fluoride toothpaste is the main habit to build.",
    ],
    words: ["kid", "child", "baby", "first visit", "firstvisit", "milk teeth", "pediatric", "paediatric"],
    specialty: "Pediatric Dentist",
  },
  {
    slug: "sensitivity-toothache",
    title: "Sensitivity & toothache",
    hint: "Twinges with cold, sweet or biting",
    explainer: [
      "Short twinges with cold or sweet foods are often from exposed dentine, which a sensitivity toothpaste and gentle brushing can help.",
      "Pain that lingers, throbs, keeps you up at night or comes with swelling needs a dentist soon. If swelling spreads to your eye or neck, or you have trouble breathing or swallowing, go to an emergency department.",
    ],
    words: ["sensitiv", "toothache", "tooth ache", "pain", "ache", "cold"],
    specialty: "General Dentist",
  },
];

export const topicBySlug = (slug: string) => EXPLORE_TOPICS.find((t) => t.slug === slug) ?? null;

/** The topic a search or a post is about: its name, or one of its plain words. */
export function matchTopic(text: string): ExploreTopic | null {
  const t = text.toLowerCase();
  return EXPLORE_TOPICS.find((x) => t.includes(x.title.toLowerCase()) || x.words.some((w) => t.includes(w))) ?? null;
}

const about = (p: FeedItem, topic: ExploreTopic) => {
  const text = [p.title, p.caption, p.treatment?.name ?? "", ...p.tags].join(" ").toLowerCase();
  return topic.words.some((w) => text.includes(w));
};

/** Only this topic's posts (no ads), newest first, and the three dentists who treat it, verified first. */
export async function topicPage(slug: string, userId: string | null): Promise<{ topic: ExploreTopic; posts: FeedItem[]; dentists: ProviderCard[] } | null> {
  const topic = topicBySlug(slug);
  if (!topic) return null;
  const posts = (await feed(userId, "for_you")).filter((p) => !p.sponsored_by && about(p, topic)).sort((a, b) => b.published_at.localeCompare(a.published_at));
  const found = await searchProviders({ specialty: topic.specialty });
  const dentists = [...found.items].sort((a, b) => Number(b.verification.status === "verified") - Number(a.verification.status === "verified")).slice(0, 3);
  return { topic, posts, dentists };
}
