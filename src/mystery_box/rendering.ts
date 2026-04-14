// src/mystery_box/rendering.ts
// Paragraph templates, slot-filling renderer, lore frame, and the
// HOMUNCULUS classified-document metadata roller.

import type { HomunculusBlock, RolledIdentity, Tier, TraitPool } from "../types.js";
import { pickWeighted, type Rng } from "./rng.js";

// ---------------------------------------------------------------------------
// HOMUNCULUS metadata generation
// ---------------------------------------------------------------------------

const COHORTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

// FLAG_POOL borrows BAND_WEIGHTS via pickWeighted — changing those
// percentages will shift the flag distribution too. Cosmetic field,
// so this coupling is intentional.
const FLAG_POOL: TraitPool = [
  { value: "normal",              band: "Common" },     // 50% weight
  { value: "flagged for review",  band: "Uncommon" },   // 25% weight
  { value: "redacted",            band: "Legendary" },  // 8% weight
  { value: "Do Not Contact",      band: "Mythic" },     // 2% weight
];

/**
 * Roll the HOMUNCULUS classified-document block that frames every rolled bot.
 *
 * subject_id:    a four-digit zero-padded number
 * cohort:        random weekday name
 * classification: passed in (the tier label)
 * ingested:      a random date in 2024–2026
 * flag:          weighted draw — most are "normal", rare ones are "redacted"
 *                or "Do Not Contact"
 */
export function rollHomunculusBlock(rng: Rng, tier: Tier): HomunculusBlock {
  const subject_id = String(Math.floor(rng() * 10000)).padStart(4, "0");
  const cohort = COHORTS[Math.floor(rng() * COHORTS.length)]!;
  const year = 2024 + Math.floor(rng() * 3);              // 2024 / 2025 / 2026
  const month = String(1 + Math.floor(rng() * 12)).padStart(2, "0");
  const day = String(1 + Math.floor(rng() * 28)).padStart(2, "0");  // cap at 28 so we never produce an invalid date (e.g. Feb 30) without month-specific logic
  const flag = pickWeighted(FLAG_POOL, rng).value;
  return {
    subject_id,
    cohort,
    classification: tier,
    ingested: `${year}-${month}-${day}`,
    flag,
  };
}

// ---------------------------------------------------------------------------
// Paragraph templates
// ---------------------------------------------------------------------------
//
// Slot syntax: {name}, {job_title}, {height}, {material}, {accessory},
// {expression}, {desk_setup}, {habit}, {coffee_ritual}, {meeting_energy},
// {passive_aggressive}.
//
// Templates are written so the slot fragments fit naturally — pool entries
// are stored as full self-contained clauses.

export const PARAGRAPH_TEMPLATES: readonly string[] = [
  "Subject: {name}. Function: {job_title}. Build: {height}. Wears {material}. Carries {accessory}. Expression: {expression}. Habit: {habit}. Drinks {coffee_ritual}. Email sign-off: \"{passive_aggressive}\".",
  "Meet {name} — your new {job_title}. {name} sits behind {desk_setup}. Most often, {name} {habit}. They drink {coffee_ritual}. In meetings they are {meeting_energy}.",
  "{name}, {job_title}. Recognise them by {accessory} and {material}. Their build is {height}; their expression, {expression}. Notable habit: {habit}.",
  "Personnel record — {name}, {job_title}. Distinguishing features: {material}; {accessory}; expression: {expression}. Notable behaviours: {habit}; {coffee_ritual}; {meeting_energy}.",
  "Day one report. {name}, your new {job_title}, has already, somehow, broken something. Their desk: {desk_setup}. Their drink: {coffee_ritual}. Sign-off of choice: \"{passive_aggressive}\".",
  "Introducing {name}, the office's {job_title}. Wears {material}. Carries {accessory}. Notable habit: {habit}. Drinks {coffee_ritual}. Catchphrase: \"{passive_aggressive}\".",
  "Subject: {name}. Title: {job_title}. Stature: {height}. Demeanour: {expression}. Notable behaviour: {habit}. In meetings: {meeting_energy}.",
  "{job_title}? That would be {name}. Sits behind {desk_setup}. Notable habit: {habit}. Avoid the phrase \"{passive_aggressive}\" in their presence.",
  "Field report — {name}, {job_title}. Outfit: {material}. Adornment: {accessory}. Build: {height}. Habit: {habit}. Drinks {coffee_ritual}.",
  "{name}, {job_title}, has joined the team. Recognise them by {accessory} and {material}. Their habit: {habit}. Sign-off: \"{passive_aggressive}\".",
];

/** Pick a template uniformly at random and fill its slots from the identity. */
export function renderParagraph(identity: RolledIdentity, rng: Rng): string {
  const template = PARAGRAPH_TEMPLATES[
    Math.floor(rng() * PARAGRAPH_TEMPLATES.length)
  ]!;
  const slots: Record<string, string> = {
    name: identity.name,
    job_title: identity.office.job_title,
    desk_setup: identity.office.desk_setup,
    habit: identity.office.habit,
    coffee_ritual: identity.office.coffee_ritual,
    meeting_energy: identity.office.meeting_energy,
    passive_aggressive: identity.office.passive_aggressive,
    height: identity.physical?.height ?? "average build",
    accessory: identity.physical?.accessory ?? "a lanyard",
    expression: identity.physical?.expression ?? "neutral",
    material: identity.physical?.material ?? "a cardigan",
  };
  return template.replace(/\{(\w+)\}/g, (_, key) => slots[key] ?? `{${key}}`);
}

// ---------------------------------------------------------------------------
// Lore frame — header + paragraph + footer
// ---------------------------------------------------------------------------

/**
 * Return the English ordinal suffix for a non-negative integer:
 * 1 -> "st", 2 -> "nd", 3 -> "rd", everything else -> "th"
 * (with the 11/12/13 teen exceptions).
 */
function ordinalSuffix(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (abs % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Wrap the rendered paragraph in the HOMUNCULUS classified-document frame.
 * This is the screenshot-ready "share card" string that clients can display
 * verbatim.
 */
export function renderFramed(
  identity: RolledIdentity,
  paragraph: string,
  score: number,
  percentile: number,
): string {
  const h = identity.homunculus;
  const suffix = ordinalSuffix(percentile);
  const header =
    `HOMUNCULUS CORPUS · Subject ${h.subject_id} · Cohort: ${h.cohort}\n` +
    `Classification: ${h.classification} · Rarity ${score.toFixed(1)} · ${percentile}${suffix} percentile`;
  const footer =
    `— RELATABILITY CORPUS v3.1 · ingested ${h.ingested} · ${h.flag}`;
  return `${header}\n\n${paragraph}\n\n${footer}`;
}
