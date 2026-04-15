// Quick sample roller — runs N rolls and prints the framed share card for each.
// Run with: node scripts/show-rolls.mjs [count]
import { rollIdentity, mulberry32 } from "../dist/mystery_box.js";

const count = Number(process.argv[2] ?? 8);
const seed = Number(process.argv[3] ?? Date.now());
const rng = mulberry32(seed);

console.log(`# Sample rolls (count=${count}, seed=${seed})\n`);

for (let i = 0; i < count; i++) {
  const r = rollIdentity(rng);
  console.log(`--- Roll ${i + 1} ---`);
  console.log(r.framed);
  console.log();
}
