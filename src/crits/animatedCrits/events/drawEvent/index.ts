// the "Draw" event: it covers its crit, whose click freezes the screen while
// the button streams coins and bills out to draw the crit's own 5, 25 or 125
// across the screen in the crit font; the payout is multiplied by that number
// (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  CRIT_TIER_CONFIG,
  pickCritTierByOdds,
  type CritTier,
} from "../../../critTypes";
import {
  fitGlyph,
  NUMBER_HEIGHT_SHARE,
  NUMBER_SAMPLE_SIZE,
  NUMBER_WIDTH_SHARE,
  rasterizeNumber,
} from "../../../../shared/numberGlyph";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../../moneyCover";

const KEY = "draw";
// floor-local distance between the coins filling the number, widened on big
// screens so the fill never takes more than MAX_FILL_COINS
const SPOT_SPACING = 18;
const MAX_FILL_COINS = 1_600;
// smallest coin radius (floor-local) worth placing right by the outline
const MIN_COIN_SIZE = 10;
// the outline's ring of coins: their radius, and centre spacing in radii
const EDGE_COIN_SIZE = 16;
const EDGE_SPACING = 1.3;

type Spot = { x: number; y: number; maxSize: number };

// chamfer distance (in px) from each ink pixel to the nearest non-ink one
function inkDistances(ink: Uint8Array, width: number, height: number) {
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = ink[i] ? Infinity : 0;
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : dist[y * width + x];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!ink[i]) continue;
      dist[i] = Math.min(
        dist[i],
        at(x - 1, y) + 1,
        at(x, y - 1) + 1,
        at(x - 1, y - 1) + Math.SQRT2,
        at(x + 1, y - 1) + Math.SQRT2,
      );
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (!ink[i]) continue;
      dist[i] = Math.min(
        dist[i],
        at(x + 1, y) + 1,
        at(x, y + 1) + 1,
        at(x + 1, y + 1) + Math.SQRT2,
        at(x - 1, y + 1) + Math.SQRT2,
      );
    }
  return dist;
}

// jittered spots filling the number's glyphs (the crit font, no outline: in
// one colour an outline would close the digits' gaps), as big as fits the
// area; each caps its coin's radius at its distance to the edge, so no coin
// pokes out of the number
export function numberSpots(text: string, area: CoverArea): Spot[] {
  const glyph = rasterizeNumber(text, NUMBER_SAMPLE_SIZE);
  const { width, height, inkPixels } = glyph;
  const dist = inkDistances(glyph.ink, width, height);
  const { scale, originX, originY } = fitGlyph(
    glyph,
    area,
    NUMBER_WIDTH_SHARE,
    NUMBER_HEIGHT_SHARE,
  );
  const step =
    Math.max(SPOT_SPACING, Math.sqrt(inkPixels / MAX_FILL_COINS) * scale) /
    scale;
  const spots: Spot[] = [];
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step) {
      const sx = Math.min(width - 1, x + Math.random() * step);
      const sy = Math.min(height - 1, y + Math.random() * step);
      const maxSize = dist[Math.floor(sy) * width + Math.floor(sx)] * scale;
      if (maxSize >= MIN_COIN_SIZE)
        spots.push({
          x: originX + sx * scale,
          y: originY + sy * scale,
          maxSize,
        });
    }

  // a ring of small coins traced just inside the outline, overlapping so the
  // number's edge reads as one sharp line
  const edgeDist = EDGE_COIN_SIZE / scale;
  const spacing = (EDGE_COIN_SIZE * EDGE_SPACING) / scale;
  const candidates: number[] = [];
  for (let i = 0; i < dist.length; i++)
    if (Math.abs(dist[i] - edgeDist) < 0.75) candidates.push(i);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const taken = new Map<string, { x: number; y: number }[]>();
  const cellOf = (x: number, y: number) =>
    `${Math.floor(x / spacing)},${Math.floor(y / spacing)}`;
  for (const i of candidates) {
    const x = i % width;
    const y = Math.floor(i / width);
    const cx = Math.floor(x / spacing);
    const cy = Math.floor(y / spacing);
    let free = true;
    for (let dy = -1; dy <= 1 && free; dy++)
      for (let dx = -1; dx <= 1 && free; dx++)
        for (const p of taken.get(`${cx + dx},${cy + dy}`) ?? [])
          if (Math.hypot(p.x - x, p.y - y) < spacing) free = false;
    if (!free) continue;
    const key = cellOf(x, y);
    taken.set(key, [...(taken.get(key) ?? []), { x, y }]);
    spots.push({
      x: originX + x * scale,
      y: originY + y * scale,
      maxSize: dist[i] * scale,
    });
  }
  return spots;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.drawEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const tier = context.critTier ?? pickCritTierByOdds();
      const { multiplier } = CRIT_TIER_CONFIG[tier];
      const cover = startMoneyCover(KEY, floor, context, CONFIG.drawEvent, {
        layout: (area) => numberSpots(String(multiplier), area),
        tier,
        rewardMultiplier: multiplier,
        settleFaceOn: true,
      });
      if (!cover) return;
      // left to right, so the number is drawn as it's read
      const spots = [...cover.spots].sort((a, b) => a.x - b.x);
      cover.stream(spots, CONFIG.drawEvent.streamMs);
      playBoostEventStream();
    },
  },
  { label: "Draw", color: COLOR.gold },
);

// dev test hook: arms a crit on floor carrying Draw, drawing tier's number
// (by the crit odds if unset)
export function forceDrawEvent(floor: Floor, tier?: CritTier): void {
  forceTestCrit(floor, null, tier ?? pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
