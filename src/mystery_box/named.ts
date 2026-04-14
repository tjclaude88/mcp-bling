// src/mystery_box/named.ts
// Hand-authored 1-of-1 "Named Subjects" — the five real legendary workplace
// incidents that anchor the top tier. These bypass the random assembler
// entirely. See spec §5.5.

import type { RolledIdentity } from "../types.js";
import type { Rng } from "./rng.js";

export interface NamedSubject {
  identity: RolledIdentity;
  paragraph: string;
  lore: string;
}

function makeNamedSubject(
  name: string,
  job_title: string,
  paragraph: string,
  lore: string,
  subject_id: string,
  theme: { primary_color: string; accent_color: string },
): NamedSubject {
  const identity: RolledIdentity = {
    name,
    personality: { tone: "guarded", formality: "professional", humor: "dry" },
    theme,
    physical: { species: "human" },
    office: {
      job_title,
      desk_setup: "(redacted by Legal)",
      habit: "(see attached incident report)",
      coffee_ritual: "(unknown)",
      meeting_energy: "(does not attend)",
      passive_aggressive: "(no contemporaneous record)",
    },
    homunculus: {
      subject_id,
      cohort: "Source",
      classification: "HR Warned Us About",
      ingested: "Pre-corpus",
      flag: "Do Not Contact",
    },
  };
  return { identity, paragraph, lore };
}

export const NAMED_SUBJECTS: readonly NamedSubject[] = [
  makeNamedSubject(
    "\"Bob\" from Infrastructure",
    "Senior Software Developer (allegedly)",
    "Meet \"Bob\" — your new Senior Software Developer. Or rather: meet the Chinese consulting firm Bob paid roughly one-fifth of his six-figure salary to do his job, while he watched cat videos, browsed eBay, and posted on Reddit from his desk. Performance reviews praised his clean, well-documented code. Discovered only when Verizon noticed an unfamiliar VPN session.",
    "Verizon RISK Team report, 2013.",
    "0001",
    { primary_color: "#1F4E79", accent_color: "#D9D9D9" },     // corporate blue
  ),
  makeNamedSubject(
    "Joaquín García",
    "Property Supervisor",
    "Meet Joaquín García — your new Property Supervisor. Drew a salary of €37,000 for six years without showing up to work. Caught only when nominated for a long-service award and the people handing it to him realised they did not know who he was. The investigation that followed required two separate departments to admit they each thought he reported to the other.",
    "The Guardian, 2016.",
    "0002",
    { primary_color: "#A23E48", accent_color: "#F2D5A0" },     // Spanish red + sand
  ),
  makeNamedSubject(
    "The Knight Capital Deployment Engineer",
    "Senior Release Engineer",
    "Meet the engineer who deployed Knight Capital's new trading code to seven of eight servers and went home. The eighth server kept running the old code. In 45 minutes the firm executed $460M in unintended trades and effectively bankrupted itself. They were acquired four months later. Nobody talks about the eighth server.",
    "SEC report on Knight Capital Group's market disruption, 2012.",
    "0003",
    { primary_color: "#1A1A1A", accent_color: "#FFD700" },     // bankrupt black + gold
  ),
  makeNamedSubject(
    "The Citibank Sender",
    "Loan Operations Analyst",
    "Meet the Citibank employee who, attempting to send an interest payment, instead wired $900M of Citi's own money to Revlon's creditors with one click of a famously confusing UI. A federal judge initially ruled the recipients could keep the money. (It was later reversed on appeal — but for a long, beautiful moment, it was theirs.)",
    "Reuters, 2020.",
    "0004",
    { primary_color: "#005B96", accent_color: "#F5E0E3" },     // Citi blue + a pale Revlon-red wash (readable contrast)
  ),
  makeNamedSubject(
    "The GitLab Backup Operator",
    "Site Reliability Engineer",
    "Meet the SRE who, during an emergency database recovery in 2017, ran rm -rf on the wrong production server. All five backup methods had silently failed for months. The 18-hour recovery was livestreamed on YouTube. They kept their job. The post-mortem is required reading.",
    "GitLab public post-mortem, 2017.",
    "0005",
    { primary_color: "#FC6D26", accent_color: "#2E2E2E" },     // GitLab orange + terminal black
  ),
];

/** Pick one Named Subject uniformly at random. */
export function pickNamedSubject(rng: Rng): NamedSubject {
  return NAMED_SUBJECTS[Math.floor(rng() * NAMED_SUBJECTS.length)]!;
}
