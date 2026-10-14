// Draws the animation styles for the next batch of crits at random, so a
// batch never falls back into the same few looks. Each slot gets a group and a
// style (thin styles likelier, from crit-dist's counts; no style twice in a
// batch); animated slots also get a reward. Build each slot in its drawn style.
// Usage: node scripts/select-animation-style.mjs [count=8]
//          [--groups animated,floor,income,button,lock,rate]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 8);
const groupsAt = args.indexOf("--groups");
const GROUPS =
  groupsAt >= 0
    ? args[groupsAt + 1].split(",")
    : ["animated", "floor", "income", "button", "lock", "rate"];

const WORLDS = ["flight", "fps", "road race", "shmup", "rail shooter"];
const STYLES = [
  "money",
  "wisp",
  "mix",
  "beam",
  "lightning",
  "explosion",
  "gunfire",
  "bounce",
  "drill",
  "spray",
  "race",
  "clutter",
  "galaxy",
  "drawing",
  "charge",
  "portal",
  "slice",
  "magnet",
  "summon",
  "snowball",
  "ripple",
];
const ANIMATED_ONLY = ["experiment", ...WORLDS];
const REWARDS = [
  "cash",
  "levels",
  "crit tiers",
  "perma tiers",
  "hires",
  "free floors",
];

execFileSync(process.execPath, [path.join(ROOT, "scripts/crit-dist.mjs"), "--json"], {
  stdio: "ignore",
});
const crits = JSON.parse(
  fs.readFileSync(path.join(ROOT, "tmp/_crit-dist.json"), "utf8"),
);
const have = (group, style) =>
  crits.filter((c) => c.group === group && c.styles[0] === style).length;

const pick = (weighted) => {
  let r = Math.random() * weighted.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, w] of weighted) if ((r -= w) <= 0) return value;
  return weighted[weighted.length - 1][0];
};

// every group once, the rest at random, shuffled
const slots = Array.from({ length: count }, (_, i) =>
  i < GROUPS.length ? GROUPS[i] : GROUPS[Math.floor(Math.random() * GROUPS.length)],
).sort(() => Math.random() - 0.5);

const used = new Set();
const batch = slots.map((group) => {
  const usable = [...STYLES, ...(group === "animated" ? ANIMATED_ONLY : [])]
    .filter((s) => !used.has(s))
    .map((s) => [s, 1 / (1 + have(group, s))]);
  const style = pick(usable);
  used.add(style);
  return {
    group,
    style,
    have: have(group, style),
    reward:
      group === "animated"
        ? REWARDS[Math.floor(Math.random() * REWARDS.length)]
        : "",
  };
});

console.log("next batch (build each slot in its style):");
batch.forEach((b, i) =>
  console.log(
    `  ${String(i + 1).padStart(2)}. ${b.group.padEnd(9)} ${b.style.padEnd(13)} ${`(${b.have} so far)`.padEnd(14)} ${b.reward}`,
  ),
);
