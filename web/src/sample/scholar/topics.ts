/**
 * The demo's study material: five topics written from standard undergraduate dental teaching, at four depths, with
 * quiz, flashcards, viva questions and a summary each. It stands in for a model until one is chosen (OD-14) and must be
 * reviewed by a dental academic before anyone relies on it. No citations live here: Scholar never invents a reference.
 */

export type Level = "beginner" | "ug" | "pg" | "specialist";
export const LEVELS: { id: Level; label: string; short: string }[] = [
  { id: "beginner", label: "Beginner", short: "Beginner" },
  { id: "ug", label: "Undergraduate", short: "UG" },
  { id: "pg", label: "Postgraduate", short: "PG" },
  { id: "specialist", label: "Specialist", short: "Specialist" },
];

/** A clinical photo for a picture question: free-licence, credited, with the source page it came from. */
export type QImage = { src: string; w: number; h: number; alt: string; credit: string; licence: string; source: string };
export type QuizQ = { q: string; options: string[]; answer: number; why: string; image?: QImage };
export type VivaQ = { q: string; outline: string[]; followUp: string };
export type Topic = {
  id: string;
  title: string;
  subject: string;
  keywords: string[];
  levels: Record<Level, string[]>;
  uncertain?: { kind: "uncertain" | "differs"; text: string; check: string };
  quiz: QuizQ[];
  flashcards: { front: string; back: string }[];
  viva: VivaQ[];
  summary: string[];
};

