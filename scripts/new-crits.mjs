// From a raw image to a playable featured crit. Everything in progress lives in
// the gitignored tmp/ work area; only a finished crit reaches public/ and src/.
//   1. drop raw images into the project root (or tmp/), then
//      node scripts/crit-intake.mjs
//        writes every new raw onto ONE labelled sheet, tmp/_sheets/intake.png,
//        and lists them in tmp/_intake.json: fill each "category" (an
//        existing or new camelCase one) and "name" (its fun unique label)
//      node scripts/crit-intake.mjs --move
//        moves each named raw to tmp/<category>/<kind>.<ext>
//   2. node scripts/new-crits.mjs --scan
//        adds every new raw to tmp/_new-crits.json (label from its file
//        name; entries already there keep their edits) and sheets the raws
//        on tmp/_sheets/raw.png
//   3. optionally edit tmp/_new-crits.json: pin "group", "template" (an
//        id from scripts/lib/crit-templates.mjs), "tier" (1-6), "color" (a COLOR
//        key) or "process" options (see scripts/lib/crit-cutout.mjs)
//   4. node scripts/new-crits.mjs
//        previews each crit's effect group, reward, tier and chance, and strips
//        every white background onto ONE sheet, tmp/_sheets/processed.png
//        (magenta), to review; for a poor cut run
//        node scripts/new-crits.mjs --custom <kind> [<kind> ...]
//        which scaffolds tmp/<category>/process-<kind>.mjs from the shared
//        cut-out and uses it from then on; tweak that script and re-run
//   5. node scripts/new-crits.mjs --apply
//        writes public/crits/<category>/<kind>.webp, its sticker and
//        silhouette, the featured entry and balance lines
//        (creating a new category's files), upscales icons cut smaller than
//        640x640 area with Real-ESRGAN (scripts/lib/crit-upscale.mjs), then
//        deletes the raw and its processor script from tmp/
// Pass a different spec path as the first argument to use another file.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  AUTO_GROUPS,
  CHANCE_RANGE,
  loadCatalog,
  mixOf,
  neediestTier,
  templatesIn,
  tierBand,
  tierOf,
  withGame,
} from "./lib/crit-catalog.mjs";
import { offeredTiers, templateById } from "./lib/crit-templates.mjs";
import { cutOutCritIcon } from "./lib/crit-cutout.mjs";
import { upscaleCritIcons } from "./lib/crit-upscale.mjs";
import { rebalanceCritOdds } from "./lib/crit-odds.mjs";
import { WORK, camelCase } from "./lib/crit-asset-paths.mjs";
import { writeContactSheet } from "./lib/contact-sheet.mjs";
import { addStickerBorder, writeSilhouette } from "./lib/sticker-border.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const INBOX = WORK;
const SHEETS = path.join(WORK, "_sheets");
const FEATURED = path.join(ROOT, "src/shared/critTypes/featured");
const BALANCE = path.join(ROOT, "src/critBalance");
const RAW_EXTENSIONS = [".jfif", ".jpg", ".jpeg", ".webp", ".png"];
const args = process.argv.slice(2);
const specFile = path.resolve(
  ROOT,
  (args.includes("--custom")
    ? null
    : args.find((arg) => !arg.startsWith("--"))) ?? "tmp/_new-crits.json",
);
const rel = (file) => path.relative(ROOT, file).replaceAll("\\", "/");

const rawBase = (file) => path.basename(file, path.extname(file));
const processOptions = (spec) => ({ dropWhiteHalo: true, ...spec.process });

function readSpecs() {
  return fs.existsSync(specFile)
    ? JSON.parse(fs.readFileSync(specFile, "utf8"))
    : [];
}
function writeSpecs(specs) {
  if (specs.length)
    fs.writeFileSync(specFile, `${JSON.stringify(specs, null, 2)}\n`);
  else fs.rmSync(specFile, { force: true });
}

