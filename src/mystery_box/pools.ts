// src/mystery_box/pools.ts
// The data layer: 13 trait pools keyed by category.
//
// Starter pools: ~6 entries per category, spread across the 5 bands.
// Spec target is 30–60 per category — grow these in a follow-up commit.
// Adding entries does NOT require touching any logic.

import type { TraitPool } from "../types.js";

const NAMES: TraitPool = [
  // Common (21) — ordinary first names from any real office, deadpan realism
  { value: "Steve",   band: "Common" },
  { value: "Karen",   band: "Common" },
  { value: "Dave",    band: "Common" },
  { value: "Linda",   band: "Common" },
  { value: "Keith",   band: "Common" },
  { value: "Susan",   band: "Common" },
  { value: "Colin",   band: "Common" },
  { value: "Barbara", band: "Common" },
  { value: "Gary",    band: "Common" },
  { value: "Janet",   band: "Common" },
  { value: "Trevor",  band: "Common" },
  { value: "Pauline", band: "Common" },
  { value: "Nigel",   band: "Common" },
  { value: "Margaret", band: "Common" },
  { value: "Ian",     band: "Common" },
  { value: "Sheila",  band: "Common" },
  { value: "Doreen",  band: "Common" },
  { value: "Carol",   band: "Common" },
  { value: "Priya",   band: "Common" },
  { value: "Yusuf",   band: "Common" },
  { value: "Aoife",   band: "Common" },

  // Uncommon (12) — distinctive names, mix of British-uncommon and international
  { value: "Derek",   band: "Uncommon" },
  { value: "Bernard", band: "Uncommon" },
  { value: "Agatha",  band: "Uncommon" },
  { value: "Humphrey", band: "Uncommon" },
  { value: "Hans",    band: "Uncommon" },
  { value: "Siobhan", band: "Uncommon" },
  { value: "Kenji",   band: "Uncommon" },
  { value: "Ingrid",  band: "Uncommon" },
  { value: "Rajesh",  band: "Uncommon" },
  { value: "Małgorzata", band: "Uncommon" },
  { value: "Tomasz",  band: "Uncommon" },
  { value: "Niamh",   band: "Uncommon" },

  // Rare (7) — first name + office-shorthand qualifier
  { value: "Brenda from Accounts", band: "Rare" },
  { value: "Dave who used to be a contractor", band: "Rare" },
  { value: "Linda on the third floor", band: "Rare" },
  { value: "the other Steve", band: "Rare" },
  { value: "Nick from Procurement (not that Nick)", band: "Rare" },
  { value: "Tall Paul", band: "Rare" },
  { value: "Susan from the London office", band: "Rare" },

  // Legendary (3) — memorable one-word or titled names
  { value: "Günther", band: "Legendary" },
  { value: "Mx. Featherington", band: "Legendary" },
  { value: "Ambrose", band: "Legendary" },

  // Mythic (2) — names that are statements about the person
  { value: "The One Who Doesn't Speak", band: "Mythic" },
  { value: "She Who Approves Expense Reports", band: "Mythic" },
];

