// Flags shipped crit icons with pixel residue around the art: faint leftover
// pixels (a ghost of the raw's outline or backdrop, a haze, dark dirt)
// lying well clear of the solid art. Light residue counts wherever it lies;
// dark residue when it's cut off from the art or isn't explained by a drop
// shadow (the art's silhouette shifted and blurred). Prints the
// worst first and puts them on one sheet with the residue painted green, to
// re-cut or fix.
//   node scripts/crit-residue.mjs                  every category
//   node scripts/crit-residue.mjs steampunk feet   just these categories
//   node scripts/crit-residue.mjs --min=1200       flag threshold (light px)
//   node scripts/crit-residue.mjs --dark=100       flag threshold (dark px)
//   node scripts/crit-residue.mjs --specks=500     also flag this many px of
//                                                  tiny stray blobs (often
//                                                  deliberate sparkles)
//   node scripts/crit-residue.mjs --all            list every icon's score
//   node scripts/crit-residue.mjs --fix=windUp,magmaMuse
//       clears those icons' residue (not light specks), originals backed up
//       to tmp/_residue-backup/; then rebuild their stickers with
//       node scripts/add-sticker-borders.mjs windUp magmaMuse
//   node scripts/crit-residue.mjs --crisp=nightKicker
//       harder clean for residue --fix misses: tightens a blurred dark
//       fringe round the outline, clears every non-solid pixel more than
//       2px from the solid art (soft glows go too), small dark bits and
//       translucent ghost lines detached from it; backed up the same way
// Writes tmp/_sheets/residue.png and tmp/_residue.json
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ROOT, WORK } from "./lib/crit-asset-paths.mjs";
import { writeContactSheet } from "./lib/contact-sheet.mjs";

const CRITS = path.join(ROOT, "public/crits");
const OUT = path.join(WORK, "_residue");
const BACKUP = path.join(WORK, "_residue-backup");
// solid art, and the faintest alpha that still counts as residue
const SOLID = 200;
const FAINT = 12;
// px from solid art past which faint pixels are residue, not anti-aliasing
const CLEAR = 4;
// darker faint pixels joined to the art may be a deliberate drop shadow: the
// art's silhouette shifted up to SHIFT px and blurred up to WRAP px
const SHADOW_LUMA = 40;
const SHIFT = 24;
const WRAP = 9;
// a solid blob this small, away from the art, is a speck
const SPECK = 24;
// --crisp drops dark detached pieces smaller than this, and detached pieces
// this translucent on average
const BIT = 500;
const GHOST = 170;
const SHEET_MAX = 48;

const args = process.argv.slice(2);
const option = (name, fallback) =>
  Number(
    args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback,
  );
const min = option("min", 1200);
const darkMin = option("dark", 100);
const speckMin = option("specks", Infinity);
const listAll = args.includes("--all");
const fixing = new Set(
  args
    .find((a) => a.startsWith("--fix="))
    ?.split("=")[1]
    .split(",") ?? [],
);
const crisping = new Set(
  args
    .find((a) => a.startsWith("--crisp="))
    ?.split("=")[1]
    .split(",") ?? [],
);
for (const kind of crisping) fixing.add(kind);
const wanted = args.filter((a) => !a.startsWith("--"));

