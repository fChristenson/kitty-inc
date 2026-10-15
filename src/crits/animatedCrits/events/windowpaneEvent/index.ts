// the "Windowpane" event (ripple; crit tiers): it covers its crit, whose click
// freezes the screen into a pane of glass that drops of light splat onto over
// the bars in view, each a flash, a crown of specks and a ring spreading out
// over the glass, a drizzle quickening to a downpour. The heavy ones warp the
// frozen frame under their ring and flip their bar a crit tier up. A huge
// drop swells and trembles over the clicked floor, light streaming into it,
// the rain stops, then it smacks the pane in the biggest flash, a bang and
// the hardest shake, its giant ring warping the whole screen and flashing
// every bar it crosses, the clicked one tiered up three times. Built on
// moneyCover directly, since only it takes a frameRipple
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
  type MoneyCover,
} from "../../moneyCover";
import {
  drawRewardBars,
  findRewardBars,
  giveBarTier,
  type RewardBar,
} from "../../eventRewards";
import { drawDrop, rainTimes } from "../../../../shared/animationStyles/ripple";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawExplosion, drawWhiteBurst } from "../../../../shared/eventFx";
import {
  playBarExplosion,
  playExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { triggerEventEndSlam } from "../../../../shared/eventEndSlam";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import type { FrameRipple } from "../../../../shared/screenFreeze";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import type { Point } from "../../../../shared/wisp";
import { setIncomePanelsHidden } from "../../../../floors/incomePanel";
import { FLOOR_H } from "../../../../floors/constants";

const KEY = "windowpane";
const MAX_BARS = 8;
const TAU = Math.PI * 2;
// a drop slides FALL px down the glass onto its spot, DROP px, growing with
// the downpour; a heavy (tier) drop HEAVY_DROP px
const FALL = 150;
const DROP: [number, number] = [26, 40];
const HEAVY_DROP = 56;
// its splat: a white flash, a crown of specks flung out all round, and two
// rings spreading over the glass (light only; a heavy drop's also warps)
const FLASH: [number, number] = [0.14, 0.26];
const HEAVY_FLASH = 0.6;
const FLASH_MS = 240;
const SPLAT_DIRS = 16;
const SPLAT_N = 8;
const HEAVY_SPLAT_N = 14;
const SPLAT: [number, number] = [12, 18];
const HEAVY_SPLAT = 26;
const SPLAT_REACH = 3.2;
const SPLAT_MS = 260;
const RING: [number, number] = [55, 105];
const RING_W: [number, number] = [8, 12];
const RING_MS = 380;
const HEAVY_RING = 190;
const HEAVY_RING_W = 18;
const HEAVY_RING_MS = 420;
const INNER = 0.62;
const DROP_SHAKE: [number, number] = [0.08, 0.35];
const HEAVY_SHAKE = 0.8;
const DRUM_EVERY = 4;
const DRUM_RATE: [number, number] = [0.7, 1.25];
// a heavy drop's crest refracting the frame: out to WARP_R px over WARP_MS
// (only the latest one warps: the frame ripples round one center)
const WARP_MS = 340;
const WARP_R = 200;
const WARP_AMP = 12;
const WARP_REACH = 42;
const WARP_WAVE = 42;
// the huge drop swells GATHER_MS before the rain stops, up to BIG_DROP px,
// trembling TREMBLE px, STREAM specks pulled in from STREAM_R px round it
const GATHER_MS = 300;
const BIG_DROP = 130;
const TREMBLE = 10;
const STREAM = 14;
const STREAM_R = 300;
const STREAM_TRIP_MS = 260;
const SPECK = 18;
// its giant ring: a crest and a trailing one warping the whole screen, out
// past the farthest corner, drawn as light RING_W px thick
const GIANT_OVER = 80;
const GIANT_EASE = 1.6;
const GIANT_AMP = 30;
const GIANT_REACH = 110;
const GIANT_WAVE = 80;
const GIANT_TRAIL = 0.68;
const TRAIL_AMP = 0.55;
const GIANT_RING_W = 40;
const BLAST_MS = 800;
const BLAST_SCALE = 2.8;
const SPARK_REACH = 440;
const SPARK_SIZE = 24;
const BLAST_SHAKE = 2.9;
const CLICKED_FLASH = 0.9;
const CLICKED_SHAKE = 1.3;
// a bar the giant ring crosses flashes
const CROSS_FLASH = 0.5;
const CROSS_MS = 300;

// SPLAT_DIRS directions round a splat
const SPLAT_COS = new Float32Array(SPLAT_DIRS);
const SPLAT_SIN = new Float32Array(SPLAT_DIRS);
for (let i = 0; i < SPLAT_DIRS; i++) {
  SPLAT_COS[i] = Math.cos((i / SPLAT_DIRS) * TAU);
  SPLAT_SIN[i] = Math.sin((i / SPLAT_DIRS) * TAU);
}

function arm(floor: Floor, context: EventProcContext, area: CoverArea): void {
  const {
    firstMs,
    drops: count,
    gapsMs,
    fallMs,
    heavySpan,
    hushMs,
    ringMs,
    clickedTiers,
    clickedGapMs,
    holdMs,
    mergeMs,
  } = meta.values;
  const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
  if (bars.length === 0) return;
  // the clicked floor's bar, or the one nearest it when it has none
  let clicked: RewardBar = bars[0];
  for (const bar of bars) {
    if (bar.floor === floor) {
      clicked = bar;
      break;
    }
    if (
      Math.abs(bar.center.y - FLOOR_H / 2) <
      Math.abs(clicked.center.y - FLOOR_H / 2)
    )
      clicked = bar;
  }
  const impact = clicked.center;
  const seed = Math.floor(Math.random() * 997);
  // the other bars, shuffled, each getting one heavy drop spread over the rain
  const others = bars.filter((bar) => bar !== clicked);
  others.sort(
    (a, b) => hash01(bars.indexOf(a), seed) - hash01(bars.indexOf(b), seed),
  );

  const times = rainTimes(count, firstMs, gapsMs);
  const dropX = new Float32Array(count);
  const dropY = new Float32Array(count);
  const dropAt = new Float32Array(count);
  const dropK = new Float32Array(count);
  const dropSpin = new Uint8Array(count);
  const dropBar = new Int8Array(count).fill(-1);
  const heavyDrop = new Int16Array(others.length);
  for (let h = 0; h < others.length; h++) {
    const f =
      heavySpan[0] +
      ((heavySpan[1] - heavySpan[0]) * (h + 0.5)) / others.length;
    const i = Math.round(f * (count - 1));
    heavyDrop[h] = i;
    dropBar[i] = bars.indexOf(others[h]);
  }
  for (let i = 0; i < count; i++) {
    const heavy = dropBar[i] >= 0;
    const bar = heavy
      ? bars[dropBar[i]]
      : bars[Math.floor(hash01(i + seed, 9121) * bars.length) % bars.length];
    const spread = heavy ? 0.4 : 0.9;
    dropX[i] =
      bar.center.x + bar.box.width * spread * (hash01(i + seed, 9122) - 0.5);
    dropY[i] =
      bar.center.y + bar.box.height * 1.4 * (hash01(i + seed, 9123) - 0.5);
    dropAt[i] = times[i];
    dropK[i] = i / Math.max(1, count - 1);
    dropSpin[i] = Math.floor(hash01(i + seed, 9124) * SPLAT_DIRS);
  }
  const lastDrop = times[count - 1];
  const rainEnd = lastDrop + Math.max(HEAVY_RING_MS, FLASH_MS, SPLAT_MS);
  const gatherAt = lastDrop - GATHER_MS;
  const bigAt = lastDrop + hushMs;
  // the giant ring: out past the farthest corner, reaching a bar d px away
  // when its radius does
  const giantR =
    Math.max(
      Math.hypot(area.left - impact.x, area.top - impact.y),
      Math.hypot(area.right - impact.x, area.top - impact.y),
      Math.hypot(area.left - impact.x, area.bottom - impact.y),
      Math.hypot(area.right - impact.x, area.bottom - impact.y),
    ) + GIANT_OVER;
  const giantAt = (u: number) => giantR * (1 - (1 - u) ** GIANT_EASE);
  const crossAt = new Float32Array(bars.length);
  for (let b = 0; b < bars.length; b++) {
    const d = Math.hypot(
      bars[b].center.x - impact.x,
      bars[b].center.y - impact.y,
    );
    crossAt[b] =
      bigAt + ringMs * (1 - (1 - Math.min(1, d / giantR)) ** (1 / GIANT_EASE));
  }
  const tierTimes = new Float32Array(clickedTiers);
  for (let k = 0; k < clickedTiers; k++)
    tierTimes[k] = bigAt + k * clickedGapMs;
  const endMs = Math.max(bigAt + ringMs, tierTimes[clickedTiers - 1]);
  const drawEnd = bigAt + Math.max(ringMs, BLAST_MS, CROSS_MS + ringMs);

  let cover: MoneyCover | null = null;
  const startedAt = performance.now();
  const spot: Point = { x: 0, y: 0 };
  const order = Array.from({ length: count }, (_, i) => i);
  const raining = createBeats(
    order,
    (i) => dropAt[i],
    (i) => {
      if (!cover!.isLive()) return;
      const k = dropK[i];
      if (dropBar[i] >= 0) {
        spot.x = dropX[i];
        spot.y = dropY[i] - FALL;
        giveBarTier(bars[dropBar[i]], spot);
        playExplosion();
        shakeScreen(HEAVY_SHAKE);
        return;
      }
      playBloop();
      if (i % DRUM_EVERY === DRUM_EVERY - 1)
        playBarExplosion(lerp(DRUM_RATE, k));
      shakeScreen(lerp(DROP_SHAKE, k));
    },
  );
  const landing = createBeats(
    Array.from(tierTimes),
    (ms) => ms,
    (_, k) => {
      if (!cover!.isLive()) return;
      giveBarTier(clicked);
      if (k === 0) {
        triggerEventEndSlam(clicked.floor, "bar");
        playSlamExplosion();
        shakeScreen(BLAST_SHAKE);
        return;
      }
      playExplosion();
      shakeScreen(CLICKED_SHAKE);
    },
  );

  // the frame's ripple, reused every frame: one crest (a heavy drop's) or
  // two (the giant's) round one center
  const crestBand: [number, number] = [0, 0];
  const trailBand: [number, number] = [0, 0];
  const oneBand: [number, number][] = [crestBand];
  const twoBands: [number, number][] = [crestBand, trailBand];
  let crestR = 0;
  let crestAmp = 0;
  let trailR = 0;
  let trailAmp = 0;
  let reach = 1;
  let wave = 1;
  const crest = (x: number, amp: number) =>
    Math.abs(x) >= reach
      ? 0
      : amp * Math.sin((x / wave) * TAU) * Math.exp(-((x / (reach / 2)) ** 2));
  const warp: FrameRipple = {
    center: { x: 0, y: 0 },
    bands: oneBand,
    offset: (r) =>
      crest(r - crestR, crestAmp) +
      (trailAmp > 0 ? crest(r - trailR, trailAmp) : 0),
  };
  const setBand = (band: [number, number], r: number) => {
    band[0] = Math.max(0, r - reach);
    band[1] = r + reach;
  };

  // ms into the event (floor-local): the light on the glass
  const drawPane = (ctx: CanvasRenderingContext2D, ms: number, now: number) => {
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    const since = ms - bigAt;
    // the drops' rings spreading over the glass
    if (ms < rainEnd)
      for (let i = 0; i < count; i++) {
        const heavy = dropBar[i] >= 0;
        const life = heavy ? HEAVY_RING_MS : RING_MS;
        const age = ms - dropAt[i];
        if (age < 0 || age >= life) continue;
        const u = age / life;
        const r =
          (heavy ? HEAVY_RING : lerp(RING, dropK[i])) * (1 - (1 - u) ** 2);
        const w = (heavy ? HEAVY_RING_W : lerp(RING_W, dropK[i])) * (1 - u);
        ctx.globalAlpha = alpha * (1 - u);
        ctx.beginPath();
        ctx.arc(dropX[i], dropY[i], r, 0, TAU);
        ctx.moveTo(dropX[i] + r * INNER, dropY[i]);
        ctx.arc(dropX[i], dropY[i], r * INNER, 0, TAU);
        ctx.lineWidth = w;
        ctx.strokeStyle = heavy ? COLOR.heavenlyGold : COLOR.tideShallow;
        ctx.stroke();
        ctx.lineWidth = w * 0.4;
        ctx.strokeStyle = COLOR.white;
        ctx.stroke();
      }
    // the giant ring and its trail
    if (since >= 0 && since < ringMs) {
      const u = since / ringMs;
      const r = giantAt(u);
      ctx.globalAlpha = alpha * Math.min(1, 3 * (1 - u));
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, r, 0, TAU);
      ctx.lineWidth = GIANT_RING_W * (1 - 0.5 * u);
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.stroke();
      ctx.lineWidth = GIANT_RING_W * 0.35;
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, r * GIANT_TRAIL, 0, TAU);
      ctx.lineWidth = GIANT_RING_W * 0.4;
      ctx.strokeStyle = COLOR.tideShallow;
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;

    beginLightBatch(ctx);
    if (ms < rainEnd)
      for (let i = 0; i < count; i++) {
        const until = dropAt[i] - ms;
        if (until > fallMs || until <= -SPLAT_MS) continue;
        const heavy = dropBar[i] >= 0;
        spot.x = dropX[i];
        spot.y = dropY[i];
        if (until > 0) {
          drawDrop(
            ctx,
            spot,
            until,
            fallMs,
            FALL,
            heavy ? HEAVY_DROP : lerp(DROP, dropK[i]),
          );
          continue;
        }
        // the crown of specks flung out all round the splat
        const s = -until / SPLAT_MS;
        const size = heavy ? HEAVY_SPLAT : lerp(SPLAT, dropK[i]);
        const d = size * SPLAT_REACH * (1 - (1 - s) ** 2);
        const n = heavy ? HEAVY_SPLAT_N : SPLAT_N;
        const stride = SPLAT_DIRS / n;
        for (let j = 0; j < n; j++) {
          const dir = (dropSpin[i] + Math.floor(j * stride)) % SPLAT_DIRS;
          stampGlimmer(
            ctx,
            spot.x + SPLAT_COS[dir] * d,
            spot.y + SPLAT_SIN[dir] * d,
            size * (1 - s),
            j,
            j % 2 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
      }
    // the huge drop swelling and trembling, light pulled into it
    if (ms >= gatherAt && ms < bigAt) {
      const c = clamp01((ms - gatherAt) / (bigAt - gatherAt));
      const e = c * c;
      const x = impact.x + Math.sin(ms * 0.11) * TREMBLE * e;
      const y = impact.y + Math.cos(ms * 0.17) * TREMBLE * e * 0.6;
      const trips = (ms - gatherAt) / STREAM_TRIP_MS;
      for (let i = 0; i < STREAM; i++) {
        const phase = hash01(i, seed + 9131);
        if (trips + phase < 1) continue;
        const u = (trips + phase) % 1;
        const angle = hash01(i, seed + 9132) * TAU + u * 1.4;
        const r = STREAM_R * (1 - u) * (1 - u);
        stampGlimmer(
          ctx,
          x + Math.cos(angle) * r,
          y + Math.sin(angle) * r,
          SPECK * (1 - 0.5 * u),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      const size = BIG_DROP * (0.25 + 0.75 * e);
      stampGlimmer(ctx, x, y, size * 1.6, ms * 0.004, COLOR.heavenlyGold);
      stampGlimmer(ctx, x, y, size, 3, COLOR.white);
    }
    endLightBatch(ctx);

    // the flashes: each drop's splat, the bars the giant ring crosses, the
    // clicked floor's later tiers
    if (ms < rainEnd)
      for (let i = 0; i < count; i++) {
        const age = ms - dropAt[i];
        if (age <= 0 || age >= FLASH_MS) continue;
        drawWhiteBurst(
          ctx,
          dropX[i],
          dropY[i],
          age / FLASH_MS,
          dropBar[i] >= 0 ? HEAVY_FLASH : lerp(FLASH, dropK[i]),
        );
      }
    if (since >= 0) {
      for (let b = 0; b < bars.length; b++)
        if (bars[b] !== clicked) {
          const age = ms - crossAt[b];
          if (age > 0 && age < CROSS_MS)
            drawWhiteBurst(
              ctx,
              bars[b].center.x,
              bars[b].center.y,
              age / CROSS_MS,
              CROSS_FLASH,
            );
        }
      for (let k = 1; k < clickedTiers; k++) {
        const age = ms - tierTimes[k];
        if (age > 0 && age < FLASH_MS)
          drawWhiteBurst(
            ctx,
            impact.x,
            impact.y,
            age / FLASH_MS,
            CLICKED_FLASH,
          );
      }
    }
    ctx.globalCompositeOperation = previous;
    if (since >= 0 && since < BLAST_MS)
      drawExplosion(
        ctx,
        impact.x,
        impact.y,
        since,
        now,
        BLAST_SCALE,
        SPARK_REACH,
        SPARK_SIZE,
      );
  };

  // lifted out of the frozen frame for the overlay to draw them
  setIncomePanelsHidden(bars.map((bar) => bar.floor));
  cover = startMoneyCover(
    KEY,
    floor,
    context,
    { durationMs: endMs + holdMs + mergeMs, mergeMs },
    {
      rewardMultiplier: 0,
      endOnTotal: false,
      onEnd: () => setIncomePanelsHidden([]),
      drawExtra: (ctx, getFloorRect) => {
        const rect = getFloorRect(floor);
        if (!rect) return;
        const now = performance.now();
        const ms = now - startedAt;
        raining.tick(ms, now);
        landing.tick(ms, now);
        ctx.save();
        ctx.translate(rect.left, rect.top);
        drawRewardBars(ctx, bars, now);
        if (ms >= 0 && ms <= drawEnd) drawPane(ctx, ms, now);
        ctx.restore();
      },
      frameRipple: (getFloorRect) => {
        const ms = performance.now() - startedAt;
        const since = ms - bigAt;
        if (ms < 0 || since >= ringMs) return null;
        const rect = getFloorRect(floor);
        if (!rect) return null;
        let cx = impact.x;
        let cy = impact.y;
        if (since >= 0) {
          const u = since / ringMs;
          reach = GIANT_REACH;
          wave = GIANT_WAVE;
          crestR = giantAt(u);
          trailR = crestR * GIANT_TRAIL;
          crestAmp = GIANT_AMP * (1 - u) * Math.min(1, crestR / 60);
          trailAmp = crestAmp * TRAIL_AMP;
          setBand(crestBand, crestR);
          setBand(trailBand, trailR);
          warp.bands = twoBands;
        } else {
          // the latest heavy drop still warping (they land in order)
          let latest = -1;
          for (let h = 0; h < heavyDrop.length; h++) {
            const age = ms - dropAt[heavyDrop[h]];
            if (age >= 0 && age < WARP_MS) latest = heavyDrop[h];
          }
          if (latest < 0) return null;
          const u = (ms - dropAt[latest]) / WARP_MS;
          reach = WARP_REACH;
          wave = WARP_WAVE;
          crestR = WARP_R * (1 - (1 - u) ** 2);
          crestAmp = WARP_AMP * (1 - u) * Math.min(1, crestR / 30);
          trailAmp = 0;
          setBand(crestBand, crestR);
          warp.bands = oneBand;
          cx = dropX[latest];
          cy = dropY[latest];
        }
        warp.center.x = rect.left + cx;
        warp.center.y = rect.top + cy;
        return warp;
      },
    },
  );
  if (!cover) {
    setIncomePanelsHidden([]);
    return;
  }
  playBoostEventStream();
}

registerEventProc(
  {
    key: KEY,
    chance: () => meta.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) && findRewardBars(floor, context).length > 0,
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (area) arm(floor, context, area);
    },
  },
  { label: meta.label, color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Windowpane
export function forceWindowpaneEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}