const JOB_TITLES: TraitPool = [
  // Common (21) — realistic job titles you'd see on a real org chart
  { value: "Senior Developer",          band: "Common" },
  { value: "QA Lead",                   band: "Common" },
  { value: "Account Executive",         band: "Common" },
  { value: "IT Support Technician",     band: "Common" },
  { value: "Office Manager",            band: "Common" },
  { value: "Junior Analyst",            band: "Common" },
  { value: "Operations Coordinator",    band: "Common" },
  { value: "Project Manager",           band: "Common" },
  { value: "Marketing Associate",       band: "Common" },
  { value: "Business Analyst",          band: "Common" },
  { value: "HR Generalist",             band: "Common" },
  { value: "Finance Manager",           band: "Common" },
  { value: "Executive Assistant",       band: "Common" },
  { value: "Sales Representative",      band: "Common" },
  { value: "Product Designer",          band: "Common" },
  { value: "Data Engineer",             band: "Common" },
  { value: "Customer Success Manager",  band: "Common" },
  { value: "Technical Writer",          band: "Common" },
  { value: "Procurement Officer",       band: "Common" },
  { value: "Facilities Coordinator",    band: "Common" },
  { value: "Payroll Administrator",     band: "Common" },

  // Uncommon (12) — real but slightly baroque corporate titles
  { value: "Regional Manager",          band: "Uncommon" },
  { value: "Senior Customer Success Enablement Specialist", band: "Uncommon" },
  { value: "Head of Stakeholder Relations", band: "Uncommon" },
  { value: "Principal Product Evangelist", band: "Uncommon" },
  { value: "Director of Strategic Initiatives", band: "Uncommon" },
  { value: "VP of People Operations",   band: "Uncommon" },
  { value: "Chief of Staff to the COO", band: "Uncommon" },
  { value: "Lead Synergy Architect",    band: "Uncommon" },
  { value: "Global Head of Learning and Development", band: "Uncommon" },
  { value: "Senior Manager, Digital Transformation", band: "Uncommon" },
  { value: "Associate Director of Thought Leadership", band: "Uncommon" },
  { value: "Head of Paid Search",       band: "Uncommon" },

  // Rare (7) — dry-funny titles that could plausibly exist in a dysfunctional office
  { value: "ASCII Comptroller",         band: "Rare" },
  { value: "Head of Mug Allocation",    band: "Rare" },
  { value: "Chair of the Fridge Cleaning Rota", band: "Rare" },
  { value: "Warden of the Second-Floor Printer", band: "Rare" },
  { value: "Chair of the Meeting Room Booking Committee", band: "Rare" },
  { value: "Deputy Director of Badge Reissue", band: "Rare" },
  { value: "Vice-Chair of the Birthday Card Subcommittee", band: "Rare" },

  // Legendary (3) — invented Michael-Scott-style titles
  { value: "Wizard of Light Bulb Moments", band: "Legendary" },
  { value: "Chancellor of Nearly-Caught-Up Emails", band: "Legendary" },
  { value: "Grand Architect of the Shared Drive", band: "Legendary" },

  // Mythic (2) — cosmic corporate titles with religious/mythic scale
  { value: "Galactic Viceroy of Research Excellence", band: "Mythic" },
  { value: "Eternal Custodian of the Quarterly Roadmap", band: "Mythic" },
];

const DESK_SETUPS: TraitPool = [
  { value: "a single dying succulent",                     band: "Common" },
  { value: "a coffee mug labelled WORLD'S OKAYEST DBA",    band: "Common" },
  { value: "a moleskine that nobody has ever seen open",   band: "Uncommon" },
  { value: "a 9-monitor day-trading rig",                  band: "Rare" },
  { value: "forty unwashed mugs in a stable equilibrium",  band: "Legendary" },
  { value: "a full-size cardboard cutout of Nicolas Cage", band: "Mythic" },
];

