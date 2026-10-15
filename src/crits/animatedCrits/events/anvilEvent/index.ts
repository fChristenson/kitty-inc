// the "Anvil" event (crush; worker perma tiers): it covers its crit, whose
// click freezes the screen with a little wisp sitting by the workers of each
// floor in view; anvils of light drop out of the sky onto them one after
// another down the building, each quicker and heavier, the wisp trembling
// under it, squashing flat on the slam (contact line, cracks, glitter
// squirting, a bang and a jolt) and bursting into sparks that pop onto its
// floor's workers, a perma tier each; then a giant anvil wobbles high over
// the clicked floor and drops with the hardest slam, its workers all promoted
import meta from "./meta";
import type { Floor } from "../../../../gameState";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  planCrush,
  squashScale,
  tickCrush,
} from "../../../../shared/animationStyles/crush";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "anvil";
// floors crushed before the giant, nearest the clicked one first
const MAX_STOPS = 5;
// the wisps fading in, and a lone worker's wisp SIDE px off it
const WISP_IN_MS = 150;
const SIDE = 60;
const WISP = WISP_SIZE * 1.1;
const GIANT_WISP = WISP_SIZE * 1.9;
// the slams: from LEAD_MS after the first, the gaps closing; the giant
// hanging GIANT_HANG_MS (SOLO_MS when it's the only one)
const LEAD_MS = 260;
const GAPS: [number, number] = [360, 170];
const GIANT_HANG_MS = 560;
const SOLO_MS = 620;
// the anvils: ANVIL px wide first to last, dropping DROP of the screen's
// height in FALL_MS, sitting HOLD_MS on the wreck then fading
const ANVIL: [number, number] = [110, 160];
const DROP: [number, number] = [0.2, 0.28];
const FALL_MS = 90;
const HOLD_MS = 140;
const FADE_MS = 160;
const GIANT_ANVIL = 0.72;
const GIANT_MAX = 320;
const GIANT_DROP = 0.42;
const GIANT_FALL_MS = 140;
const GIANT_HOLD_MS = 320;
const WOBBLE_TURN = 0.16;
const WOBBLE_SWAY = 22;
const HOVER_TREMBLE = 6;
const WISP_TREMBLE = 9;
// the slam: driving the wisp flat over DRIVE_MS, popping POP_MS after it;
// the anvil's squash on the slam, first to last
const DRIVE_MS = 45;
const POP_MS = 90;
const STRETCH = 0.3;
const SQUASH: [number, number] = [0.18, 0.36];
const GIANT_SQUASH = 0.45;
const SQUASH_DECAY_MS = 80;
const WOBBLE_MS = 170;
const POWER: [number, number] = [0.6, 1.2];
const GIANT_POWER = 1.6;
const CRACK_MS = 450;
// the pop: POP_SPARKS glimmers flung REACH px, then a spark onto each worker
// SPARK_MS (EVERY_MS apart)
const POP_SPARKS = 14;
const POP_REACH = 90;
const POP_SPARK_MS = 300;
const POP_BLAST: [number, number] = [110, 170];
const GIANT_BLAST = 340;
const SPARK_MS = 150;
const GIANT_SPARK_MS = 190;
const EVERY_MS = 18;
const SPARK = WISP_SIZE * 0.8;
const TIER_BLAST = 80;
const TIER_SHAKE = 0.4;

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

// an anvil one px wide, its base's middle at the origin
const ANVIL_PATH = new Path2D(
  "M-0.3 -0.58 L0.42 -0.58 L0.42 -0.42 L0.18 -0.38 L0.14 -0.18 L0.34 -0.08" +
    " L0.34 0 L-0.32 0 L-0.32 -0.08 L-0.12 -0.18 L-0.16 -0.38" +
    " Q-0.4 -0.4 -0.58 -0.54 Q-0.45 -0.58 -0.3 -0.58 Z",
);

interface Stop {
  giant: boolean;
  // the wisp's spot, where the anvil's base drives it to, and where it is
  // this frame (trembling)
  spot: Point;
  contact: Point;
  live: Point;
  hover: () => Point;
  r: number;
  wisp: number;
  size: number;
  drop: number;
  fallMs: number;
  holdMs: number;
  squash: number;
  power: number;
  blast: number;
  appearMs: number;
  slamMs: number;
  workers: RewardWorker[];
}

