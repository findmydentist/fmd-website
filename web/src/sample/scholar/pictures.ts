/**
 * Picture questions: real clinical photos from Wikimedia Commons (CC0 or CC BY-SA, credited on screen). Each question asks
 * only about what the photo's own Commons description states, so no finding is invented; the "why" is standard
 * undergraduate teaching. Like the rest of the demo material, a dental academic should review these before use.
 * Images: node scripts/fetch-scholar-images.mjs → public/media/scholar.
 */
import type { QImage, QuizQ } from "./topics.ts";

const img = (key: string, w: number, h: number, alt: string, credit: string, licence: string, file: string): QImage => ({
  src: `/media/scholar/${key}.webp`,
  w,
  h,
  alt,
  credit,
  licence,
  source: `https://commons.wikimedia.org/wiki/File:${file}`,
});

export const PICTURES: { topic_id: string; q: QuizQ }[] = [
  {
    topic_id: "perio-classification",
    q: {
      q: "The same mouth before (top) and nine days after (bottom) scaling. What does the change show?",
      image: img("gingivitis-before-after", 1280, 1116, "Two photos of the same front teeth. Top: yellow deposits along the gumline and red, swollen gum margins. Bottom: clean teeth with pink, firm gums.", "Onetimeuseaccount", "CC0", "Gingivitis-before-and-after-3.jpg"),
      options: [
        "Gingivitis settles once plaque and calculus are removed",
        "Bone lost to periodontitis grows back after scaling",
        "Scaling caused recession that hides the inflammation",
        "Fluoride varnish whitened the enamel",
      ],
      answer: 0,
      why: "Inflammation confined to the gingiva is reversible: remove the plaque biofilm and calculus that keep it going, keep cleaning at home, and the gum margins return to health. Attachment and bone already lost to periodontitis don't come back this way.",
    },
  },
  {
    topic_id: "perio-classification",
    q: {
      q: "A 20-year-old's front teeth. Which description fits what you see at the gum margins?",
      image: img("gingivitis-calculus", 1280, 960, "Front teeth with red, swollen gum margins, hard deposits near the gumline and brownish surface staining.", "Roquex", "CC0", "Gingivitis.jpg"),
      options: ["Gingivitis with calculus and extrinsic staining", "Dental fluorosis", "Healthy gingiva with normal pigmentation", "Gingival recession from toothbrush trauma"],
      answer: 0,
      why: "Red, swollen marginal gingiva is gingivitis. The hard deposits are calculus, which holds plaque against the gum, and the surface stain is extrinsic, so it can be removed. Scaling and better daily cleaning let the gingiva heal.",
    },
  },
  {
    topic_id: "perio-classification",
    q: {
      q: "Why are there dark triangular gaps on either side of this implant-supported crown?",
      image: img("black-triangles-implant", 1280, 774, "An implant crown in the front of the mouth with dark triangular spaces between it and the neighbouring teeth, near the gums.", "Coronation Dental Specialty Group", "CC BY-SA 3.0", "Black_triangles_large.jpg"),
      options: [
        "Bone between the implant and the neighbouring teeth was lost, so the gum papillae aren't supported",
        "Cement was left behind under the crown",
        "The neighbouring teeth have caries",
        "Shadows from the camera flash",
      ],
      answer: 0,
      why: "The papilla that fills the space between teeth needs bone beneath it. When the bone between an implant and the teeth next to it is lost, the papilla recedes and leaves an open dark space, often called a black triangle.",
    },
  },
  {
    topic_id: "perio-classification",
    q: {
      q: "Which set of findings does this intra-oral photograph show?",
      image: img("caries-perio-calculus", 561, 373, "Teeth with large cavities, gums that have shrunk back from the teeth and thick deposits on the tooth surfaces.", "Warren Schneider", "CC BY-SA 4.0", "Caries,_Periodontal_disease,_calculus.png"),
      options: ["Gross caries, severe chronic periodontal disease and heavy calculus", "Dental fluorosis with extrinsic stain only", "A healthy periodontium with old restorations", "Acute necrotising gingivitis only"],
      answer: 0,
      why: "Large cavitated lesions, loss of gum and bone around the teeth, and thick calculus often appear together where plaque has been left for a long time. The same biofilm drives caries and periodontal disease, and calculus keeps plaque against the teeth and roots.",
    },
  },
  {
    topic_id: "caries",
    q: {
      q: "In this adult, the green arrows point to one condition and the red arrows to another. Which pair is it?",
      image: img("fluorosis-severe-caries", 1077, 401, "Upper and lower teeth with brown, mottled enamel. Green arrows point to the mottled areas and red arrows to dark cavities.", "FinalGamer", "CC BY-SA 3.0", "Severe_fluorosis.JPG"),
      options: ["Green: dental fluorosis; red: caries", "Green: caries; red: dental fluorosis", "Green: tetracycline staining; red: erosion", "Green: amelogenesis imperfecta; red: attrition"],
      answer: 0,
      why: "Fluorosis is a developmental enamel defect from too much fluoride while the teeth are forming: mottling and, when severe, brown staining and pitting. Caries is acquired later, when plaque bacteria demineralise the tooth. Fluorosed enamel can still decay, as this mouth shows.",
    },
  },
  {
    topic_id: "caries",
    q: {
      q: "These faint opaque white flecks are most noticeable on the upper right central incisor (11). What is the most likely cause?",
      image: img("fluorosis-mild", 1280, 683, "Upper front teeth with faint, opaque white flecks on the enamel, clearest on one central incisor.", "Dozenist", "CC BY-SA 3.0", "MildFluorosis02-24-09.jpg"),
      options: ["Mild dental fluorosis", "Active white-spot caries lesions", "Tetracycline staining", "Dental erosion"],
      answer: 0,
      why: "Mild fluorosis shows as diffuse, opaque white flecks or lines on teeth that formed at the same time, usually on both sides. Early caries white spots sit where plaque collects, such as near the gumline, and look chalky. A history of extra fluoride while the teeth were forming supports fluorosis.",
    },
  },
];

export const picturesFor = (topicId: string) => PICTURES.filter((p) => p.topic_id === topicId).map((p) => p.q);