// faint pixels clear of the solid art, and pixels of tiny detached blobs
function findResidue(data, w, h) {
  const n = w * h;
  const alpha = (i) => data[i * 4 + 3];
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  // floods 8-connected from what's queued into pixels pass(j) allows
  const flood = (mark, pass) => {
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (pass(i, j)) {
            mark(i, j);
            queue[tail++] = j;
          }
        }
    }
  };
  // chebyshev distance to the nearest solid pixel, capped past WRAP
  const dist = new Uint8Array(n).fill(255);
  for (let i = 0; i < n; i++)
    if (alpha(i) >= SOLID) {
      dist[i] = 0;
      queue[tail++] = i;
    }
  flood(
    (i, j) => (dist[j] = dist[i] + 1),
    (i, j) => dist[i] < WRAP && dist[j] > dist[i] + 1,
  );
  // every visible pixel joined to the solid art
  const attached = new Uint8Array(n);
  head = 0;
  tail = 0;
  for (let i = 0; i < n; i++)
    if (alpha(i) >= SOLID) {
      attached[i] = 1;
      queue[tail++] = i;
    }
  flood(
    (_, j) => (attached[j] = 1),
    (_, j) => !attached[j] && alpha(j) >= FAINT,
  );
  const residue = new Uint8Array(n);
  let faint = 0;
  let dark = 0;
  const haze = [];
  for (let i = 0; i < n; i++) {
    if (alpha(i) < FAINT || dist[i] <= CLEAR) continue;
    const luma =
      data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11;
    if (luma >= SHADOW_LUMA) faint++;
    else if (!attached[i]) dark++;
    else {
      haze.push(i);
      continue;
    }
    residue[i] = 1;
  }
  // dark haze joined to the art: a drop shadow is the art's silhouette
  // shifted and blurred, so find the shift that explains most of it; haze
  // it doesn't explain is residue
  if (haze.length) {
    const sample = haze.filter(
      (_, k) => k % Math.ceil(haze.length / 2000) === 0,
    );
    const shadowed = (i, dx, dy) => {
      const x = (i % w) - dx;
      const y = Math.floor(i / w) - dy;
      return x >= 0 && y >= 0 && x < w && y < h && dist[y * w + x] <= WRAP;
    };
    let best = [0, 0];
    let bestCount = -1;
    for (let dy = -SHIFT; dy <= SHIFT; dy += 2)
      for (let dx = -SHIFT; dx <= SHIFT; dx += 2) {
        let count = 0;
        for (const i of sample) if (shadowed(i, dx, dy)) count++;
        if (count > bestCount) {
          bestCount = count;
          best = [dx, dy];
        }
      }
    for (const i of haze)
      if (!shadowed(i, best[0], best[1])) {
        residue[i] = 1;
        dark++;
      }
  }
  // tiny solid blobs: dark ones are bits of stray outline (residue), light
  // ones often deliberate sparkles
  const seen = new Uint8Array(n);
  let specks = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i] || alpha(i) < SOLID) continue;
    head = 0;
    tail = 0;
    queue[tail++] = i;
    seen[i] = 1;
    flood(
      (_, j) => (seen[j] = 1),
      (_, j) => !seen[j] && alpha(j) >= SOLID,
    );
    if (tail >= SPECK) continue;
    let luma = 0;
    for (let t = 0; t < tail; t++) {
      const k = queue[t] * 4;
      luma += data[k] * 0.3 + data[k + 1] * 0.59 + data[k + 2] * 0.11;
    }
    if (luma / tail < SHADOW_LUMA) dark += tail;
    else specks += tail;
    const mark = luma / tail < SHADOW_LUMA ? 1 : 2;
    for (let t = 0; t < tail; t++) residue[queue[t]] = mark;
  }
  return { faint, dark, specks, residue };
}

const luma = (data, i) =>
  data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11;

// tightens a blurred dark fringe round the outline to a crisp edge, clears
// non-solid pixels more than 2px from the solid art, and drops small dark
// bits detached from it
function crisp(data, w, h) {
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    if (a === 0 || a >= 250 || luma(data, i) > 70) continue;
    data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round((a - 110) * 2.2)));
  }
  const near = new Uint8Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < SOLID) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) near[ny * w + nx] = 1;
        }
    }
  for (let i = 0; i < n; i++) if (!near[i]) data[i * 4 + 3] = 0;
  // visible pieces: all but the biggest that are small and dark go
  const label = new Int32Array(n).fill(-1);
  const pieces = [];
  for (let s = 0; s < n; s++) {
    if (label[s] >= 0 || data[s * 4 + 3] < FAINT) continue;
    const members = [s];
    label[s] = pieces.length;
    for (let k = 0; k < members.length; k++) {
      const i = members[k];
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (label[j] < 0 && data[j * 4 + 3] >= FAINT) {
            label[j] = pieces.length;
            members.push(j);
          }
        }
    }
    pieces.push(members);
  }
  pieces.sort((a, b) => b.length - a.length);
  for (const piece of pieces.slice(1)) {
    const shade =
      piece.reduce((sum, i) => sum + luma(data, i), 0) / piece.length;
    const opacity =
      piece.reduce((sum, i) => sum + data[i * 4 + 3], 0) / piece.length;
    const edge = piece.some((i) => {
      const x = i % w;
      const y = (i - x) / w;
      return x === 0 || y === 0 || x === w - 1 || y === h - 1;
    });
    // translucent ghosts of the raw's lines, small dark dirt, or scraps of
    // the raw's frame edge
    if (opacity < GHOST || (piece.length < BIT && (shade < 70 || edge)))
      for (const i of piece) data[i * 4 + 3] = 0;
  }
}

