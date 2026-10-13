// How the crits are spread: every played crit (floor, income, button, lock,
// rate) and every animated crit (event) counted by style and by reward, per
// group, with each style's share of its group's odds, so the thin spots show.
// Event tags come from the comment over their CONFIG entry ("explosion,
// levels: src/...") or, failing that, their module's header ("event (style;
// reward)"); played crits' styles from scripts/lib/crit-styles.mjs.
// Usage: node scripts/crit-dist.mjs [--style <style>] [--reward <reward>]
//          [--untagged] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLAYED_STYLES } from "./lib/crit-styles.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "").toLowerCase() : null;
};

// ---------- the crits ----------

const types = read("src/crits/critTypes/index.ts");
const kindsOf = (name) => {
  const list = types.match(
    new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`),
  );
  if (!list) throw new Error(`critTypes: no ${name}`);
  return [...list[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
};
const chancesIn = (file) =>
  new Map(
    [...read(file).matchAll(/^ {2,4}(\w+): \{\s*chance: ([\d.e-]+)/gm)].map(
      (m) => [m[1], Number(m[2])],
    ),
  );

const PLAYED = [
  ["floor", "FLOOR_CRIT_KINDS", "src/crits/floorCrits/config.ts", "levels"],
  ["income", "INCOME_CRIT_KINDS", "src/crits/incomeCrits/config.ts", "cash"],
  [
    "button",
    "BUTTON_CRIT_KINDS",
    "src/crits/buttonCrits/config.ts",
    "button perks",
  ],
  ["lock", "LOCK_CRIT_KINDS", "src/crits/lockCrits/config.ts", "free floors"],
  ["rate", "RATE_CRIT_KINDS", "src/crits/rateCrits/config.ts", "bar rate"],
];
const GROUPS = ["animated", ...PLAYED.map(([group]) => group)];

const crits = [];
for (const [group, list, config, reward] of PLAYED) {
  const chances = chancesIn(config);
  for (const kind of kindsOf(list))
    crits.push({
      group,
      kind,
      styles: [PLAYED_STYLES[kind] ?? "untagged"],
      rewards: [reward],
      chance: chances.get(kind) ?? 0,
    });
}

// the styles: every base style, and the screen-game worlds only animated crits
// can use (they stop the game)
const WORLDS = ["flight", "fps", "road race", "shmup", "rail shooter"];
const BASE_STYLES = [
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
  "experiment",
  ...WORLDS,
];
// the style words events use, folded onto one name each
const STYLE_ALIASES = {
  warp: "portal",
  blade: "slice",
  "bullet hell": "gunfire",
  "bullet heaven": "gunfire",
  guns: "gunfire",
  bullets: "gunfire",
  "road racer": "road race",
  "flight stage": "flight",
  shooter: "fps",
};
const styleOf = (word) => {
  const style = word
    .trim()
    .toLowerCase()
    .replace(/^(an?|the) /, "");
  return (
    STYLE_ALIASES[style] ??
    (BASE_STYLES.includes(style)
      ? style
      : (BASE_STYLES.find((l) => style.includes(l)) ?? style))
  );
};
const REWARDS = [
  [/price|cut|cheaper/, "price cuts"],
  [/perma|worker( crit)? tier|workers?'? tier/, "perma tiers"],
  [/hire/, "hires"],
  [/unlock|free floor|floors?\b/, "free floors"],
  [/tier/, "crit tiers"],
  [/level|upgrade/, "levels"],
  [/cash|coin|money|payout/, "cash"],
  [/boost/, "boosts"],
];
const rewardsOf = (text) => {
  const found = new Set();
  for (const part of text.toLowerCase().split(/\s*\+\s*|,\s*|\s+and\s+|;\s*/)) {
    if (!part.trim()) continue;
    const hit = REWARDS.find(([pattern]) => pattern.test(part));
    found.add(hit ? hit[1] : part.trim());
  }
  return [...found];
};

// an untagged event's style and rewards, guessed from its description
const GUESS_STYLES = [
  [/\bfps\b|first.person/, "fps"],
  [/flight stage|flight-stage/, "flight"],
  [/drill/, "drill"],
  [/nozzle|\bmist\b|airbrush/, "spray"],
  [/broom|clutter/, "clutter"],
  [/lightning|\bbolts?\b|electric|tesla/, "lightning"],
  [/\bbeams?\b|laser|searchlight|scanner/, "beam"],
  [/bullet|\bguns?\b|turret|gunfire|muzzle/, "gunfire"],
  [
    /\bbombs?\b|\bmines?\b|rocket|missile|firework|\bfuses?\b|detonat/,
    "explosion",
  ],
];
// cash poured as a liquid: the money style, or mix with a wisp in it
const FLOW =
  /(rivers?|streams?|floods?|jets?|pours?|gush|torrent|fountain|heaps?|pools?|ropes?|rain) of (cash|coins)|streams coins|cash ?flow|moneycover's flow|flowing.cash/;
const GUESS_LATE = [
  [/bounc/, "bounce"],
  [/\brac(e|er|ers|ing)\b|\blaps?\b/, "race"],
  [/galaxy|\borbits?\b/, "galaxy"],
  [/\bwisps?\b/, "wisp"],
  [/screen copy|copyscreen/, "experiment"],
  [/\bcash\b|\bcoins\b/, "money"],
];
const GUESS_REWARDS = [
  [/perma|workers?'? (perma )?tier/, "perma tiers"],
  [/\bhires?\b|hired/, "hires"],
  [/unlock|locked floor|free floor/, "free floors"],
  [/crit tier|tier up|climbs? a (crit )?tier/, "crit tiers"],
  [/levels/, "levels"],
  [/pays? floor income|into the total|cash|coins/, "cash"],
];
const guessStyles = (text) => {
  const specific = GUESS_STYLES.find(([pattern]) => pattern.test(text));
  if (specific) return [specific[1]];
  if (FLOW.test(text)) return [/\bwisps?\b/.test(text) ? "mix" : "money"];
  const late = GUESS_LATE.find(([pattern]) => pattern.test(text));
  return [late ? late[1] : "untagged"];
};
const guessRewards = (text) => {
  const plain = text.replace(/the crit's tier pays out/g, "");
  const found = GUESS_REWARDS.filter(([pattern]) => pattern.test(plain)).map(
    ([, reward]) => reward,
  );
  return found.length ? [...new Set(found)] : ["untagged"];
};

// the events every loader part imports: the ones that can play
const loaded = new Set();
for (const file of fs.readdirSync(
  path.join(ROOT, "src/crits/animatedCrits/eventLoader"),
))
  for (const m of read(`src/crits/animatedCrits/eventLoader/${file}`).matchAll(
    /import "\.\.\/events\/(\w+)";/g,
  ))
    loaded.add(m[1]);

const eventConfig = read("src/crits/animatedCrits/config.ts").split(/\r?\n/);
const eventChances = chancesIn("src/crits/animatedCrits/config.ts");
for (let i = 0; i < eventConfig.length; i++) {
  const key = eventConfig[i].match(/^ {2}(\w+Event): \{/)?.[1];
  if (!key || !loaded.has(key)) continue;
  const comment = [];
  for (let j = i - 1; j >= 0 && /^\s*\/\//.test(eventConfig[j]); j--)
    comment.unshift(eventConfig[j].replace(/^\s*\/\/\s?/, ""));
  const text = comment
    .join(" ")
    .replace(/^.*?(?=[a-z][\w +-]*,[^:]*: src\/|[a-z][\w +-]*: src\/)/i, "")
    .replace(/^batch \d+\s*/i, "");
  const file = `src/crits/animatedCrits/events/${key}/index.ts`;
  const header = fs.existsSync(path.join(ROOT, file))
    ? (read(file).match(/^(\/\/.*\r?\n)+/)?.[0] ?? "").replace(
        /\s*\r?\n\/\/\s*|^\/\/\s*/g,
        " ",
      )
    : "";
  let tag = text.match(/^([^:]+?):\s*src\//)?.[1];
  if (!tag) {
    const m = header.match(/event \(([^;)]+);\s*([^)]+)\)/);
    if (m) tag = `${m[1]}, ${m[2]}`;
  }
  const comma = tag ? tag.indexOf(",") : -1;
  const styleText = tag ? (comma >= 0 ? tag.slice(0, comma) : tag) : "";
  const rewardText = tag && comma >= 0 ? tag.slice(comma + 1) : "";
  let styles = styleText
    ? styleText
        .split(/\s*\+\s*|\s+and\s+|\//)
        .map(styleOf)
        .filter(Boolean)
    : [];
  // a reward where the style should be ("levels: src/...")
  if (styles.length && REWARDS.some(([pattern]) => pattern.test(styles[0])))
    styles = [];
  let rewards = rewardText ? rewardsOf(rewardText) : [];
  const description = `${comment.join(" ")} ${header}`.toLowerCase();
  const guessed = !styles.length || !rewards.length;
  if (!styles.length) styles = guessStyles(description);
  if (!rewards.length) rewards = guessRewards(description);
  crits.push({
    group: "animated",
    kind: key,
    styles,
    rewards,
    chance: eventChances.get(key) ?? 0,
    guessed,
  });
}

// ---------- the report ----------

const style = option("--style");
const reward = option("--reward");
if (args.includes("--json")) {
  const out = path.join(ROOT, "tmp/_crit-dist.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(crits, null, 2));
  console.log(`wrote ${path.relative(ROOT, out)} (${crits.length} crits)`);
}
if (style || reward || args.includes("--guessed")) {
  const picked = crits.filter((c) =>
    style
      ? c.styles.includes(style)
      : reward
        ? c.rewards.includes(reward)
        : c.guessed,
  );
  for (const group of GROUPS) {
    const kinds = picked.filter((c) => c.group === group);
    if (!kinds.length) continue;
    console.log(`\n${group} (${kinds.length})`);
    for (const c of kinds)
      console.log(
        `  ${c.kind.padEnd(28)} ${c.styles.join(" + ").padEnd(22)} ${c.rewards.join(", ")}${c.guessed ? "  (guessed)" : ""}`,
      );
  }
  process.exit(0);
}

const NONE = "-";

const pad = (text, width) => String(text).padStart(width);
const byGroup = Object.fromEntries(
  GROUPS.map((g) => [g, crits.filter((c) => c.group === g)]),
);
const totalChance = Object.fromEntries(
  GROUPS.map((g) => [g, byGroup[g].reduce((sum, c) => sum + c.chance, 0)]),
);

// one row per value of `field` (each crit counted once, by its first style,
// or once per reward it gives), a column per group and each group's odds share
function table(title, field, first) {
  const values = new Map();
  for (const c of crits)
    for (const v of first ? c[field].slice(0, 1) : c[field]) {
      let row = values.get(v);
      if (!row) values.set(v, (row = { counts: {}, odds: {} }));
      row.counts[c.group] = (row.counts[c.group] ?? 0) + 1;
      row.odds[c.group] = (row.odds[c.group] ?? 0) + c.chance;
    }
  const rows = [...values].sort(
    ([, a], [, b]) =>
      Object.values(b.counts).reduce((x, y) => x + y, 0) -
      Object.values(a.counts).reduce((x, y) => x + y, 0),
  );
  const width = Math.max(14, ...rows.map(([v]) => v.length + 2));
  console.log(`\n${title}`);
  console.log(
    "".padEnd(width) +
      GROUPS.map((g) => pad(g, 9)).join("") +
      pad("total", 8) +
      "   share of odds: " +
      GROUPS.map((g) => pad(g.slice(0, 5), 6)).join(""),
  );
  for (const [v, row] of rows) {
    const total = GROUPS.reduce((sum, g) => sum + (row.counts[g] ?? 0), 0);
    console.log(
      v.padEnd(width) +
        GROUPS.map((g) => pad(row.counts[g] ?? NONE, 9)).join("") +
        pad(total, 8) +
        "                  " +
        GROUPS.map((g) =>
          pad(
            row.odds[g]
              ? `${Math.round((100 * row.odds[g]) / totalChance[g])}%`
              : NONE,
            6,
          ),
        ).join(""),
    );
  }
}

console.log(`crit distribution: ${crits.length} crits that can play`);
console.log("  " + GROUPS.map((g) => `${g} ${byGroup[g].length}`).join(", "));
const guessed = crits.filter((c) => c.guessed).length;
const untagged = crits.filter(
  (c) => c.styles.includes("untagged") || c.rewards.includes("untagged"),
).length;
if (guessed)
  console.log(
    `  ${guessed} events have no style/reward tag: guessed from their description, ${untagged} still untagged (--guessed lists them)`,
  );
table("by style (each crit counted once, by its first style)", "styles", true);
table("by reward (a crit giving several counts under each)", "rewards", false);

// the animated crits' style x reward grid: where there are few or none
const anim = byGroup.animated;
const styles = [...new Set(anim.map((c) => c.styles[0]))].sort(
  (a, b) =>
    anim.filter((c) => c.styles[0] === b).length -
    anim.filter((c) => c.styles[0] === a).length,
);
const rewards = [...new Set(anim.flatMap((c) => c.rewards))].sort(
  (a, b) =>
    anim.filter((c) => c.rewards.includes(b)).length -
    anim.filter((c) => c.rewards.includes(a)).length,
);
const width = Math.max(14, ...styles.map((l) => l.length + 2));
console.log("\nanimated crits: style x reward");
console.log(
  "".padEnd(width) + rewards.map((r) => pad(r.slice(0, 11), 12)).join(""),
);
for (const l of styles)
  console.log(
    l.padEnd(width) +
      rewards
        .map((r) => {
          const n = anim.filter(
            (c) => c.styles[0] === l && c.rewards.includes(r),
          ).length;
          return pad(n || NONE, 12);
        })
        .join(""),
  );

// the thin spots: every base style a group can use (the screen-game worlds
// only for animated crits), fewest first
console.log("\nthinnest styles per group (fewest first)");
for (const group of GROUPS) {
  const usable = BASE_STYLES.filter(
    (l) => group === "animated" || !WORLDS.includes(l),
  );
  const counts = usable
    .map((l) => [l, byGroup[group].filter((c) => c.styles[0] === l).length])
    .sort((a, b) => a[1] - b[1]);
  const missing = counts.filter(([, n]) => n === 0).map(([l]) => l);
  const thin = counts.filter(([, n]) => n > 0).slice(0, 6);
  console.log(
    `  ${group.padEnd(9)} thin: ${thin.map(([l, n]) => `${l} ${n}`).join(", ")}` +
      (missing.length ? `\n  ${"".padEnd(9)} none: ${missing.join(", ")}` : ""),
  );
}
