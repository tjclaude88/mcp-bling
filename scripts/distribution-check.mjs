// Quick distribution sanity-check.
// Rolls N identities and reports the tier breakdown vs. the spec target.
// Run with: node scripts/distribution-check.mjs [count] [seed]
import { rollIdentity, mulberry32 } from "../dist/mystery_box.js";

const count = Number(process.argv[2] ?? 1000);
const seed = Number(process.argv[3] ?? 2026);
const rng = mulberry32(seed);

// Spec target percentages (sum = 100)
const TARGET = {
  "Filing Clerk":       50,
  "Team Lead":          30,
  "Middle Manager":     14,
  "C-Suite":             5,
  "HR Warned Us About":  1,
};
const TIERS = Object.keys(TARGET);

const counts = Object.fromEntries(TIERS.map((t) => [t, 0]));
const scores = [];
let namedSubjects = 0;

for (let i = 0; i < count; i++) {
  const r = rollIdentity(rng);
  counts[r.rarity.tier] = (counts[r.rarity.tier] ?? 0) + 1;
  scores.push(r.rarity.score);
  if (r.lore !== null) namedSubjects++;
}

console.log(`# Distribution check (count=${count}, seed=${seed})\n`);
console.log("Tier               | Got     | Target  | Δ");
console.log("-------------------|---------|---------|--------");
for (const tier of TIERS) {
  const got = (counts[tier] / count) * 100;
  const target = TARGET[tier];
  const delta = got - target;
  const sign = delta >= 0 ? "+" : "";
  console.log(
    `${tier.padEnd(18)} | ${got.toFixed(1).padStart(5)}%  | ${String(target).padStart(5)}%  | ${sign}${delta.toFixed(1)}pp`
  );
}

scores.sort((a, b) => a - b);
const pct = (p) => scores[Math.floor((scores.length - 1) * p)].toFixed(1);
console.log(`\nScore quantiles: p10=${pct(0.1)}  p50=${pct(0.5)}  p80=${pct(0.8)}  p94=${pct(0.94)}  p99=${pct(0.99)}  max=${scores[scores.length - 1].toFixed(1)}`);
console.log(`Named Subjects rolled: ${namedSubjects} / ${count} (target ~0.5%)`);
