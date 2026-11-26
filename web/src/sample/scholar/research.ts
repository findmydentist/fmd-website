/**
 * Research workflows (Scholar plan part 4.1, PDR §8.4): from a question to a manuscript, as drafts the student owns.
 * Proposed API: POST /scholar/research {title, pico?} · POST /scholar/research/{id}/draft {step, instruction}
 *   POST/PATCH/DELETE /scholar/research/{id}/references
 * Rules: Scholar never makes up results, data, ethics approvals or references; asking for them is refused and costs
 * nothing. Every draft starts with the draft label. References are the student's own, entered and ticked by them.
 * Exports carry an AI-assistance note for institutions that require disclosure.
 */
import { createItem, getItem, newId, updateItem, type Item } from "./workspace.ts";

export const DRAFT_LABEL = "Draft. Not completed research or original findings.";
export const AI_DISCLOSURE = "Prepared with AI assistance (FMD Scholar). Disclose this if your institution requires it.";

export const STEPS = [
  { id: "question", label: "Question and objectives" },
  { id: "hypotheses", label: "Hypotheses" },
  { id: "outline", label: "Study outline" },
  { id: "search", label: "Literature search plan" },
  { id: "summaries", label: "Paper summaries and comparison" },
  { id: "methods", label: "Methodology" },
  { id: "dictionary", label: "Data dictionary" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "stats", label: "Statistics concepts" },
  { id: "manuscript", label: "Manuscript structure" },
  { id: "abstract", label: "Abstract" },
  { id: "poster", label: "Poster" },
  { id: "reviewers", label: "Response to reviewers" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];
export type Pico = { p: string; i: string; c: string; o: string };
export type Reference = { id: string; text: string; checked: boolean };
export type ResearchData = { title: string; pico: Pico; drafts: Partial<Record<StepId, string>>; references: Reference[] };

const FABRICATION: [RegExp, string][] = [
  [/\b(make up|invent|fabricate|fake|made-up)\b/i, "made-up material"],
  [/\bethic(s|al)\b.*\b(approval|number|id|reference|clearance)\b/i, "an ethics approval"],
  [/\b(give|list|generate|find|suggest|write|add|cite)\b.*\b(references?|citations?|sources)\b/i, "references"],
  [/\b(write|draft|give|generate|produce|create)\b.*\b(results?|findings|outcomes data|data set|dataset)\b/i, "results or data"],
];
export function refusal(text: string): string | null {
  const hit = FABRICATION.find(([r]) => r.test(text));
  return hit ? `I can't write ${hit[1]}. Scholar won't make up results, data, ethics approvals or references. I can help you plan how to collect and report them.` : null;
}

const or = (v: string, fallback: string) => v.trim() || fallback;
function template(step: StepId, d: ResearchData, instruction: string): string {
  const { p, i, c, o } = { p: or(d.pico.p, "[population]"), i: or(d.pico.i, "[intervention or exposure]"), c: or(d.pico.c, "[comparison]"), o: or(d.pico.o, "[outcome]") };
  const t = d.title;
  const body: Record<StepId, string[]> = {
    question: [`Research question: In ${p}, does ${i}, compared with ${c}, change ${o}?`, `Primary objective: to compare ${o} between ${i} and ${c} in ${p}.`, "Secondary objectives: [add the other outcomes you can measure reliably]."],
    hypotheses: [`Null hypothesis (H0): there is no difference in ${o} between ${i} and ${c}.`, `Alternative hypothesis (H1): ${o} differs between ${i} and ${c}.`, "Decide before collecting data whether H1 is one- or two-sided, and say why."],
    outline: [`Working title: ${t}.`, "Design: [e.g. randomised trial, cohort, cross-sectional survey], chosen because [reason].", `Setting and participants: ${p}; inclusion and exclusion criteria: [define].`, `Exposure/intervention: ${i}; comparison: ${c}.`, `Primary outcome: ${o}, measured by [method] at [time points].`],
    search: ["Databases: PubMed/MEDLINE, Cochrane Library, and one more relevant to your question (e.g. Scopus).", `Key concepts: (${p}) AND (${i}) AND (${o}), each with synonyms and MeSH terms.`, "Limits: language, years and study designs, each justified.", "Screening: titles/abstracts, then full texts, ideally by two reviewers; record numbers for a flow diagram."],
    summaries: ["For each paper you upload: aim, design, participants, intervention/exposure, outcomes, main limitations.", "Comparison matrix columns: paper (your own label), design, sample size, outcome measure, follow-up, risk of bias.", "Fill the matrix from the papers themselves. Scholar won't fill in a value a paper doesn't report."],
    methods: [`Design and setting: [design] in [setting], with ${p}.`, "Sample size: based on [expected effect, variability, power and alpha]; calculate it with your statistician's help.", `Procedures: ${i} delivered by [who], how and how often; ${c} for the comparison group.`, `Outcome measurement: ${o} assessed by [calibrated examiners / validated tool], blinded where possible.`, "Ethics: approval to be sought from your institutional ethics committee before recruitment; informed consent (and assent for minors)."],
    dictionary: ["Variable | Type | Values or units | How it's collected", "participant_id | text | coded ID, no names | assigned at enrolment", `group | category | ${i} / ${c} | allocation record`, `${o.split(" ")[0]}_score | number | [unit] | [instrument]`, "Add one row for every variable you will analyse."],
    questionnaire: ["Section A: about you (age band, year of study), only what you need.", `Section B: about ${i} (frequency, experience), closed questions with clear options.`, `Section C: about ${o}, using a validated scale where one exists.`, "Pilot it with a few people, and revise unclear questions before the main study."],
    stats: ["Describe data first: counts and percentages for categories; mean (SD) or median (IQR) for numbers, depending on distribution.", `Compare groups on ${o} with a test that fits the data type and design (e.g. chi-square, t-test or a non-parametric test).`, "Report effect sizes with confidence intervals, not just p-values.", "Ask: what would change my conclusion? That's where sensitivity analyses go."],
    manuscript: ["Title, abstract, keywords.", "Introduction: what's known, the gap, your objective.", "Methods: enough detail for someone else to repeat the study.", "Results: your findings only, in the order of your objectives, with tables and figures.", "Discussion: what it means, strengths and limitations, how it fits with other work.", "Conclusion, references (checked by you), declarations including AI assistance."],
    abstract: [`Background: [why ${o} in ${p} matters].`, `Aim: to compare ${o} between ${i} and ${c} in ${p}.`, "Methods: [design, setting, participants, measures, analysis].", "Results: [your results, once you have them].", "Conclusion: [what your results support]."],
    poster: [`Title: ${t}.`, "Three-sentence introduction, a simple methods diagram, results as one or two clear figures (yours), and a short take-home message.", "Keep text large enough to read from two metres; acknowledge supervisors and the AI assistance."],
    reviewers: ["Thank the reviewers, then answer each comment in turn.", "For each: quote the comment, give your response, and say exactly what changed and where (page and line).", "Where you disagree, explain why politely, with reasons from your data or the literature you've checked."],
  };
  return [DRAFT_LABEL, ...(instruction.trim() ? [`(You asked: ${instruction.trim()})`] : []), "", ...body[step]].join("\n");
}

export async function createResearch(userId: string, title: string, now = Date.now(), pico: Pico = { p: "", i: "", c: "", o: "" }) {
  if (!title.trim()) throw new Error("Give the research project a title.");
  return createItem<ResearchData>(userId, "research", title, { title: title.trim(), pico, drafts: {}, references: [] }, null, now);
}

async function load(userId: string, id: string) {
  const it = await getItem<ResearchData>(userId, id);
  if (!it) throw new Error("That research project no longer exists.");
  return it;
}

/** A refusal throws before anything is drafted; otherwise the previous draft becomes a version. */
export async function draftStep(userId: string, id: string, step: StepId, instruction = "", now = Date.now()) {
  const no = refusal(instruction);
  if (no) throw new Error(no);
  const it = await load(userId, id);
  const next = await updateItem<ResearchData>(userId, id, { data: { ...it.data, drafts: { ...it.data.drafts, [step]: template(step, it.data, instruction) } } }, true, now);
  return next;
}

const patch = async (userId: string, id: string, f: (d: ResearchData) => ResearchData) => {
  const it = await load(userId, id);
  return updateItem<ResearchData>(userId, id, { data: f(it.data) });
};
export const saveResearch = (userId: string, id: string, f: (d: ResearchData) => ResearchData) => patch(userId, id, f);
export const addReference = (userId: string, id: string, text: string) => {
  if (!text.trim()) throw new Error("Type the reference first.");
  return patch(userId, id, (d) => ({ ...d, references: [...d.references, { id: newId("ref"), text: text.trim(), checked: false }] }));
};
export const toggleReference = (userId: string, id: string, refId: string) => patch(userId, id, (d) => ({ ...d, references: d.references.map((r) => (r.id === refId ? { ...r, checked: !r.checked } : r)) }));
export const removeReference = (userId: string, id: string, refId: string) => patch(userId, id, (d) => ({ ...d, references: d.references.filter((r) => r.id !== refId) }));

export function researchMarkdown(it: Item<ResearchData>) {
  const d = it.data;
  return [
    `# ${d.title}`,
    ...STEPS.filter((s) => d.drafts[s.id]).flatMap((s) => ["", `## ${s.label}`, d.drafts[s.id]!]),
    ...(d.references.length ? ["", "## References (entered by the student)", ...d.references.map((r) => `- ${r.text}${r.checked ? "" : " (not checked)"}`)] : []),
    "",
    AI_DISCLOSURE,
  ].join("\n");
}