function inboxSources() {
  if (!fs.existsSync(INBOX)) return [];
  return fs
    .readdirSync(INBOX, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .flatMap(({ name: category }) =>
      fs
        .readdirSync(path.join(INBOX, category))
        .filter((file) =>
          RAW_EXTENSIONS.includes(path.extname(file).toLowerCase()),
        )
        .map((file) => ({ category, file: path.join(INBOX, category, file) })),
    );
}

// the whole batch on one labelled image: tmp/_sheets/<prefix>.png
async function contactSheets(files, prefix, background) {
  const out = await writeContactSheet(
    files,
    path.join(SHEETS, `${prefix}.png`),
    {
      background,
    },
  );
  return out ? [rel(out)] : [];
}

// a crit's own processor script (tmp/<category>/process-<kind>.mjs, see
// --custom) replaces the shared cut-out for art it handles badly
async function cutOut(spec, destination) {
  const source = path.join(ROOT, spec.source);
  if (!spec.processor)
    return cutOutCritIcon(source, destination, processOptions(spec));
  const url = `${pathToFileURL(path.join(ROOT, spec.processor)).href}?t=${Date.now()}`;
  const { default: processIcon } = await import(url);
  return processIcon(source, destination);
}

// scaffolds a processor script from the shared cut-out and the spec's options
function scaffoldProcessor(specs, kinds) {
  for (const kind of kinds) {
    const spec = specs.find(
      (item) => (item.kind || camelCase(item.label ?? "")) === kind,
    );
    if (!spec) throw new Error(`no spec entry for "${kind}"`);
    const file = `tmp/${spec.category}/process-${kind}.mjs`;
    const target = path.join(ROOT, file);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const options = JSON.stringify(processOptions(spec), null, 2)
        .replace(/\[\s+(-?\d+),\s+(-?\d+)\s+\]/g, "[$1, $2]")
        .replaceAll("\n", "\n  ");
      fs.writeFileSync(
        target,
        [
          `// ${spec.label}: custom cut-out, tweak the options or add pixel work`,
          'import { cutOutCritIcon } from "../../scripts/lib/crit-cutout.mjs";',
          "",
          "export default function processIcon(sourcePath, destinationPath) {",
          `  return cutOutCritIcon(sourcePath, destinationPath, ${options});`,
          "}",
          "",
        ].join("\n"),
      );
    }
    spec.processor = file;
    console.log(`${kind}: ${file}`);
  }
  writeSpecs(specs);
}

