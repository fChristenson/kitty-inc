// the "Geode" event (drill; cash): it covers its crit, whose click freezes
// the screen while a huge rough geode of light crashes down into the middle
// of the screen and a drill-headed wisp screams in from the side and bites
// into its crust with a bang; it stalls, grinding and juddering as a gush of
// white-hot sparks streaks out of both sides, then bores in shove by shove,
// each harder, until it punches through and the geode cracks open in a huge
// blast, crystals of light flaring out of it and cash gushing everywhere.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGrind, planDrill, planGrind } from "../../../../shared/drill";
import { drawBeam } from "../../../../shared/beam";

const KEY = "geode";
const REWARD = 4;
const STONE = WISP_SIZE * 2.4;
const CRUST = 22;
const CRUST_R = 0.95;
const DROP_MS = 260;
const SIZE = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
const PUSHES = 8;
const FROM = 380;
const REACH = 46;
const CRYSTALS = 9;
const CRYSTAL_MS = 500;
const CRYSTAL_REACH = 220;
const LAND_SHAKE = 1.2;
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceGeodeEvent = registerWispEvent(
  KEY,
  "Geode",
  () => CONFIG.geodeEvent.chance,
  (floor, context, area) => {
    const { approachMs, stallMs, boreMs, holdMs, mergeMs } = CONFIG.geodeEvent;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * 0.48,
    };
    const side = Math.random() < 0.5 ? -1 : 1;
    const radius = STONE * 0.75;
    const bite: Point = { x: centre.x + side * radius, y: centre.y };
    const grind = planGrind(
      planDrill({ x: bite.x + side * FROM, y: bite.y - FROM * 0.4 }, bite, {
        approachMs,
        boreMs,
        pushes: PUSHES,
        reach: REACH,
        startMs: DROP_MS,
      }),
      stallMs,
    );
    const { bites, pushes, rumbles, through, endMs } = grind;
    const endAt = Math.max(endMs, through + CRYSTAL_MS);

    const stone: Point = { x: centre.x, y: 0 };
    const stoneAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= through) return null;
      stone.y = lerp(
        [area.top - STONE, centre.y],
        easeIn(clamp01(ms / DROP_MS)),
      );
      return stone;
    };
    const crystals = Array.from({ length: CRYSTALS }, (_, k) => {
      const a = (k / CRYSTALS) * Math.PI * 2 + Math.random() * 0.4;
      return {
        dx: Math.cos(a),
        dy: Math.sin(a),
        reach: CRYSTAL_REACH * (0.6 + 0.6 * Math.random()),
      };
    });
    const tip: Point = { x: 0, y: 0 };

    const landing = createBeats(
      [DROP_MS],
      (ms) => ms,
      () => {
        cover!.burst(centre, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LAND_SHAKE);
      },
    );
    const hitting = createBeats(
      [bites],
      (ms) => ms,
      () => {
        cover!.burst(bite, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const cracking = createBeats(
      [through],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          landing.tick(ms, now);
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          cracking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const at = stoneAt(ms);
          if (at) {
            drawWispHead(ctx, stoneAt, ms, now, STONE, 0.2);
            // its rough crust, glinting harder as the drill grinds
            const heat = clamp01((ms - bites) / (through - bites));
            for (let i = 0; i < CRUST; i++) {
              const a = (i / CRUST) * Math.PI * 2;
              const r = radius * CRUST_R * (0.9 + 0.12 * ((i * 7) % 3));
              drawGlitterLight(
                ctx,
                at.x + Math.cos(a) * r,
                at.y + Math.sin(a) * r,
                10 + 8 * heat,
                i,
                0.9,
                now,
              );
            }
          }
          drawGrind(ctx, grind, ms, now, SIZE, SPRAY);
          // crystals of light flaring out of the cracked geode
          const t = (ms - through) / CRYSTAL_MS;
          if (t >= 0 && t < 1)
            for (const c of crystals) {
              const r = c.reach * easeOut(t);
              tip.x = centre.x + c.dx * r;
              tip.y = centre.y + c.dy * r;
              drawBeam(ctx, centre, tip, 26 * (1 - t), 1 - t);
            }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