interface Spark {
  worker: RewardWorker;
  start: number;
  land: number;
  at: (ms: number) => Point | null;
}

// between the middle two workers, or beside a lone one (toward midX)
function spotBy(group: RewardWorker[], midX: number): Point {
  const xs = group.map((w) => w.at.x).sort((a, b) => a - b);
  let y = 0;
  for (const w of group) y += w.at.y;
  y /= group.length;
  if (xs.length === 1) return { x: xs[0] + (xs[0] < midX ? SIDE : -SIDE), y };
  const h = xs.length >> 1;
  return { x: (xs[h - 1] + xs[h]) / 2, y };
}

function drawAnvil(
  ctx: CanvasRenderingContext2D,
  x: number,
  bottom: number,
  size: number,
  sx: number,
  sy: number,
  turn: number,
  alpha: number,
  now: number,
): void {
  if (alpha <= 0) return;
  const w = size * sx;
  const h = size * sy;
  const base = ctx.globalAlpha;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = base * alpha * (0.6 + 0.15 * Math.sin(now * 0.02));
  drawGlow(ctx, GOLD, x, bottom - h * 0.3, w * 0.8, 0.7);
  ctx.globalCompositeOperation = previous;
  ctx.save();
  ctx.translate(x, bottom - h * 0.3);
  if (turn !== 0) ctx.rotate(turn);
  ctx.scale(w, h);
  ctx.translate(0, 0.3);
  ctx.globalAlpha = base * alpha * 0.92;
  ctx.fillStyle = COLOR.heavenlyGold;
  ctx.fill(ANVIL_PATH);
  ctx.globalAlpha = base * alpha;
  ctx.lineWidth = 0.035;
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLOR.white;
  ctx.stroke(ANVIL_PATH);
  ctx.fillRect(-0.28, -0.57, 0.68, 0.05);
  ctx.restore();
  ctx.globalAlpha = base;
}