function guessLabel(file) {
  const base = rawBase(file);
  const words = /[\s_-]/.test(base)
    ? base.split(/[\s_-]+/)
    : base
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        .split(" ");
  return words
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

async function scan() {
  const specs = readSpecs().filter((spec) =>
    fs.existsSync(path.join(ROOT, spec.source)),
  );
  const known = new Set(specs.map((spec) => spec.source));
  const hashes = new Map(
    specs.map((spec) => [
      createHash("sha1")
        .update(fs.readFileSync(path.join(ROOT, spec.source)))
        .digest("hex"),
      spec.source,
    ]),
  );
  const added = await withGame(({ crit }) => {
    const labels = new Set([
      ...crit.CRIT_PROC_KINDS.map((kind) =>
        crit.CRIT_PROC_INFO[kind].label.toLowerCase(),
      ),
      ...specs.map((spec) => (spec.label ?? "").toLowerCase()),
    ]);
    const entries = [];
    for (const { category, file } of inboxSources()) {
      const source = rel(file);
      if (known.has(source)) continue;
      const hash = createHash("sha1")
        .update(fs.readFileSync(file))
        .digest("hex");
      let label = guessLabel(file);
      const notes = [];
      const duplicateOf = hashes.get(hash);
      if (duplicateOf)
        notes.push(`same file as ${duplicateOf}; delete this copy`);
      else if (/\d/.test(label))
        notes.push("numbered source: needs its own name");
      else if (labels.has(label.toLowerCase()))
        notes.push("label already used: new art needs its own name");
      if (!duplicateOf) hashes.set(hash, source);
      if (notes.length) label = "";
      else labels.add(label.toLowerCase());
      entries.push({
        source,
        category,
        label,
        group: "auto",
        template: "auto",
        tier: "auto",
        color: "auto",
        process: {},
        ...(duplicateOf ? { skip: true } : {}),
        ...(notes.length ? { note: notes.join("; ") } : {}),
      });
    }
    return entries;
  });
  const all = [...specs, ...added];
  writeSpecs(all);
  const sheets = await contactSheets(
    all
      .filter((spec) => !spec.skip)
      .map((spec) => [rawBase(spec.source), path.join(ROOT, spec.source)]),
    "raw",
    "#ff00ff",
  );
  console.log(
    `${added.length} new, ${all.length} total in ${rel(specFile)}; contact sheets: ${sheets.join(", ") || "none"}`,
  );
  for (const spec of added.filter((item) => item.note))
    console.log(`  ${spec.source}: ${spec.note}`);
}

// the chance strictly between the bounds that sits in the widest gap between
// existing featured chances, so it never ties one
function pickChance(catalog, low, high) {
  const inside = catalog
    .map((entry) => entry.chance)
    .filter((chance) => chance > low && chance < high);
  const points = [low, ...inside.sort((a, b) => a - b), high];
  let best = [points[0], points[1]];
  for (let index = 2; index < points.length; index++)
    if (points[index] - points[index - 1] > best[1] - best[0])
      best = [points[index - 1], points[index]];
  const middle = (best[0] + best[1]) / 2;
  for (const digits of [4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const rounded = Number(middle.toPrecision(digits));
    if (rounded > best[0] && rounded < best[1]) return rounded;
  }
  return middle;
}

function amountCandidates(template, tier) {
  const base = template.tiers[tier];
  const key = Object.keys(template.steps).find(
    (name) => template.steps[name] > 0 && name in base,
  );
  if (!key) return [base];
  const step = template.steps[key];
  const higher = Object.keys(template.tiers)
    .map(Number)
    .filter((t) => t > tier)
    .sort((a, b) => a - b)[0];
  const limit = Math.min(
    higher ? (base[key] + template.tiers[higher][key]) / 2 : base[key] * 1.5,
    (template.max?.[key] ?? Infinity) + step / 2,
  );
  const values = [];
  for (
    let value = base[key];
    value < limit || values.length === 0;
    value += step
  )
    values.push(Number(value.toFixed(4)));
  return values.map((value) => ({ ...base, [key]: value }));
}

// amounts and chance for a new crit: bigger than every more-common crit of
// the same template and smaller than every rarer one, inside the tier's band
function placeCrit(catalog, template, tier, usedDescriptions) {
  const members = catalog.filter((entry) => entry.template === template.id);
  const uses = (params) =>
    members.filter((entry) => entry.size === template.size(params)).length;
  // no two crits may ever share an effect
  const candidates = amountCandidates(template, tier)
    .filter((params) => !usedDescriptions.has(template.description(params)))
    .sort((a, b) => uses(a) - uses(b));
  const [bandLow, bandHigh] = tierBand(tier);
  let fallback = null;
  let tie = null;
  for (const params of candidates) {
    const size = template.size(params);
    const low = Math.max(
      CHANCE_RANGE[0],
      ...members
        .filter((entry) => entry.size > size)
        .map((entry) => entry.chance),
    );
    const high = Math.min(
      CHANCE_RANGE[1] + 1e-9,
      ...members
        .filter((entry) => entry.size < size)
        .map((entry) => entry.chance),
    );
    const inBandLow = Math.max(low, bandLow);
    const inBandHigh = Math.min(high, bandHigh + 1e-9);
    if (inBandLow < inBandHigh)
      return { params, chance: pickChance(catalog, inBandLow, inBandHigh) };
    if (low < high && !fallback)
      fallback = {
        params,
        chance: pickChance(catalog, low, high),
        warning: `chance outside T${tier}'s band to keep same-template order`,
      };
    // the rebalance's rank curve flattens a group's rarest crits onto one
    // chance; a tie is fine, as the rebalance orders a template by size
    if (!tie)
      tie = {
        params,
        chance: Math.min(Math.max(low, high), CHANCE_RANGE[1]),
        warning:
          "ties a same-template crit's chance; the rebalance orders them by size",
      };
  }
  if (fallback) return fallback;
  if (tie) return tie;
  throw new Error(
    `${template.id} T${tier}: no unused amount fits between the existing same-template crits`,
  );
}

function planBatch(specs, { CONFIG, crit }) {
  const catalog = loadCatalog({ CONFIG, crit });
  const labels = new Set(
    crit.CRIT_PROC_KINDS.map((kind) =>
      crit.CRIT_PROC_INFO[kind].label.toLowerCase(),
    ),
  );
  const kinds = new Set(crit.CRIT_PROC_KINDS);
  const usedDescriptions = new Set(
    crit.CRIT_PROC_KINDS.map((kind) => crit.CRIT_PROC_INFO[kind].description),
  );
  const plans = [];
  const errors = [];
  for (const spec of specs) {
    if (spec.skip) continue;
    const label = (spec.label ?? "").trim();
    const kind = spec.kind || camelCase(label);
    const where = spec.source;
    if (!label) {
      errors.push(`${where}: needs a label`);
      continue;
    }
    if (!/^[a-z][A-Za-z]*$/.test(kind)) {
      errors.push(`${where}: kind "${kind}" must be camelCase letters only`);
      continue;
    }
    if (!/^[a-z][A-Za-z0-9]*$/.test(spec.category)) {
      errors.push(`${where}: category "${spec.category}" must be camelCase`);
      continue;
    }
    if (labels.has(label.toLowerCase())) {
      errors.push(`${where}: label "${label}" already used`);
      continue;
    }
    if (
      kinds.has(kind) ||
      `${kind}Chance` in CONFIG.crit ||
      fs.existsSync(
        path.join(ROOT, "public/crits", spec.category, `${kind}.webp`),
      )
    ) {
      errors.push(`${where}: kind "${kind}" already used`);
      continue;
    }
    if (!fs.existsSync(path.join(ROOT, spec.source))) {
      errors.push(`${where}: source not found`);
      continue;
    }

    let template =
      spec.template && spec.template !== "auto"
        ? templateById(spec.template)
        : null;
    if (spec.template && spec.template !== "auto" && !template) {
      errors.push(`${where}: unknown template "${spec.template}"`);
      continue;
    }
    const pinnedGroup =
      template?.group ??
      (spec.group && spec.group !== "auto" ? spec.group : null);
    const pinnedTier =
      spec.tier && spec.tier !== "auto" ? Number(spec.tier) : null;
    // neediest group and tier first, falling back to the next option when a
    // template has no room left between its existing same-template crits
    const groups = pinnedGroup
      ? [pinnedGroup]
      : mixOf(catalog)
          .filter((entry) => AUTO_GROUPS.includes(entry.id))
          .sort((a, b) => b.deficit - a.deficit)
          .map((entry) => entry.id);
    const uses = (t) =>
      catalog.filter((entry) => entry.template === t.id).length;
    let group;
    let tier;
    let placed;
    let lastError = `no templates for group "${groups[0]}"`;
    search: for (const candidateGroup of groups) {
      const pool = template ? [template] : templatesIn(candidateGroup);
      const offered = offeredTiers(pool);
      const neediest = neediestTier(catalog, candidateGroup, offered);
      const tiers = pinnedTier
        ? [pinnedTier]
        : [neediest, ...offered.filter((t) => t !== neediest)];
      for (const candidateTier of tiers) {
        const fitting = pool
          .filter((t) => candidateTier in t.tiers)
          .sort((a, b) => uses(a) - uses(b));
        if (fitting.length === 0)
          lastError = `no ${candidateGroup} template offers T${candidateTier}`;
        for (const candidate of fitting) {
          try {
            placed = placeCrit(
              catalog,
              candidate,
              candidateTier,
              usedDescriptions,
            );
            template = candidate;
            group = candidateGroup;
            tier = candidateTier;
            break search;
          } catch (error) {
            lastError = error.message;
          }
        }
      }
    }
    if (!placed) {
      errors.push(`${where}: ${lastError}`);
      continue;
    }
    labels.add(label.toLowerCase());
    kinds.add(kind);
    usedDescriptions.add(template.description(placed.params));
    catalog.push({
      kind,
      group,
      template: template.id,
      size: template.size(placed.params),
      chance: placed.chance,
      tier: tierOf(placed.chance),
    });
    plans.push({
      spec,
      kind,
      label,
      category: spec.category,
      group,
      template,
      tier,
      ...placed,
      description: template.description(placed.params),
    });
  }
  return { plans, errors };
}

function paletteColors() {
  const palette = fs.readFileSync(path.join(ROOT, "src/palette.ts"), "utf8");
  const used = new Set();
  for (const file of fs.readdirSync(FEATURED))
    for (const match of fs
      .readFileSync(path.join(FEATURED, file), "utf8")
      .matchAll(/COLOR\.(\w+)/g))
      used.add(match[1]);
  return [...palette.matchAll(/^\s+(\w+): "#([0-9A-Fa-f]{6})"/gm)]
    .filter(([, name]) => used.has(name))
    .map(([, name, hex]) => ({
      name,
      rgb: [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)),
    }));
}

// the crit colour already used by featured crits nearest the icon's dominant hue
async function pickColor(icon, colors) {
  const { data, info } = await sharp(icon)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = Array.from({ length: 12 }, () => ({
    weight: 0,
    rgb: [0, 0, 0],
  }));
  const all = [0, 0, 0];
  let opaque = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset + 3] < 200) continue;
    const [r, g, b] = [data[offset], data[offset + 1], data[offset + 2]];
    all[0] += r;
    all[1] += g;
    all[2] += b;
    opaque++;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if (saturation < 0.35 || max < 64) continue;
    const hue =
      max === min
        ? 0
        : max === r
          ? ((g - b) / (max - min) + 6) % 6
          : max === g
            ? (b - r) / (max - min) + 2
            : (r - g) / (max - min) + 4;
    const bin = bins[Math.floor(hue * 2) % 12];
    bin.weight += saturation;
    bin.rgb[0] += r * saturation;
    bin.rgb[1] += g * saturation;
    bin.rgb[2] += b * saturation;
  }
  const top = bins.sort((a, b) => b.weight - a.weight)[0];
  const target =
    top.weight > 0
      ? top.rgb.map((sum) => sum / top.weight)
      : all.map((sum) => sum / Math.max(1, opaque));
  const distance = (rgb) =>
    rgb.reduce((sum, value, i) => sum + (value - target[i]) ** 2, 0);
  return colors.sort((a, b) => distance(a.rgb) - distance(b.rgb))[0].name;
}