export const TOPICS: Topic[] = [
  {
    id: "pulpitis",
    title: "Pulpitis and pulpal pain",
    subject: "Endodontics",
    keywords: ["pulpitis", "pulp", "lingering", "irreversible", "reversible", "toothache", "c-fibre", "c-fiber", "hyperalgesia"],
    levels: {
      beginner: [
        "The pulp is the soft, living tissue in the middle of a tooth, with nerves and blood vessels. When it becomes inflamed, that's called pulpitis.",
        "Because the pulp sits inside hard walls, swelling has nowhere to go. Pressure builds up and presses on the nerves, which is why the pain can be strong and can come on by itself.",
        "In the early, reversible stage, pain comes only with a trigger like cold and stops a few seconds after it. In the irreversible stage, the pain lasts long after the trigger, or starts with no trigger at all.",
      ],
      ug: [
        "The pulp is a loose connective tissue enclosed in a rigid dentine chamber with a small apical opening, so it has very low compliance. When it's inflamed, vasodilatation and fluid leakage raise interstitial pressure, and that pressure can't be relieved by swelling outward.",
        "Two fibre types carry pulpal pain. A-delta fibres give the sharp, short, well-localised pain of dentine sensitivity and reversible pulpitis. C-fibres, deeper in the pulp, give dull, aching, poorly localised pain. Inflammatory mediators such as bradykinin and prostaglandins sensitise C-fibres, so they fire with no stimulus and keep firing after a stimulus is removed.",
        "That's the clinical line between the two: reversible pulpitis hurts only with a stimulus and settles within seconds; symptomatic irreversible pulpitis lingers (often given as more than 30 seconds), can be spontaneous, may be referred, and is often worse lying down.",
      ],
      pg: [
        "Pulpal inflammation in a low-compliance environment produces a localised rise in tissue pressure, with compartmentalised microcirculatory collapse and areas of necrosis that can coexist with vital tissue. Neurogenic inflammation, with release of substance P and CGRP from sensory terminals, amplifies vasodilatation and permeability.",
        "Peripheral sensitisation of C-fibres, nerve sprouting and central sensitisation together explain spontaneous, lingering and referred pain, and why heat can aggravate late-stage pain while cold sometimes relieves it.",
        "Diagnosis rests on history, thermal and electric pulp testing, percussion and radiographs, but these test neural response rather than blood supply, so they describe symptoms more than tissue state.",
      ],
      specialist: [
        "The binary of reversible versus irreversible pulpitis is a clinical decision aid rather than a histological diagnosis. Inflammation is often localised to the coronal pulp, which is the rationale for vital pulp therapies such as full pulpotomy in selected teeth with symptoms of irreversible pulpitis.",
        "Treatment planning increasingly weighs the extent of inflammation seen at the time of exposure (bleeding control within a few minutes after hydraulic calcium silicate placement is commonly used as a marker), patient factors and restorability, alongside conventional root canal treatment.",
        "Outcome data for pulpotomy in mature teeth are encouraging but come from relatively few trials with varied protocols, so case selection and follow-up matter.",
      ],
    },
    uncertain: {
      kind: "uncertain",
      text: "how well clinical symptoms such as lingering pain predict the pulp's actual histological state is debated. Check with your faculty.",
      check: "a current endodontics textbook's chapter on pulpal diagnosis",
    },
    quiz: [
      { q: "Which fibres are mainly responsible for dull, lingering pulpal pain?", options: ["A-beta fibres", "A-delta fibres", "C-fibres", "B fibres"], answer: 2, why: "C-fibres are unmyelinated, lie deeper in the pulp and give dull, poorly localised pain once sensitised." },
      { q: "Pain that stops within seconds of removing a cold stimulus suggests:", options: ["Reversible pulpitis", "Symptomatic irreversible pulpitis", "Pulp necrosis", "Acute apical abscess"], answer: 0, why: "Short, stimulus-dependent pain that settles quickly is the classic sign of reversible pulpitis." },
      { q: "Why does pulpal inflammation raise tissue pressure so readily?", options: ["The pulp has no lymphatics", "The pulp is enclosed in rigid dentine with low compliance", "Odontoblasts secrete fluid", "Blood flow stops completely"], answer: 1, why: "Swelling can't expand outward inside the rigid chamber, so pressure rises." },
      { q: "Which feature is most typical of symptomatic irreversible pulpitis?", options: ["Pain only on biting", "No response to cold", "Spontaneous pain that lingers after a stimulus", "Sinus tract"], answer: 2, why: "Spontaneous, lingering pain is the hallmark; no response to cold suggests necrosis." },
      { q: "Electric and thermal pulp tests mainly assess:", options: ["Pulpal blood supply", "Neural response", "Root canal anatomy", "Periapical bone"], answer: 1, why: "They test the nerves, not the blood supply, which is why they can mislead." },
    ],
    flashcards: [
      { front: "Reversible pulpitis: pain pattern", back: "Sharp, stimulus-dependent, settles within seconds of removing the stimulus." },
      { front: "Irreversible pulpitis: pain pattern", back: "Lingering after the stimulus, can be spontaneous, may be referred, often worse lying down." },
      { front: "A-delta fibres", back: "Myelinated, at the pulp–dentine border; sharp, well-localised pain." },
      { front: "C-fibres", back: "Unmyelinated, deeper in the pulp; dull, aching, poorly localised pain." },
      { front: "Why pulpal pressure rises", back: "Rigid dentine walls and a small apical opening give low compliance." },
      { front: "Neurogenic inflammation in the pulp", back: "Substance P and CGRP from sensory nerves increase vasodilatation and permeability." },
    ],
    viva: [
      { q: "Tell me the difference between reversible and irreversible pulpitis.", outline: ["Reversible: stimulus-dependent, short, settles in seconds", "Irreversible: lingering, spontaneous, referred, worse lying down", "Clinical categories, not histological ones"], followUp: "You said 'lingering'. How long, roughly, and why does it linger?" },
      { q: "Why is pulpal pain often so severe?", outline: ["Low-compliance chamber", "Raised interstitial pressure", "Sensitised C-fibres"], followUp: "And why might cold relieve the pain in a late case?" },
      { q: "Which nerve fibres supply the pulp, and how do they differ?", outline: ["A-delta: myelinated, sharp, localised", "C-fibres: unmyelinated, dull, diffuse", "A-beta: few, possibly pre-pain sensations"], followUp: "Which ones survive longer in a degenerating pulp, and why does that matter for testing?" },
      { q: "How would you investigate a patient with suspected irreversible pulpitis?", outline: ["History: character, duration, triggers", "Cold and electric tests, percussion, palpation", "Periapical radiograph"], followUp: "What are the limitations of those pulp tests?" },
      { q: "What's the role of inflammatory mediators in pulpitis?", outline: ["Bradykinin, prostaglandins sensitise nociceptors", "Neurogenic inflammation: substance P, CGRP", "Vasodilatation and permeability raise pressure"], followUp: "How do NSAIDs fit into that mechanism?" },
    ],
    summary: [
      "The pulp sits in a rigid chamber, so inflammation raises pressure quickly.",
      "A-delta fibres give sharp pain; C-fibres give dull, lingering pain.",
      "Reversible pulpitis: short, stimulus-dependent pain.",
      "Irreversible pulpitis: lingering, spontaneous, referred pain.",
      "Pulp tests measure nerve response, not blood supply.",
      "Symptoms correlate imperfectly with the pulp's true state.",
    ],
  },
  {
    id: "caries",
    title: "Dental caries",
    subject: "Cariology",
    keywords: ["caries", "cavity", "demineralisation", "demineralization", "streptococcus mutans", "plaque", "fluoride", "stephan", "white spot", "critical ph"],
    levels: {
      beginner: [
        "Tooth decay, or caries, happens when bacteria in plaque feed on sugars and make acid. The acid slowly dissolves minerals from the tooth.",
        "Saliva and fluoride help put minerals back. Decay forms when minerals are lost faster than they're replaced, again and again.",
        "Early decay shows as a chalky white spot. It can stop or even reverse before it becomes a hole.",
      ],
      ug: [
        "Caries is a biofilm-mediated, sugar-driven, dynamic disease of mineral loss. Bacteria in dental plaque ferment dietary carbohydrates to organic acids, lowering plaque pH.",
        "Below the critical pH (about 5.5 for enamel, higher for root dentine) the fluid around the tooth is undersaturated with respect to hydroxyapatite and mineral dissolves. The Stephan curve shows how pH falls within minutes of a sugar intake and recovers over 30–60 minutes as saliva buffers it.",
        "Fluoride works mainly topically: it favours remineralisation, forms a less soluble fluorapatite-like phase and, at higher levels, inhibits bacterial enzymes. The first visible sign is a white spot lesion, which can arrest.",
      ],
      pg: [
        "The ecological plaque hypothesis frames caries as a shift in the biofilm toward acidogenic and aciduric species under frequent sugar and low pH, rather than infection by one pathogen. Mutans streptococci and lactobacilli are associated, but many other species contribute.",
        "Lesion activity, not just presence, guides management: systems such as ICDAS record severity, and activity is judged from texture, colour and plaque stagnation.",
        "Non-operative care (diet, fluoride, sealants, resin infiltration) aims to arrest lesions; operative care is reserved for cavitated or cleansable-failing lesions, with selective caries removal favoured in deep lesions.",
      ],
      specialist: [
        "Contemporary caries management is risk- and activity-based and spans the life course. Minimal intervention approaches such as selective removal to soft or firm dentine, stepwise excavation and sealing over caries have reshaped deep-lesion treatment.",
        "Silver diamine fluoride, resin infiltration and the Hall technique for primary molars reflect a move toward controlling the biofilm and sealing lesions rather than removing all demineralised tissue.",
        "Risk tools differ in validity, and their predictive power for individuals is modest, which is worth keeping in mind when recall intervals are based on them.",
      ],
    },
    uncertain: {
      kind: "differs",
      text: "how much weight to give specific bacteria such as mutans streptococci, compared with the overall shift in the biofilm, varies between teaching sources.",
      check: "your cariology notes on the ecological plaque hypothesis",
    },
    quiz: [
      { q: "The approximate critical pH for enamel is:", options: ["4.0", "5.5", "6.8", "7.4"], answer: 1, why: "Below about 5.5, plaque fluid is undersaturated with respect to enamel mineral." },
      { q: "The Stephan curve shows:", options: ["Fluoride uptake over time", "Plaque pH after a sugar intake", "Salivary flow by age", "Lesion depth over months"], answer: 1, why: "pH drops within minutes of sugar and recovers over 30–60 minutes." },
      { q: "Fluoride's main anti-caries effect is:", options: ["Killing all plaque bacteria", "Topical, favouring remineralisation", "Systemic, during tooth formation only", "Raising salivary pH"], answer: 1, why: "Its main effect is topical, at the tooth surface." },
      { q: "The earliest clinically visible caries lesion is:", options: ["A cavity", "A white spot lesion", "A brown stain", "Pulp exposure"], answer: 1, why: "A chalky white spot is the first visible sign, and it can arrest." },
      { q: "The ecological plaque hypothesis says caries results from:", options: ["Infection by a single species", "A shift in the biofilm under frequent sugar and low pH", "Genetic enamel defects", "Poor brushing alone"], answer: 1, why: "Environmental change drives a shift to acidogenic, aciduric species." },
    ],
    flashcards: [
      { front: "Caries in one line", back: "A biofilm-mediated, sugar-driven, dynamic disease of mineral loss." },
      { front: "Critical pH of enamel", back: "About 5.5 (higher for root dentine)." },
      { front: "Stephan curve", back: "Plaque pH falls within minutes of sugar, recovers over 30–60 minutes." },
      { front: "How fluoride works", back: "Mainly topical: favours remineralisation, less soluble mineral phase, inhibits bacterial enzymes." },
      { front: "White spot lesion", back: "Earliest visible lesion; subsurface demineralisation under an intact surface; can arrest." },
      { front: "Ecological plaque hypothesis", back: "Frequent sugar and low pH shift the biofilm toward acid-producing, acid-tolerant species." },
    ],
    viva: [
      { q: "Define dental caries.", outline: ["Biofilm-mediated, sugar-driven", "Dynamic de- and remineralisation", "Net mineral loss over time"], followUp: "Why do we call it dynamic?" },
      { q: "Explain the Stephan curve.", outline: ["pH drop after sugar", "Below critical pH: demineralisation", "Recovery with salivary buffering"], followUp: "What does sugar frequency do to that curve over a day?" },
      { q: "How does fluoride prevent caries?", outline: ["Topical action dominates", "Remineralisation, fluorapatite-like phase", "Enzyme inhibition at higher levels"], followUp: "Then why do we still use fluoridated water?" },
      { q: "What is a white spot lesion?", outline: ["Subsurface demineralisation", "Intact surface layer", "Can arrest or remineralise"], followUp: "How would you tell an active one from an arrested one?" },
      { q: "Which bacteria are associated with caries?", outline: ["Mutans streptococci", "Lactobacilli", "Many others: a community effect"], followUp: "So is caries an infectious disease?" },
    ],
    summary: [
      "Caries is a sugar-driven disease of the biofilm, not just of the tooth.",
      "Below pH 5.5, enamel loses mineral.",
      "Sugar frequency matters more than total amount.",
      "Fluoride works mainly at the tooth surface.",
      "White spot lesions can arrest.",
      "Manage by activity and risk, not presence alone.",
    ],
  },
  {
    id: "class-ii",
    title: "Class II cavity preparation",
    subject: "Operative dentistry",
    keywords: ["class ii", "class 2", "proximal", "box preparation", "matrix band", "amalgam", "composite restoration", "marginal ridge", "cavity preparation", "gingival floor"],
    levels: {
      beginner: [
        "In G. V. Black's system, Class II means decay on the surfaces between back teeth (premolars and molars).",
        "To restore it, the dentist shapes an opening from the biting surface down into the space between the teeth, called the box.",
        "A thin metal band and a small wedge hold the filling in shape so it touches the next tooth properly.",
      ],
      ug: [
        "A Class II lesion involves the proximal surface of a premolar or molar. The preparation usually has an occlusal outline and a proximal box with axial wall, gingival floor and buccal and lingual walls.",
        "For amalgam, the design needs resistance and retention form: adequate depth (around 1.5–2 mm), a narrow isthmus, a flat gingival floor, rounded internal angles and, where needed, proximal retention grooves. Margins meet the surface at about 90 degrees so the amalgam edge isn't thin.",
        "For composite, the preparation is more conservative and defined by caries removal, relying on adhesion rather than mechanical retention. In both, a matrix band and wedge recreate the contact and the marginal ridge.",
      ],
      pg: [
        "Modern preparations follow minimal intervention: access is limited to what caries removal needs, unsupported enamel is managed according to the material, and slot or tunnel designs are considered for small lesions.",
        "Contact quality depends on matrix choice: sectional matrices with separation rings give tighter, better-contoured contacts than circumferential bands for composite.",
        "Deep gingival margins below the enamel make bonding and isolation harder, with options including rubber dam with retraction, open sandwich with glass ionomer, or deep margin elevation.",
      ],
      specialist: [
        "Decision-making balances lesion activity, cleansability and the tooth's remaining structure. Approaches like resin infiltration may defer preparation for non-cavitated proximal lesions.",
        "Material choice is shifting with the global amalgam phase-down, and long-term survival of large composite restorations depends heavily on technique, isolation and patient caries risk.",
        "Deep margin elevation remains debated: outcome data are limited and periodontal response at the elevated margin needs attention.",
      ],
    },
    uncertain: {
      kind: "uncertain",
      text: "the best way to restore deep gingival margins with composite (open sandwich, deep margin elevation or neither) is still debated.",
      check: "your operative dentistry department's protocol",
    },
    quiz: [
      { q: "A Class II lesion in Black's classification is on:", options: ["Proximal surfaces of anterior teeth", "Proximal surfaces of premolars and molars", "Cervical third of any tooth", "Incisal edges"], answer: 1, why: "Class II: proximal surfaces of posterior teeth." },
      { q: "For amalgam, the cavosurface margin should ideally be about:", options: ["45°", "90°", "135°", "Bevelled at 30°"], answer: 1, why: "A butt joint avoids thin, fracture-prone amalgam edges." },
      { q: "The wedge in a Class II restoration mainly:", options: ["Retains the filling", "Adapts the matrix at the gingival margin and separates teeth slightly", "Isolates from saliva", "Polishes the margin"], answer: 1, why: "It seals the matrix cervically and helps create a tight contact." },
      { q: "Proximal retention grooves are mainly used for:", options: ["Composite", "Amalgam", "Glass ionomer", "Inlays only"], answer: 1, why: "Amalgam relies on mechanical retention." },
      { q: "Sectional matrices with rings are preferred for composite because they:", options: ["Are cheaper", "Give tighter, better-contoured contacts", "Need no wedge", "Bond to tooth"], answer: 1, why: "Composite doesn't condense, so contact relies on the matrix system." },
    ],
    flashcards: [
      { front: "Class II (Black)", back: "Proximal surfaces of premolars and molars." },
      { front: "Parts of the proximal box", back: "Axial wall, gingival floor, buccal and lingual walls." },
      { front: "Amalgam margin angle", back: "About 90° (butt joint)." },
      { front: "Purpose of the wedge", back: "Seals the matrix cervically, separates teeth, helps the contact." },
      { front: "Composite Class II design", back: "Conservative, defined by caries removal, relies on adhesion." },
      { front: "Deep margin options", back: "Rubber dam with retraction, open sandwich, deep margin elevation." },
    ],
    viva: [
      { q: "Describe a Class II preparation for amalgam.", outline: ["Occlusal outline and proximal box", "Depth, isthmus, flat gingival floor", "Rounded internal angles, retention grooves, 90° margins"], followUp: "Why rounded internal line angles?" },
      { q: "How does a composite Class II preparation differ?", outline: ["Conservative, caries-defined", "Adhesive retention", "Bevels optional on enamel"], followUp: "What's the main reason Class II composites fail?" },
      { q: "How do you get a good contact point?", outline: ["Matrix choice", "Wedging", "Ring separation"], followUp: "What happens clinically if the contact is open?" },
      { q: "What is resistance form?", outline: ["Shape that helps tooth and restoration resist fracture", "Flat floors, adequate bulk", "Rounded angles"], followUp: "And retention form?" },
      { q: "How would you manage a gingival margin below the enamel?", outline: ["Isolation", "Open sandwich or deep margin elevation", "Consider indirect options"], followUp: "What periodontal concerns does that raise?" },
    ],
    summary: [
      "Class II: proximal surfaces of posterior teeth.",
      "Amalgam needs mechanical retention and 90° margins.",
      "Composite is conservative and adhesive.",
      "Matrix and wedge make the contact and marginal ridge.",
      "Deep margins are the hardest part to restore well.",
    ],
  },
  {
    id: "local-anaesthesia",
    title: "Local anaesthesia in dentistry",
    subject: "Oral surgery and pharmacology",
    keywords: ["local anaesthesia", "local anesthesia", "anaesthetic", "anesthetic", "lignocaine", "lidocaine", "articaine", "inferior alveolar", "nerve block", "ianb", "adrenaline", "maximum dose"],
    levels: {
      beginner: [
        "Local anaesthetic stops a nerve from sending pain signals for a while, so dental work doesn't hurt.",
        "It's injected near the nerve. Some injections numb one tooth; a nerve block numbs a whole area, like half the lower jaw.",
        "Most dental anaesthetics include a little adrenaline, which keeps the drug in place longer and reduces bleeding.",
      ],
      ug: [
        "Local anaesthetics block voltage-gated sodium channels from inside the nerve membrane, stopping action potentials. They're weak bases: the uncharged form crosses the membrane, and the charged form blocks the channel.",
        "Lignocaine 2% (20 mg per ml) with adrenaline is widely used; a 2.2 ml cartridge holds 44 mg. Articaine 4% diffuses well through bone. Adrenaline slows absorption, prolongs action and reduces bleeding.",
        "Inflamed tissue is more acidic, so less of the drug is uncharged and able to enter the nerve, which is one reason anaesthesia fails in a hot tooth. Other causes of a failed inferior alveolar nerve block include poor technique, anatomical variation and accessory innervation such as the mylohyoid nerve.",
      ],
      pg: [
        "Maximum doses depend on the drug, the vasoconstrictor and the patient's weight, health and age, and they're cumulative across cartridges and drugs. Aspiration before injection reduces intravascular injection.",
        "Alternatives when an inferior alveolar nerve block fails include Gow-Gates and Vazirani-Akinosi blocks, buccal articaine infiltration, intraligamentary and intraosseous injections.",
        "Systemic toxicity shows first as central excitation (circumoral tingling, tinnitus, metallic taste, slurred speech, tremor, seizures) followed by depression, with cardiovascular effects at higher levels.",
      ],
      specialist: [
        "Profound pulpal anaesthesia in symptomatic irreversible pulpitis remains difficult: success rates for a single inferior alveolar nerve block are modest, and supplementary techniques are often needed.",
        "Pre-operative NSAIDs, buffered anaesthetic and articaine supplementation have been studied with mixed results. Patient factors and anxiety also affect the perception of failure.",
        "Medical history (cardiovascular disease, interacting drugs, pregnancy, methaemoglobinaemia risk with prilocaine and articaine at high doses) should guide drug and dose selection.",
      ],
    },
    uncertain: {
      kind: "differs",
      text: "the maximum dose figures for lignocaine vary between references and countries. Use the figure your college teaches and check it before applying it.",
      check: "your pharmacology notes or your department's dosing chart",
    },
    quiz: [
      { q: "Local anaesthetics act mainly by blocking:", options: ["Potassium channels", "Voltage-gated sodium channels", "Calcium channels", "GABA receptors"], answer: 1, why: "They block sodium channels from inside the membrane." },
      { q: "How many mg of lignocaine are in a 2.2 ml cartridge of a 2% solution?", options: ["22 mg", "44 mg", "88 mg", "20 mg"], answer: 1, why: "2% = 20 mg/ml; 20 × 2.2 = 44 mg." },
      { q: "Why does anaesthesia fail more often in inflamed tissue?", options: ["Higher pH", "Lower pH reduces the uncharged form", "Fewer nerves", "Faster metabolism in the liver"], answer: 1, why: "In acidic tissue less drug is in the membrane-crossing uncharged form." },
      { q: "Accessory innervation that can cause a failed IANB:", options: ["Mylohyoid nerve", "Facial nerve", "Chorda tympani", "Hypoglossal nerve"], answer: 0, why: "The mylohyoid nerve can supply mandibular molars." },
      { q: "An early sign of local anaesthetic toxicity is:", options: ["Bradycardia", "Circumoral tingling", "Rash", "Hypoglycaemia"], answer: 1, why: "Central excitation comes first: tingling, tinnitus, metallic taste." },
    ],
    flashcards: [
      { front: "Mechanism of local anaesthetics", back: "Block voltage-gated sodium channels from inside the membrane." },
      { front: "2% lignocaine", back: "20 mg per ml; 44 mg in a 2.2 ml cartridge." },
      { front: "Why add adrenaline", back: "Slows absorption, prolongs action, reduces bleeding." },
      { front: "Failed IANB: reasons", back: "Technique, anatomy, accessory innervation (mylohyoid), inflamed tissue." },
      { front: "Alternatives to IANB", back: "Gow-Gates, Vazirani-Akinosi, buccal articaine infiltration, intraligamentary, intraosseous." },
      { front: "Early toxicity signs", back: "Circumoral tingling, tinnitus, metallic taste, slurred speech, tremor." },
    ],
    viva: [
      { q: "How does a local anaesthetic work?", outline: ["Weak base, uncharged form crosses membrane", "Charged form blocks sodium channel", "No action potential"], followUp: "Why does pKa matter for onset?" },
      { q: "Give me three reasons an inferior alveolar nerve block might fail.", outline: ["Technique: landmark or depth", "Accessory innervation, e.g. mylohyoid", "Inflamed tissue, lower pH"], followUp: "You said lower pH. Explain exactly why that reduces the effect." },
      { q: "Why do we add adrenaline?", outline: ["Vasoconstriction", "Slower absorption, longer action", "Less bleeding, lower toxicity risk"], followUp: "When would you be cautious with it?" },
      { q: "How would you work out a maximum safe dose?", outline: ["Drug and vasoconstrictor", "Weight-based dose with an absolute ceiling", "Cumulative across cartridges"], followUp: "How many cartridges is that for a 60 kg adult, using the figure you were taught?" },
      { q: "What are the signs of local anaesthetic toxicity?", outline: ["CNS excitation first", "Then depression", "Cardiovascular effects at higher levels"], followUp: "What would you do first if it happened in your chair?" },
    ],
    summary: [
      "Local anaesthetics block sodium channels.",
      "2% lignocaine = 20 mg/ml; 44 mg per 2.2 ml cartridge.",
      "Adrenaline prolongs action and reduces bleeding.",
      "Inflamed, acidic tissue reduces effectiveness.",
      "Doses are cumulative; maximum figures vary by source.",
      "Toxicity: excitation first, then depression.",
    ],
  },
  {
    id: "perio-classification",
    title: "Periodontitis: staging and grading",
    subject: "Periodontics",
    keywords: ["periodontitis", "periodontal", "gingivitis", "staging", "grading", "attachment loss", "bone loss", "pocket", "aap", "efp"],
    levels: {
      beginner: [
        "Periodontitis is gum disease that damages the tissues and bone holding the teeth. Without treatment, teeth can loosen and be lost.",
        "Dentists describe it with a stage (how much damage there is) and a grade (how fast it's getting worse).",
        "Smoking and poorly controlled diabetes make it progress faster.",
      ],
      ug: [
        "The current AAP/EFP classification describes periodontitis by stage and grade. Stage (I to IV) reflects severity and complexity: interdental clinical attachment loss (CAL), radiographic bone loss (RBL) and tooth loss due to periodontitis, adjusted for complexity factors such as deep pockets, furcations and bite collapse.",
        "In outline: Stage I has CAL of 1–2 mm and RBL in the coronal 15%; Stage II has CAL of 3–4 mm and RBL of 15–33%; Stages III and IV have CAL of 5 mm or more with bone loss into the middle third or beyond, Stage IV adding loss of five or more teeth or need for complex rehabilitation.",
        "Grade (A, B, C) reflects the rate of progression, judged directly or from percentage bone loss divided by age, and is modified by risk factors: smoking and diabetes (HbA1c) can raise the grade.",
      ],
      pg: [
        "Extent is described as localised (under 30% of teeth), generalised, or molar–incisor pattern. The framework aims to link diagnosis to treatment complexity and prognosis.",
        "The bone loss/age ratio used as indirect evidence for grade is: under 0.25 grade A, 0.25 to 1.0 grade B, over 1.0 grade C. Smoking 10 or more cigarettes a day or HbA1c of 7% or more moves a case to grade C.",
        "Staging is set by the most severe site, and stage doesn't go down after treatment, whereas the case's stability is described separately.",
      ],
      specialist: [
        "The classification integrates severity, complexity and risk in one diagnosis, but it's more demanding to apply than earlier systems, especially for borderline Stage III/IV cases and grade assignment without longitudinal data.",
        "Studies report only moderate agreement between examiners for stage and grade, which has prompted decision-tree tools and calibration training.",
        "Its value for individual prognosis and treatment planning is still being evaluated in long-term cohorts.",
      ],
    },
    uncertain: {
      kind: "uncertain",
      text: "agreement between examiners when staging and grading the same patient is only moderate in published studies, so borderline cases are a matter of judgement.",
      check: "your periodontics department's staging decision tree",
    },
    quiz: [
      { q: "Stage in the current classification mainly reflects:", options: ["Rate of progression", "Severity and complexity", "Patient age", "Number of risk factors"], answer: 1, why: "Stage is severity plus complexity; grade is rate." },
      { q: "Interdental CAL of 3–4 mm with RBL of 15–33% is:", options: ["Stage I", "Stage II", "Stage III", "Stage IV"], answer: 1, why: "These are the Stage II thresholds." },
      { q: "A bone loss/age ratio over 1.0 suggests:", options: ["Grade A", "Grade B", "Grade C", "Stage IV"], answer: 2, why: "Over 1.0 indicates rapid progression: grade C." },
      { q: "Smoking 10 or more cigarettes a day moves the grade to:", options: ["A", "B", "C", "No change"], answer: 2, why: "Heavy smoking is a grade C modifier." },
      { q: "'Localised' periodontitis involves:", options: ["Under 30% of teeth", "Under 50% of teeth", "Only molars", "Only one quadrant"], answer: 0, why: "Localised is under 30% of teeth involved." },
    ],
    flashcards: [
      { front: "Stage vs grade", back: "Stage: severity and complexity. Grade: rate of progression and risk." },
      { front: "Stage I", back: "CAL 1–2 mm, RBL coronal 15%, no tooth loss due to periodontitis." },
      { front: "Stage II", back: "CAL 3–4 mm, RBL 15–33%." },
      { front: "Stage III vs IV", back: "Both CAL ≥ 5 mm; IV adds ≥ 5 teeth lost or complex rehabilitation." },
      { front: "Grade by bone loss/age", back: "< 0.25 A · 0.25–1.0 B · > 1.0 C." },
      { front: "Grade C modifiers", back: "Smoking ≥ 10 a day; HbA1c ≥ 7%." },
    ],
    viva: [
      { q: "Explain staging and grading in periodontitis.", outline: ["Stage: severity and complexity", "Grade: progression and risk", "Extent: localised, generalised, molar–incisor"], followUp: "Can a patient's stage go down after treatment?" },
      { q: "How do you decide between Stage III and Stage IV?", outline: ["Both CAL ≥ 5 mm", "Tooth loss due to periodontitis", "Complexity: bite collapse, need for rehabilitation"], followUp: "Which complexity factors would you look for?" },
      { q: "How is grade estimated without previous records?", outline: ["Percentage bone loss / age", "Thresholds 0.25 and 1.0", "Phenotype: biofilm vs destruction"], followUp: "What would you use if you did have old radiographs?" },
      { q: "How do smoking and diabetes affect the diagnosis?", outline: ["Grade modifiers", "Smoking ≥ 10/day", "HbA1c ≥ 7%"], followUp: "Why does diabetes worsen periodontitis?" },
      { q: "What are the weaknesses of this classification?", outline: ["Complex to apply", "Moderate examiner agreement", "Prognostic value still being evaluated"], followUp: "How would you make your own staging more consistent?" },
    ],
    summary: [
      "Stage = severity and complexity; grade = rate and risk.",
      "CAL, bone loss and tooth loss set the stage.",
      "Bone loss/age ratio estimates the grade.",
      "Smoking and HbA1c can raise the grade.",
      "Stage is set by the worst site and doesn't go down.",
    ],
  },
];

export const topicById = (id: string | null | undefined) => TOPICS.find((t) => t.id === id) ?? null;