const HABITS: TraitPool = [
  // Common (21) — mundane office annoyances
  { value: "sends emails at midnight",                                       band: "Common" },
  { value: "replies-all to everything",                                      band: "Common" },
  { value: "reads every email aloud before sending",                         band: "Common" },
  { value: "eats crisps at their desk throughout every meeting",             band: "Common" },
  { value: "prints every document 'just in case'",                           band: "Common" },
  { value: "chews ice loudly at the standing desk",                          band: "Common" },
  { value: "leaves voicemails instead of sending a message",                 band: "Common" },
  { value: "clears their throat before every sentence",                      band: "Common" },
  { value: "schedules meetings to discuss upcoming meetings",                band: "Common" },
  { value: "takes the stairs and mentions it each time",                     band: "Common" },
  { value: "forgets their password every Monday morning",                    band: "Common" },
  { value: "brings a banana to every meeting and never eats it",             band: "Common" },
  { value: "refuses to use the shared calendar",                             band: "Common" },
  { value: "sighs audibly before answering any question",                    band: "Common" },
  { value: "arrives exactly nine minutes early, every single day",           band: "Common" },
  { value: "keeps a jumper on the back of their chair year-round",           band: "Common" },
  { value: "asks if a meeting 'could have been an email' during the meeting", band: "Common" },
  { value: "types with two fingers and surprising speed",                    band: "Common" },
  { value: "rearranges the dishwasher after everyone else has loaded it",    band: "Common" },
  { value: "reuses the same tea bag across three separate mugs",             band: "Common" },
  { value: "refers to the CEO by their first name in every sentence",        band: "Common" },

  // Uncommon (12) — mildly unprofessional
  { value: "microwaves fish despite three separate HR warnings",             band: "Uncommon" },
  { value: "takes loud personal calls in the open-plan office",              band: "Uncommon" },
  { value: "forwards motivational quotes to the whole team on Mondays",      band: "Uncommon" },
  { value: "never wears the ID badge and argues with reception daily",       band: "Uncommon" },
  { value: "leaves passive-aggressive sticky notes on the communal fridge",  band: "Uncommon" },
  { value: "books the largest meeting room for solo calls",                  band: "Uncommon" },
  { value: "clips their fingernails at the desk on Wednesday afternoons",    band: "Uncommon" },
  { value: "keeps the out-of-office autoresponder on while sitting at the desk", band: "Uncommon" },
  { value: "corrects other people's grammar in the team chat",               band: "Uncommon" },
  { value: "brings a full home-cooked curry to eat at the hot desk",         band: "Uncommon" },
  { value: "hot-desks in a different chair every day to avoid being found",  band: "Uncommon" },
  { value: "replies to Slack threads from six weeks ago with no context",    band: "Uncommon" },

  // Rare (7) — fully unprofessional
  { value: "hums Enya during code reviews",                                  band: "Rare" },
  { value: "keeps a whiteboard nobody else is allowed to clean",             band: "Rare" },
  { value: "names each office plant and cc's them in client emails",         band: "Rare" },
  { value: "conducts one-on-ones exclusively while walking backwards",       band: "Rare" },
  { value: "ends every message with a Latin phrase they cannot translate",   band: "Rare" },
  { value: "brings a portable ring light to in-person meetings",             band: "Rare" },
  { value: "keeps a locked filing cabinet no one has seen the key to",       band: "Rare" },

  // Legendary (3) — office folklore territory
  { value: "kept a folding cot in a server cabinet during a year-long migration", band: "Legendary" },
  { value: "once mediated a two-year feud between Finance and Procurement with a single PowerPoint slide", band: "Legendary" },
  { value: "has been quoted in three separate all-hands meetings without ever being present", band: "Legendary" },

  // Mythic (2) — paranormal
  { value: "has not spoken in a meeting since 2019 and still gets bonuses",  band: "Mythic" },
  { value: "appears in every team photo going back to 2004, including ones taken before they were hired", band: "Mythic" },
];

const COFFEE_RITUALS: TraitPool = [
  { value: "black coffee, no nonsense",                                    band: "Common" },
  { value: "tea with milk, exactly one sugar",                             band: "Common" },
  { value: "a French press brewed at the desk every morning",              band: "Uncommon" },
  { value: "a Starbucks Medicine Ball, every day, no exceptions",          band: "Rare" },
  { value: "Soylent only, and will tell you about it",                     band: "Legendary" },
  { value: "a kombucha SCOBY fermenting next to the keyboard",             band: "Mythic" },
];

const MEETING_ENERGY: TraitPool = [
  { value: "always on mute",                                            band: "Common" },
  { value: "always 4 minutes late, always with a reason",               band: "Common" },
  { value: "interrupts with 'let me just jump in here'",                band: "Uncommon" },
  { value: "monologues for 47 uninterrupted minutes",                   band: "Rare" },
  { value: "books 7 a.m. meetings 'to respect everyone's focus time'",  band: "Legendary" },
  { value: "speaks only in acronyms nobody else recognises",            band: "Mythic" },
];