// the icon on magenta with its residue painted green
async function highlight(data, w, h, residue, out) {
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3] / 255;
    if (residue[i]) {
      rgb.set([0, 255, 0], i * 3);
      continue;
    }
    rgb[i * 3] = data[i * 4] * a + 255 * (1 - a);
    rgb[i * 3 + 1] = data[i * 4 + 1] * a;
    rgb[i * 3 + 2] = data[i * 4 + 2] * a + 255 * (1 - a);
  }
  await sharp(rgb, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toFile(out);
}

const categories = fs
  .readdirSync(CRITS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((c) => wanted.length === 0 || wanted.includes(c));
const unknown = wanted.filter((c) => !categories.includes(c));
if (unknown.length)
  throw new Error(`unknown categories: ${unknown.join(", ")}`);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const results = [];
for (const category of categories)
  for (const file of fs.readdirSync(path.join(CRITS, category))) {
    if (!file.endsWith(".webp")) continue;
    const full = path.join(CRITS, category, file);
    const { data, info } = await sharp(fs.readFileSync(full))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { faint, dark, specks, residue } = findResidue(
      data,
      info.width,
      info.height,
    );
    const kind = path.basename(file, ".webp");
    if (fixing.has(kind)) {
      fixing.delete(kind);
      const backup = path.join(BACKUP, category, file);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (!fs.existsSync(backup)) fs.copyFileSync(full, backup);
      for (let i = 0; i < residue.length; i++)
        if (residue[i] === 1) data[i * 4 + 3] = 0;
      if (crisping.has(kind)) crisp(data, info.width, info.height);
      const fixed = await sharp(data, { raw: info })
        .webp({ quality: 85, alphaQuality: 90, effort: 6 })
        .toBuffer();
      fs.writeFileSync(full, fixed);
      console.log(`fixed ${category}/${kind} (cleared ${faint + dark} px)`);
      continue;
    }
    const score = faint + dark;
    const entry = { kind, category, score, faint, dark, specks };
    results.push(entry);
    if (faint >= min || dark >= darkMin || specks >= speckMin) {
      entry.flagged = true;
      entry.sheet = path.join(OUT, `${kind}.png`);
      await highlight(data, info.width, info.height, residue, entry.sheet);
    }
  }

results.sort((a, b) => b.score + b.specks - (a.score + a.specks));
if (fixing.size) console.log(`not found: ${[...fixing].join(", ")}`);
const flagged = results.filter((r) => r.flagged);
for (const r of listAll ? results : flagged)
  console.log(
    `${String(r.score).padStart(6)}  ${r.category}/${r.kind}  (light ${r.faint}, dark ${r.dark}${r.specks ? `, specks ${r.specks}` : ""})`,
  );
console.log(
  `${flagged.length} of ${results.length} icons flagged (light residue >= ${min} px or dark >= ${darkMin} px)`,
);
fs.writeFileSync(
  path.join(WORK, "_residue.json"),
  JSON.stringify(
    flagged.map(({ sheet, flagged, ...r }) => r),
    null,
    2,
  ),
);
const sheet = path.join(WORK, "_sheets", "residue.png");
await writeContactSheet(
  flagged.slice(0, SHEET_MAX).map((r) => [`${r.kind} ${r.score}`, r.sheet]),
  sheet,
  { background: "#ff00ff", tileWidth: 260 },
);
if (flagged.length)
  console.log(
    `sheet: ${path.relative(ROOT, sheet).replaceAll("\\", "/")}${flagged.length > SHEET_MAX ? ` (worst ${SHEET_MAX})` : ""}`,
  );