function insertBefore(file, marker, text) {
  const source = fs.readFileSync(file, "utf8");
  const at = source.lastIndexOf(marker);
  if (at === -1) throw new Error(`${rel(file)}: "${marker}" not found`);
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  fs.writeFileSync(
    file,
    source.slice(0, at) + text.replaceAll("\n", eol) + source.slice(at),
  );
}

// a new category gets its featured + balance files, spread into both registries
function ensureCategory(category) {
  const constant = category
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
  const register = (dir, name, header, closing) => {
    const target = path.join(dir, `${category}.ts`);
    if (fs.existsSync(target)) return;
    fs.writeFileSync(target, `${header}export const ${name} = {\n${closing}\n`);
    const index = path.join(dir, "index.ts");
    const source = fs.readFileSync(index, "utf8");
    const imports = [...source.matchAll(/^import .*;/gm)].at(-1);
    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    const at = imports.index + imports[0].length;
    fs.writeFileSync(
      index,
      `${source.slice(0, at)}${eol}import { ${name} } from "./${category}";${source.slice(at)}`,
    );
    insertBefore(index, "} as const;", `  ...${name},\n`);
    console.log(`created ${rel(target)}`);
  };
  register(
    FEATURED,
    `${constant}_CRITS`,
    'import { COLOR } from "../../../palette";\nimport type { FeaturedCritDefinition } from "./types";\n\n',
    "} as const satisfies Record<string, FeaturedCritDefinition>;",
  );
  register(
    BALANCE,
    `${constant}_BALANCE`,
    `// odds and reward sizes for featured/${category}.ts's crits, spread into CONFIG.crit\n`,
    "} as const;",
  );
}