export const forceAnvilEvent = registerWispEvent(
  KEY,
  "Anvil",
  () => meta.chance,
  (floor, context, area) => {
    const { firstMs, holdMs, mergeMs } = meta.values;
    const found = findRewardWorkers(floor, context);
    if (found.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const midX = (area.left + area.right) / 2;

    // the floors in view, the clicked one's workers for the giant (else the
    // nearest floor's)
    const groups = new Map<Floor, RewardWorker[]>();
    for (const w of found) {
      const group = groups.get(w.worker.floor);
      if (group) group.push(w);
      else groups.set(w.worker.floor, [w]);
    }
    const others: RewardWorker[][] = [];
    for (const [f, group] of groups) if (f !== floor) others.push(group);
    const ownGroup = groups.get(floor);
    const anchorY = ownGroup ? ownGroup[0].at.y : (area.top + area.bottom) / 2;
    others.sort(
      (a, b) => Math.abs(a[0].at.y - anchorY) - Math.abs(b[0].at.y - anchorY),
    );
    const finale = ownGroup ?? others.shift()!;
    const small = others
      .slice(0, MAX_STOPS)
      .sort((a, b) => a[0].at.y - b[0].at.y);

    const count = small.length + 1;
    const lastGap = count > 2 ? GAPS[1] : GAPS[0];
    const crush = planCrush(
      firstMs + (count === 1 ? SOLO_MS : LEAD_MS),
      count,
      GAPS,
      GIANT_HANG_MS / lastGap,
      {
        slamMs: FALL_MS,
        shake: [0.7, 1.6],
        buzz: [20, 50],
        climaxShake: 3.6,
        bang: true,
      },
    );
    const last = count - 1;
    const giantSize = Math.min(GIANT_MAX, width * GIANT_ANVIL);

    const stops: Stop[] = [];
    for (let k = 0; k < count; k++) {
      const giant = k === last;
      const group = giant ? finale : small[k];
      const t = small.length > 1 ? k / (small.length - 1) : 1;
      const wisp = giant ? GIANT_WISP : WISP;
      const r = wisp * 0.5;
      const spot = spotBy(group, midX);
      const live: Point = { x: spot.x, y: spot.y };
      stops.push({
        giant,
        spot,
        contact: { x: spot.x, y: spot.y + r * 0.6 },
        live,
        hover: () => live,
        r,
        wisp,
        size: giant ? giantSize : lerp(ANVIL, t),
        drop: height * (giant ? GIANT_DROP : lerp(DROP, t)),
        fallMs: giant ? GIANT_FALL_MS : FALL_MS,
        holdMs: giant ? GIANT_HOLD_MS : HOLD_MS,
        squash: giant ? GIANT_SQUASH : lerp(SQUASH, t),
        power: giant ? GIANT_POWER : lerp(POWER, t),
        blast: giant ? GIANT_BLAST : lerp(POP_BLAST, t),
        appearMs: k === 0 ? firstMs : crush.slams[k - 1] + 50,
        slamMs: crush.slams[k],
        workers: group,
      });
    }

    const sparks: Spark[] = [];
    for (const s of stops) {
      const pop = s.slamMs + POP_MS;
      const flyMs = s.giant ? GIANT_SPARK_MS : SPARK_MS;
      for (let i = 0; i < s.workers.length; i++) {
        const worker = s.workers[i];
        const start = pop + i * EVERY_MS;
        const land = start + flyMs;
        const from = s.spot;
        const to = worker.at;
        const cx = (from.x + to.x) / 2;
        const cy = Math.min(from.y, to.y) - 50 - Math.abs(to.x - from.x) * 0.25;
        const spot: Point = { x: 0, y: 0 };
        sparks.push({
          worker,
          start,
          land,
          at: (ms) => {
            if (ms < start || ms > land) return null;
            const u = (ms - start) / (land - start);
            const v = 1 - u;
            spot.x = v * v * from.x + 2 * v * u * cx + u * u * to.x;
            spot.y = v * v * from.y + 2 * v * u * cy + u * u * to.y;
            return spot;
          },
        });
      }
    }
    let endMs = 0;
    for (const f of sparks) endMs = Math.max(endMs, f.land);
    const workers: RewardWorker[] = [];
    for (const s of stops) for (const w of s.workers) workers.push(w);

    const shiver: Point = { x: 0, y: 0 };
    const scale: Point = { x: 0, y: 0 };
    const contact: Point = { x: 0, y: 0 };

    const landing = createBeats(
      sparks,
      (f) => f.land,
      (f) => {
        cover!.promote(f.worker);
        if (cover!.isLive()) shakeScreen(TIER_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          if (cover?.isLive()) {
            const landed = tickCrush(crush, ms);
            if (landed >= 0 && landed < last) playExplosion();
          }
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 900) return;
          const wispIn = smoothstep(clamp01(ms / WISP_IN_MS));
          // the wisps: trembling as their anvil hangs over them, squashed
          // flat on the slam
          for (let k = 0; k < stops.length; k++) {
            const s = stops[k];
            const since = ms - s.slamMs;
            if (since >= POP_MS) continue;
            if (since < 0) {
              const c = clamp01((ms - s.appearMs) / (s.slamMs - s.appearMs));
              trembleAt(ms >= s.appearMs ? c : 0, ms, WISP_TREMBLE, shiver);
              s.live.x = s.spot.x + shiver.x;
              s.live.y = s.spot.y + shiver.y;
              drawWisp(ctx, s.hover, ms, now, s.wisp * wispIn, c, wispIn);
              continue;
            }
            squashScale(clamp01(since / DRIVE_MS), scale);
            const wobble = 1 + 0.2 * Math.sin((since / POP_MS) * Math.PI * 3);
            const r = s.r * scale.x * wobble;
            const cy = s.spot.y + s.r * (1 - scale.y);
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            drawGlow(ctx, GOLD, s.spot.x, cy, r * 1.5, scale.y / scale.x);
            drawGlow(ctx, WHITE, s.spot.x, cy, r * 0.8, scale.y / scale.x);
            ctx.globalCompositeOperation = previous;
          }
          // the anvils: hanging, dropping with a stretch, squashing on the slam
          for (let k = 0; k < stops.length; k++) {
            const s = stops[k];
            if (ms < s.appearMs) continue;
            const since = ms - s.slamMs;
            if (since > s.holdMs + FADE_MS) continue;
            const top = s.spot.y - s.r;
            let bottom = top;
            let x = s.spot.x;
            let sy = 1;
            let turn = 0;
            let alpha = 1;
            if (since < -s.fallMs) {
              const hang = clamp01(
                (ms - s.appearMs) / (s.slamMs - s.fallMs - s.appearMs),
              );
              const appear = smoothstep(clamp01((ms - s.appearMs) / 120));
              trembleAt(hang, ms, HOVER_TREMBLE, shiver);
              bottom = top - s.drop - (1 - appear) * s.drop * 0.6 + shiver.y;
              x += shiver.x;
              alpha = appear;
              if (s.giant) {
                turn = WOBBLE_TURN * hang * Math.sin(ms * 0.028);
                x += WOBBLE_SWAY * hang * Math.sin(ms * 0.019);
              }
            } else if (since < 0) {
              const u = 1 + since / s.fallMs;
              bottom = top - s.drop * (1 - u * u);
              sy = 1 + STRETCH * u * u;
            } else {
              bottom = lerp([top, s.contact.y], clamp01(since / DRIVE_MS));
              sy =
                1 -
                s.squash *
                  Math.exp(-since / SQUASH_DECAY_MS) *
                  Math.cos((Math.PI * 2 * since) / WOBBLE_MS);
              alpha = 1 - clamp01((since - s.holdMs) / FADE_MS);
            }
            drawAnvil(
              ctx,
              x,
              bottom,
              s.size,
              1 / Math.sqrt(sy),
              sy,
              turn,
              alpha,
              now,
            );
          }
          // where each anvil hit: the contact line and glitter squirting,
          // cracks spreading, the giant's burst
          for (let k = 0; k < stops.length; k++) {
            const s = stops[k];
            const since = ms - s.slamMs;
            if (since < 0 || since > CRACK_MS + 200) continue;
            contact.x = s.contact.x;
            contact.y = s.contact.y;
            if (since < CRACK_MS) {
              const alpha = ctx.globalAlpha;
              ctx.globalAlpha = alpha * (1 - since / CRACK_MS);
              drawCrushStrain(
                ctx,
                contact,
                Math.PI / 2,
                s.size * 0.6,
                Math.min(1, since / 100),
                s.size * (s.giant ? 1.4 : 0.9),
                now,
              );
              ctx.globalAlpha = alpha;
            }
            drawCrushContact(
              ctx,
              contact,
              Math.PI / 2,
              s.size * 0.75,
              since,
              s.power,
              now,
            );
            if (s.giant)
              drawCrushBurst(ctx, contact, Math.PI / 2, s.size, since, now);
          }
          // each wisp bursting into sparks, one onto each of its workers
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let k = 0; k < stops.length; k++) {
            const s = stops[k];
            const since = ms - s.slamMs - POP_MS;
            if (since < 0 || since >= POP_SPARK_MS) continue;
            const u = since / POP_SPARK_MS;
            const out = 1 - (1 - u) ** 3;
            const reach = POP_REACH * (s.giant ? 2.2 : 1) * out;
            for (let i = 0; i < POP_SPARKS; i++) {
              const a = (i / POP_SPARKS) * Math.PI * 2 + hash01(i, 9301 + k);
              const d = reach * (0.5 + 0.5 * hash01(i, 9302 + k));
              stampGlimmer(
                ctx,
                s.spot.x + Math.cos(a) * d,
                s.spot.y + Math.sin(a) * d,
                (s.giant ? 34 : 24) * (1 - u),
                i,
                i % 3 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
          for (let k = 0; k < stops.length; k++) {
            const s = stops[k];
            drawDetonation(ctx, s.spot, ms - s.slamMs - POP_MS, s.blast, now);
          }
          for (let i = 0; i < sparks.length; i++) {
            const f = sparks[i];
            drawWispBetween(ctx, f.at, ms, now, SPARK, 0.8, f.start, f.land);
            drawDetonation(ctx, f.worker.at, ms - f.land, TIER_BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
