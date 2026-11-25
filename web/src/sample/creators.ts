/**
 * Explore creators: the dentists, clinics and students who post (patients never do), plus FMD itself. Dentists and
 * clinics reuse Find a dentist's sample providers (sample/providers.ts) by id, so "Book" opens their real booking
 * page. Proposed API: GET /creators/{handle} · GET /creators?suggested=1
 */

export type CreatorKind = "dentist" | "clinic" | "student" | "fmd";
export type Highlight = { id: string; title: string; cover: string; storyIds: string[] };
export type Creator = {
  id: string;
  handle: string;
  name: string;
  kind: CreatorKind;
  specialty: string;
  city: string;
  verified: boolean;
  /** media key, or "" for the monogram */
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  /** dentists: /book/{id}; clinics: /clinics/{clinicId} */
  bookable: boolean;
  /** the provider clinic id behind a clinic creator (Find a dentist), or the FMD Clinic id for Smile Studio */
  clinicId: string | null;
  highlights: Highlight[];
};

const c = (x: Omit<Creator, "avatar" | "highlights" | "following"> & Partial<Pick<Creator, "highlights" | "following">>): Creator => ({
  avatar: "",
  highlights: [],
  following: 180,
  ...x,
});

export const CREATORS: Creator[] = [
  c({ id: "aditi-sharma", handle: "dr.aditi", name: "Dr. Aditi Sharma", kind: "dentist", specialty: "General dentist", city: "Koramangala, Bengaluru", verified: true, bio: "Family dentistry without the fear. Prevention first, always.", followers: 12400, bookable: true, clinicId: null,
    highlights: [{ id: "h-aditi-1", title: "Cleanings", cover: "moment-teeth-closeup", storyIds: ["s-aditi-1"] }, { id: "h-aditi-2", title: "Kids", cover: "moment-kid-checkup", storyIds: ["s-aditi-2"] }] }),
  c({ id: "rohan-mehta", handle: "dr.rohan", name: "Dr. Rohan Mehta", kind: "dentist", specialty: "Orthodontist", city: "Bandra, Mumbai", verified: true, bio: "Braces and clear aligners for teens and adults. Straight answers, straight teeth.", followers: 28900, bookable: true, clinicId: null,
    highlights: [{ id: "h-rohan-1", title: "Aligner cases", cover: "moment-smile-1", storyIds: ["s-rohan-1"] }] }),
  c({ id: "meenakshi-pillai", handle: "dr.meenakshi", name: "Dr. Meenakshi Pillai", kind: "dentist", specialty: "Periodontist", city: "Kochi", verified: true, bio: "Gums are the foundation. Ask me about bleeding gums and deep cleaning.", followers: 6100, bookable: true, clinicId: null }),
  c({ id: "farah-khan", handle: "dr.farah", name: "Dr. Farah Khan", kind: "dentist", specialty: "Paediatric dentist", city: "Jubilee Hills, Hyderabad", verified: true, bio: "Happy first visits for little ones, and calm parents too.", followers: 15300, bookable: true, clinicId: null,
    highlights: [{ id: "h-farah-1", title: "First visits", cover: "moment-kid-checkup", storyIds: ["s-farah-1"] }] }),
  c({ id: "sneha-iyer", handle: "dr.sneha", name: "Dr. Sneha Iyer", kind: "dentist", specialty: "Implantologist", city: "Adyar, Chennai", verified: true, bio: "Implants planned in 3D, explained in plain words.", followers: 9800, bookable: true, clinicId: null,
    highlights: [{ id: "h-sneha-1", title: "Implant day", cover: "moment-implant-surgery", storyIds: ["s-sneha-1"] }] }),
  c({ id: "priyanka-shah", handle: "dr.priyanka", name: "Dr. Priyanka Shah", kind: "dentist", specialty: "Implantologist", city: "Ahmedabad", verified: true, bio: "Full-mouth rehabilitation and implants.", followers: 4300, bookable: true, clinicId: null }),
  c({ id: "kavya-reddy", handle: "dr.kavya", name: "Dr. Kavya Reddy", kind: "dentist", specialty: "Cosmetic dentist", city: "Banjara Hills, Hyderabad", verified: true, bio: "Natural-looking smiles: whitening, bonding and veneers.", followers: 21700, bookable: true, clinicId: null }),
  c({ id: "nikhil-joshi", handle: "dr.nikhil", name: "Dr. Nikhil Joshi", kind: "dentist", specialty: "General dentist", city: "Bandra West, Mumbai", verified: true, bio: "Everyday dentistry, done gently. Extractions without the drama.", followers: 3200, bookable: true, clinicId: null }),
  c({ id: "deepa-krishnan", handle: "dr.deepa", name: "Dr. Deepa Krishnan", kind: "dentist", specialty: "Paediatric dentist", city: "T. Nagar, Chennai", verified: true, bio: "Small teeth, big smiles. Brushing habits that stick.", followers: 4100, bookable: true, clinicId: null }),
  c({ id: "ananya-gupta", handle: "dr.ananya", name: "Dr. Ananya Gupta", kind: "dentist", specialty: "General dentist", city: "Saket, New Delhi", verified: true, bio: "Healthy gums, bright smiles. Ask me about bleeding gums and whitening.", followers: 5400, bookable: true, clinicId: null }),
  c({ id: "sanjana-kulkarni", handle: "dr.sanjana", name: "Dr. Sanjana Kulkarni", kind: "dentist", specialty: "Orthodontist", city: "Koregaon Park, Pune", verified: true, bio: "Braces and aligners for teens, with parents in the loop.", followers: 6800, bookable: true, clinicId: null }),
  c({ id: "smile-studio", handle: "smilestudio", name: "Smile Studio Dental", kind: "clinic", specialty: "Dental clinic", city: "Indiranagar, Bengaluru", verified: true, bio: "Four chairs, one calm team. Same-day appointments on Saturdays.", followers: 8200, bookable: false, clinicId: "smile-studio",
    highlights: [{ id: "h-smile-1", title: "Our clinic", cover: "moment-lab-desk", storyIds: ["s-smile-1"] }] }),
  c({ id: "bjh", handle: "pearldental", name: "Demo Pearl Dental", kind: "clinic", specialty: "Dental clinic", city: "Banjara Hills, Hyderabad", verified: true, bio: "Family dentistry and cosmetic care since 2009.", followers: 5600, bookable: true, clinicId: "bjh" }),
  c({ id: "skt", handle: "capitaldental", name: "Demo Capital Dental", kind: "clinic", specialty: "Dental clinic", city: "Saket, New Delhi", verified: true, bio: "Multi-speciality dental care in South Delhi.", followers: 7300, bookable: true, clinicId: "skt" }),
  c({ id: "rhea-kapoor", handle: "rhea.bds", name: "Rhea Kapoor", kind: "student", specialty: "BDS, final year", city: "Manipal", verified: false, bio: "Notes from dental school. Endo nerd.", followers: 19800, bookable: false, clinicId: null }),
  c({ id: "arjun-nair", handle: "arjun.mds", name: "Arjun Nair", kind: "student", specialty: "MDS Orthodontics", city: "Chennai", verified: false, bio: "Postgrad life, one bracket at a time.", followers: 3900, bookable: false, clinicId: null }),
  c({ id: "fmd", handle: "fmd", name: "FMD", kind: "fmd", specialty: "FindMyDentist", city: "India", verified: true, bio: "Find dentists you can check, keep your records, ask FMD AI.", followers: 52000, bookable: false, clinicId: null }),
];

const byId = new Map(CREATORS.map((x) => [x.id, x]));
const byHandle = new Map(CREATORS.map((x) => [x.handle, x]));
export const creatorById = (id: string) => byId.get(id);
export const creatorByHandle = (handle: string) => byHandle.get(handle.replace(/^@/, ""));

/** Where "Book" goes for a creator, or null when they don't take bookings on FMD Main. */
export const bookHref = (x: Pick<Creator, "id" | "kind" | "bookable" | "clinicId">) =>
  !x.bookable ? null : x.kind === "clinic" ? `/clinics/${x.clinicId}` : `/book/${x.id}`;
