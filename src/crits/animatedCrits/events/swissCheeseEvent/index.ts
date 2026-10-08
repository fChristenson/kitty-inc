// the "Swiss Cheese" event (experiment: holes are punched clean through the
// screen; cash): it covers its crit, whose click freezes the screen and
// holes start popping open all over it, one after another and faster and
// faster, each with a bang and a jolt: round black gaps rimmed in gold with
// a blaze of gold behind, each gushing a river of cash out into the total;
// at the end every hole flares at once in a huge blast and shake and they
// all snap shut. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  drawGlow,
  fadeStops,
  type FadeStops,
} from "../../../../shared/glowSprite";
import { bezier } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "swissCheese";
const REWARD = 4;
const HOLES = 11;
const RADIUS: [number, number] = [34, 78];
const SPACING = 1.25;
const MARGIN = 50;
const POP_MS = 160;
const HEAL_MS = 220;
const FLARE_MS = 260;
const RING = 18;
const BOW = 140;
const HOLE: FadeStops = [
  [0, "#000000"],
  [0.78, "#000000"],
  [1, "#00000000"],
];
const GOLD = fadeStops(COLOR.heavenlyGold);
const RIM: FadeStops = [
  [0, `${COLOR.heavenlyGold}00`],
  [0.7, `${COLOR.heavenlyGold}00`],
  [0.8, COLOR.heavenlyGold],
  [0.9, `${COLOR.heavenlyGold}00`],
  [1, `${COLOR.heavenlyGold}00`],
];
const PUNCH_SHAKE: [number, number] = [0.5, 1.2];
const FLARE_SHAKE = 2.2;

interface Hole {
  at: Point;
  r: number;
  opens: number;
  river: Point[];
}

export const forceSwissCheeseEvent = registerWispEvent(
  KEY,
  "Swiss Cheese",
  () => CONFIG.swissCheeseEvent.chance,
  (floor, context, area) => {
    const { punchMs, flareGapMs, holdMs, mergeMs } = CONFIG.swissCheeseEvent;
    const total = totalSpot(area);
    const spots: { at: Point; r: number }[] = [];
    for (let tries = 0; spots.length < HOLES && tries < 400; tries++) {
      const r = between(RADIUS);
      const at: Point = {
        x: between([area.left + MARGIN + r, area.right - MARGIN - r]),
        y: between([area.top + 160 + r, area.bottom - MARGIN - r]),
      };
      if (
        spots.every(
          (s) => Math.hypot(s.at.x - at.x, s.at.y - at.y) > (s.r + r) * SPACING,
        )
      )
        spots.push({ at, r });
    }
    let clock = 0;
    const holes: Hole[] = spots.map(({ at, r }, k) => {
      const opens = clock;
      clock += lerp(punchMs, k / Math.max(1, spots.length - 1));
      const side = at.x < total.x ? -1 : 1;
      const bend: Point = {
        x: lerp([at.x, total.x], 0.5) + side * BOW,
        y: lerp([at.y, total.y], 0.5),
      };
      const into: Point = { x: 0, y: 0 };
      return {
        at,
        r,
        opens,
        river: sampleLine((u) => ({ ...bezier(at, bend, total, u, into) }), 24),
      };
    });
    const lastOpens = holes[holes.length - 1].opens;
    const flaresAt = lastOpens + POP_MS + flareGapMs;
    const healsAt = flaresAt + FLARE_MS;
    const pour: Pour = {
      coinsAlong: 90,
      width: 26,
      streamMs: 300,
      travelMs: 600,
    };

    const punching = createBeats(
      holes,
      (h) => h.opens,
      (h, k) => {
        pourLine(cover!, h.river, pour);
        cover!.launchFrom(
          h.at,
          clampTargetsY(
            ringTargets(h.at, RING, [h.r, h.r * 2.6]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUNCH_SHAKE, k / Math.max(1, holes.length - 1)));
      },
    );
    const flaring = createBeats(
      [flaresAt],
      (ms) => ms,
      () => {
        cover!.blast(total);
        if (cover!.isLive()) shakeScreen(FLARE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(pourDurationMs(lastOpens, pour), healsAt + HEAL_MS) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          punching.tick(ms, now);
          flaring.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms < 0 || ms > healsAt + HEAL_MS) return;
          const heal = 1 - easeIn(clamp01((ms - healsAt) / HEAL_MS));
          const flare =
            ms < flaresAt ? 0 : 1 - clamp01((ms - flaresAt) / FLARE_MS);
          const flicker = 0.75 + 0.25 * Math.sin(now * 0.02);
          for (const h of holes) {
            if (ms < h.opens) continue;
            const r =
              h.r * easeOutBack(clamp01((ms - h.opens) / POP_MS)) * heal;
            if (r <= 0) continue;
            drawGlow(ctx, HOLE, h.at.x, h.at.y, r);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.55 * flicker + 0.45 * flare;
            drawGlow(ctx, GOLD, h.at.x, h.at.y, r * (0.8 + 0.6 * flare));
            ctx.globalAlpha = 1;
            drawGlow(ctx, RIM, h.at.x, h.at.y, r * 1.1);
            ctx.globalCompositeOperation = "source-over";
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