async function preview(specs, plans) {
  const kindOf = new Map(plans.map((plan) => [plan.spec, plan.kind]));
  const dir = path.join(SHEETS, "cutouts");
  fs.rmSync(dir, { recursive: true, force: true });
  const cutouts = [];
  for (const spec of specs.filter((item) => !item.skip)) {
    const name = kindOf.get(spec) ?? rawBase(spec.source);
    const out = path.join(dir, `${name}.webp`);
    try {
      await cutOut(spec, out);
      cutouts.push([name, out]);
    } catch (error) {
      console.error(`x ${spec.source}: ${error.message}`);
    }
  }
  const sheets = await contactSheets(cutouts, "processed", "#ff00ff");
  if (sheets.length) console.log(`cut-outs on magenta: ${sheets.join(", ")}`);
}

async function apply(specs, plans) {
  const colors = paletteColors();
  const remaining = [...specs];
  const added = [];
  for (const plan of plans) {
    const { kind, category, spec } = plan;
    const file = `crits/${category}/${kind}.webp`;
    const icon = path.join(ROOT, "public", file);
    ensureCategory(category);
    const cut = await cutOut(spec, icon);
    const sticker = await addStickerBorder(
      cut,
      path.join(ROOT, "public/stickers", file),
    );
    await writeSilhouette(
      sticker,
      path.join(ROOT, "public/silhouettes", file.replace(/\.webp$/, ".png")),
    );

    const color =
      spec.color && spec.color !== "auto"
        ? spec.color
        : await pickColor(icon, colors);
    if (!colors.some((entry) => entry.name === color))
      console.warn(
        `${kind}: COLOR.${color} isn't used by any featured crit yet`,
      );
    insertBefore(
      path.join(FEATURED, `${category}.ts`),
      "} as const satisfies",
      [
        `  ${kind}: {`,
        `    label: ${JSON.stringify(plan.label)},`,
        `    color: COLOR.${color},`,
        `    image: "${file}",`,
        `    description: ${JSON.stringify(plan.description)},`,
        `    reward: ${plan.template.reward(kind)},`,
        "  },\n",
      ].join("\n"),
    );
    insertBefore(
      path.join(BALANCE, `${category}.ts`),
      "} as const;",
      [
        `  ${kind}Chance: ${plan.chance},`,
        ...Object.entries(plan.params).map(
          ([key, value]) => `  ${kind}${key}: ${value},`,
        ),
        "",
      ].join("\n"),
    );

    // never delete a raw: archive it (and its cut-out script) for re-cuts
    const archive = path.join(ROOT, "tmp/crits", category);
    fs.mkdirSync(archive, { recursive: true });
    const keep = (from, name) => {
      let to = path.join(archive, name);
      for (let n = 2; fs.existsSync(to); n++)
        to = path.join(archive, name.replace(/(\.[^.]+)$/, `-${n}$1`));
      fs.copyFileSync(path.join(ROOT, from), to);
      if (fs.statSync(to).size !== fs.statSync(path.join(ROOT, from)).size)
        throw new Error(`archiving ${from} failed; raw left in place`);
      fs.rmSync(path.join(ROOT, from));
      return to;
    };
    keep(spec.source, `${kind}${path.extname(spec.source)}`);
    if (spec.processor && fs.existsSync(path.join(ROOT, spec.processor))) {
      const script = keep(spec.processor, `process-${kind}.mjs`);
      fs.writeFileSync(
        script,
        fs
          .readFileSync(script, "utf8")
          .replaceAll('"../../scripts/', '"../../../scripts/'),
      );
    }
    remaining.splice(remaining.indexOf(spec), 1);
    writeSpecs(remaining);
    added.push([`${kind} (${color})`, icon]);
    console.log(`added ${kind}`);
  }
  for (const entry of fs.existsSync(INBOX) ? fs.readdirSync(INBOX) : []) {
    const dir = path.join(INBOX, entry);
    if (entry.startsWith("_")) continue;
    if (fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length === 0)
      fs.rmdirSync(dir);
  }
  await upscaleCritIcons(added.map(([, icon]) => icon));
  const sheets = await contactSheets(added, "processed", "#ff00ff");
  console.log(`added ${added.length} crit(s); ${sheets.join(", ")}`);
}

