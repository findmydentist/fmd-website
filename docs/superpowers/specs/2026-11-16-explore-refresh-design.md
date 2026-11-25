# FMD Main Explore: refresh

Date: 2026-11-16 · Status: approved in the design conversation (owner picked each item in mockups) · Builds on `2026-11-12-explore-jobs-redesign-design.md`

## Why

Explore worked but still read like a renamed Instagram. The owner wants it to feel like FMD's own thing while doing the same job, and to serve the patient's real question: "I want to understand this one treatment or problem."

## Decisions (owner's picks)

**Moments shape:** soft rounded squares (not circles, not the tall capsule). Something new shows a small blue spark in the corner; watched ones fade. "Your moment" is a dashed square with a plus.

**Icons, the tooth family:** each mark borrows from the tooth and smile.
- **Appreciate:** the Ribbon Heart from the owner's reference: an outline heart drawn in one stroke that trails off like a ribbon; when appreciated it fills blue with a lighter ribbon band. Width slightly narrowed (approved "heart is fine now").
- **Pass on (share):** one curved arrow with a double tip.
- **Keep (save):** the tooth, unchanged.
- **Talk:** speech bubble with a smile inside. **Discover:** lens with a smile. **Clips:** rounded square with a play mark. **Chats:** two bubbles. **Create:** plus with soft corner marks. **Me:** head and shoulders. **Home:** arch with a door (a tooth's crown).

**What a patient sees first:** Moments, then the feed. On a laptop, chats sit in a small tray at the bottom right, collapsed, which opens to recent conversations without leaving the feed. On phones chats stay behind the chat icon.

**Search, for one concern:** a search box and a short list of common treatments and problems (about six). Picking one, or searching its name, opens a **topic page** about only that thing:
1. a short plain-language explainer,
2. posts and clips about it from verified dentists,
3. a quiet strip of three dentists who treat it (name, verified tooth, clinic, area) with Book, and "See all" to Find a dentist.
Premium and calm: no ads, crowded filters or long lists.

## Constraints

As the 12 Nov design: Next 16, React, Tailwind, sample data in `web/src/sample` with tests, phone width with no sideways scroll, keyboard and screen reader, reduced motion respected. "Not medical advice" wording stays on topic pages; explainers are general education, reviewed by a dentist before launch.

## Approaches

- **Refine the existing Explore (chosen):** keep its routes, data and components; swap the icon set, the Moments tile, add the chat tray and replace the search landing with topics plus topic pages.
- Rebuild Explore around topics only (no feed): further from social apps, but loses the feed the owner wants patients to see first.

## Left to the builder

The six topics and their wording (proposed: Braces & aligners, Root canal, Implants, Gum problems, Kids' teeth, Sensitivity & toothache), how posts are matched to a topic (tags and treatment names), which three dentists show (matching specialty, best rated), and the tray's exact look.
