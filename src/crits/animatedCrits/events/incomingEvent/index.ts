// the "Incoming" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while bombs are lobbed in out of the far
// distance: specks high in the middle of the screen that swell as they arc
// in toward the viewer, fuses blinking ever faster, a glow marking where
// each will land; they come down on the bars one after another in a
// rolling chain of big blasts, each bursting into a cluster of bomblets,
// every bar hit jumping a crit tier; then a giant bomb swells in out of the
// distance and comes down on the clicked floor's bar in a colossal blast
// ringed by a cluster of more, the bar jumping a crit tier and slamming.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "incoming";
// a bomb sets off DEPTH times farther away than where it lands, from the
// vanishing point HORIZON of the screen down, lobbed up to LOB px over its line
const DEPTH = 9;
const HORIZON = 0.12;
const LOB = 260;
const BOMB = WISP_SIZE * 1.3;
const GIANT = WISP_SIZE * 3.4;
const BLAST = 440;
const GIANT_BLAST = 950;
// each landing's cluster of bomblets, and the giant's ring of blasts
const BOMBLETS = 4;
const BOMBLET_BLAST = 200;
const BOMBLET_REACH: [number, number] = [110, 200];
const BOMBLET_GAP = 70;
const RING = 6;
const RING_REACH = 280;
const RING_BLAST = 340;
const RING_GAP = 55;
// bombs land this share of the way along their bar, at random
const ALONG: [number, number] = [0.2, 0.8];
// with no other bar in view, this many bombs land along the clicked one
const SPARE_SHELLS = 3;
const MARK = fadeStops(COLOR.heavenlyGold);
const MARK_R = 150;
const MARK_SQUASH = 0.35;
const LAND_SHAKE = 1.3;
const BOMBLET_SHAKE = 0.45;
const RING_SHAKE = 1.1;
const SOUND_GAP_MS = 60;

interface Shell {
  launch: number;
  lands: number;
  to: Point;
  size: number;
  at: (ms: number) => Point | null;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  // a bar it lands a crit tier on, and whether it's the giant's
  bar: RewardBar | null;
  giant: boolean;
}

export const forceIncomingEvent = registerWispEvent(
  KEY,
  "Incoming",
  () => CONFIG.incomingEvent.chance,
  (floor, context, area) => {
    const { flyMs, gapMs, giantMs, holdMs, mergeMs } = CONFIG.incomingEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const vanish: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * HORIZON,
    };
    const along = (bar: RewardBar): Point => ({
      x: bar.box.x + bar.box.width * lerp(ALONG, Math.random()),
      y: bar.center.y,
    });
    const others = bars.filter((b) => b !== clicked);
    others.sort(() => Math.random() - 0.5);
    const volley: { to: Point; bar: RewardBar | null }[] =
      others.length > 0
        ? others.map((bar) => ({ to: along(bar), bar }))
        : Array.from({ length: SPARE_SHELLS }, () => ({
            to: along(clicked),
            bar: null,
          }));

    const flight = (launch: number, lands: number, to: Point, size: number) => {
      const spot: Point = { x: 0, y: 0 };
      return {
        launch,
        lands,
        to,
        size,
        at: (ms: number): Point | null => {
          if (ms < launch || ms >= lands) return null;
          const p = depthOf((ms - launch) / (lands - launch));
          spot.x = lerp([vanish.x, to.x], p);
          spot.y = lerp([vanish.y, to.y], p) - LOB * 4 * p * (1 - p);
          return spot;
        },
      };
    };
    const shells: Shell[] = volley.map((v, i) =>
      flight(i * gapMs, i * gapMs + flyMs, v.to, BOMB),
    );
    const lastLands = shells[shells.length - 1].lands;
    const giantLands = lastLands + 450;
    const giant = flight(
      giantLands - giantMs,
      giantLands,
      clicked.center,
      GIANT,
    );
    shells.push(giant);

    const blasts: Blast[] = [];
    volley.forEach((v, i) => {
      const lands = shells[i].lands;
      blasts.push({
        at: v.to,
        ms: lands,
        size: BLAST,
        shake: LAND_SHAKE,
        bar: v.bar,
        giant: false,
      });
      for (let k = 0; k < BOMBLETS; k++) {
        const angle = Math.random() * Math.PI * 2;
        const reach = lerp(BOMBLET_REACH, Math.random());
        blasts.push({
          at: {
            x: v.to.x + Math.cos(angle) * reach,
            y: v.to.y + Math.sin(angle) * reach * 0.6,
          },
          ms: lands + (k + 1) * BOMBLET_GAP,
          size: BOMBLET_BLAST,
          shake: BOMBLET_SHAKE,
          bar: null,
          giant: false,
        });
      }
    });
    blasts.push({
      at: clicked.center,
      ms: giantLands,
      size: GIANT_BLAST,
      shake: 0,
      bar: clicked,
      giant: true,
    });
    for (let k = 0; k < RING; k++) {
      const angle = (k / RING) * Math.PI * 2;
      blasts.push({
        at: {
          x: clicked.center.x + Math.cos(angle) * RING_REACH,
          y: clicked.center.y + Math.sin(angle) * RING_REACH * 0.6,
        },
        ms: giantLands + 80 + k * RING_GAP,
        size: RING_BLAST,
        shake: RING_SHAKE,
        bar: null,
        giant: false,
      });
    }
    const endMs = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;
    let soundAt = -Infinity;

    const launching = createBeats(
      [0, giant.launch],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b, _, now) => {
        if (b.bar) cover!.tierUp(b.bar, vanish);
        if (b.giant) {
          cover!.slam(b.bar!);
          cover!.blast(b.at);
          return;
        }
        if (!cover!.isLive()) return;
        shakeScreen(b.shake);
        if (b.size >= BLAST || now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: giantLands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: others.length > 0 ? [...others, clicked] : [clicked],
        tick: (ms, now) => {
          launching.tick(ms, now);
          blasting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const s of shells) {
            if (ms < s.launch || ms >= s.lands) continue;
            const t = (ms - s.launch) / (s.lands - s.launch);
            ctx.globalAlpha = t * (0.6 + 0.4 * Math.sin(now / 45));
            drawGlow(
              ctx,
              MARK,
              s.to.x,
              s.to.y,
              MARK_R * (0.4 + 0.6 * t),
              MARK_SQUASH,
            );
          }
          ctx.restore();
          for (const s of shells) {
            const at = s.at(ms);
            if (!at) continue;
            const t = (ms - s.launch) / (s.lands - s.launch);
            const size = s.size * scaleOf(t);
            drawLitFuse(ctx, at, t, size * 1.4, now);
            drawWisp(ctx, s.at, ms, now, size, t);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);

// a bomb's depth runs DEPTH..1 steadily, so it creeps out of the distance
// then rushes in: its share of the way along its line on screen, and its size
function depthOf(t: number): number {
  const z = lerp([DEPTH, 1], clamp01(t));
  return (DEPTH / z - 1) / (DEPTH - 1);
}

function scaleOf(t: number): number {
  return 1 / lerp([DEPTH, 1], clamp01(t));
}