if (args.includes("--scan")) {
  await scan();
} else if (args.includes("--custom")) {
  scaffoldProcessor(
    readSpecs(),
    args
      .slice(args.indexOf("--custom") + 1)
      .filter((arg) => !arg.startsWith("--")),
  );
} else {
  if (!fs.existsSync(specFile))
    throw new Error(`${rel(specFile)} not found; run with --scan first`);
  const specs = readSpecs();
  const { plans, errors } = await withGame((game) => planBatch(specs, game));
  for (const plan of plans) {
    console.log(
      `${plan.kind.padEnd(26)} ${plan.category.padEnd(15)} ${plan.group.padEnd(9)} ${plan.template.id.padEnd(24)} T${plan.tier} ${String(plan.chance).padEnd(9)} ${plan.description}${plan.warning ? `  (!) ${plan.warning}` : ""}`,
    );
  }
  for (const error of errors) console.error(`x ${error}`);
  if (!args.includes("--apply")) {
    await preview(specs, plans);
    console.log(
      `\n${plans.length} planned${errors.length ? `, ${errors.length} to fix` : ""}. Re-run with --apply to add them.`,
    );
  } else if (errors.length) {
    process.exitCode = 1;
    console.error("fix the entries above first; nothing was written");
  } else {
    await apply(specs, plans);
    // the new crits shift their groups' odds; reset every group to its share
    await rebalanceCritOdds();
    console.log("\nnext: npm run build");
  }
}