const PASSIVE_AGGRESSIVE: TraitPool = [
  { value: "Per my last email",                            band: "Common" },
  { value: "Just circling back",                           band: "Common" },
  { value: "Happy to discuss offline",                     band: "Uncommon" },
  { value: "Resending with urgency (same email, 8 minutes later, red exclamation)", band: "Rare" },
  { value: "As discussed (it was not discussed)",          band: "Legendary" },
  { value: "Adding a +1 with no further comment",          band: "Mythic" },
];

const PHYSICAL_HEIGHT: TraitPool = [
  { value: "average build",                                   band: "Common" },
  { value: "shorter than expected",                           band: "Common" },
  { value: "tall enough to comment on it",                    band: "Uncommon" },
  { value: "somehow taller in meetings than in person",      band: "Rare" },
  { value: "looms",                                           band: "Legendary" },
  { value: "occupies more conceptual than physical space",    band: "Mythic" },
];

const PHYSICAL_ACCESSORY: TraitPool = [
  { value: "a single lanyard with one badge",                     band: "Common" },
  { value: "a corporate fleece",                                  band: "Common" },
  { value: "reading glasses on a chain",                          band: "Uncommon" },
  { value: "a lanyard with 14 badges of varying importance",      band: "Rare" },
  { value: "a single shipwreck earring they will tell you about", band: "Legendary" },
  { value: "an ID badge from a company that no longer exists",    band: "Mythic" },
];

const PHYSICAL_EXPRESSION: TraitPool = [
  { value: "polite disappointment",                  band: "Common" },
  { value: "neutral, unreadable",                    band: "Common" },
  { value: "the face of someone about to send a long email", band: "Uncommon" },
  { value: "eyes that have seen SAP",                band: "Rare" },
  { value: "permanently mid-sentence",               band: "Legendary" },
  { value: "wears nineteen subtly different smiles", band: "Mythic" },
];

const PHYSICAL_MATERIAL: TraitPool = [
  { value: "a cardigan, at least one",                              band: "Common" },
  { value: "polo shirt, jeans, sensible shoes",                     band: "Common" },
  { value: "permed hair that hasn't changed since 1994",            band: "Uncommon" },
  { value: "the exact outfit from their LinkedIn profile, 1999",    band: "Rare" },
  { value: "a tie pinned with what may be a live firefly",          band: "Legendary" },
  { value: "dressed entirely in clothes received as conference swag", band: "Mythic" },
];

const THEME_PRIMARY: TraitPool = [
  { value: "#9C6B3A", band: "Common" },     // office-tan
  { value: "#2D4A4F", band: "Common" },     // accountant teal
  { value: "#5C3D2E", band: "Uncommon" },   // boardroom mahogany
  { value: "#A23E48", band: "Rare" },       // expense-report red
  { value: "#1F4E79", band: "Legendary" },  // PowerPoint navy
  { value: "#FFCD3C", band: "Mythic" },     // overhead-projector yellow
];

const THEME_ACCENT: TraitPool = [
  { value: "#D9D9D9", band: "Common" },
  { value: "#7F7F7F", band: "Common" },
  { value: "#C0BFA8", band: "Uncommon" },
  { value: "#6E8B3D", band: "Rare" },
  { value: "#503D2E", band: "Legendary" },
  { value: "#FF6F61", band: "Mythic" },
];

/**
 * All trait pools, keyed by category name. The category names match the
 * keys used downstream by the roller and the per_trait breakdown.
 */
export const POOLS = {
  name: NAMES,
  job_title: JOB_TITLES,
  desk_setup: DESK_SETUPS,
  habit: HABITS,
  coffee_ritual: COFFEE_RITUALS,
  meeting_energy: MEETING_ENERGY,
  passive_aggressive: PASSIVE_AGGRESSIVE,
  physical_height: PHYSICAL_HEIGHT,
  physical_accessory: PHYSICAL_ACCESSORY,
  physical_expression: PHYSICAL_EXPRESSION,
  physical_material: PHYSICAL_MATERIAL,
  theme_primary: THEME_PRIMARY,
  theme_accent: THEME_ACCENT,
} as const;

export type CategoryKey = keyof typeof POOLS;
