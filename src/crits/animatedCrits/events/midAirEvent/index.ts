// the "Mid-Air" event (explosion; cash): it covers its crit, whose click
// freezes the screen while lit bombs are lobbed in high arcs from both
// bottom corners, pair after pair, each pair smashing together in mid-air
// in a big blast, a bang, a jolt and a spray of cash, the volleys rolling on
// quicker and quicker; then both corners let fly at once and five pairs
// collide together in a row of blasts, and a colossal one in the middle
// gives the hardest shake before the cash pours into the total. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";

const KEY = "midAir";
const REWARD = 4;
const PAIRS = 6;
const VOLLEY = 5;
const CORNER = 60;
const ARC = 320;
const BOMB = 0.4;
const FUSE = 13;
const BLAST = 200;
const VOLLEY_BLAST = 230;
const COLOSSAL = 500;
const RING = 18;
const CORE_DELAY_MS = 140;
const CLASH_SHAKE: [number, number] = [0.6, 1.3];
const VOLLEY_SHAKE = 2;

interface Clash {
  meets: number;
  at: Point;
  size: number;
  shakes: boolean;
  bombs: ((ms: number) => Point)[];
}

export const forceMidAirEvent = registerWispEvent(
  KEY,
  "Mid-Air",
  () => CONFIG.midAirEvent.chance,
  (floor, context, area) => {
    const { flightMs, clashesMs, volleyGapMs, holdMs, mergeMs } =
      CONFIG.midAirEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const corners: Point[] = [
      { x: area.left + CORNER, y: area.bottom - CORNER },
      { x: area.right - CORNER, y: area.bottom - CORNER },
    ];
    // lobbed from a corner, over the top, down onto where the pair meets
    const lob = (from: Point, meet: Point, meets: number) => {
      const via: Point = {
        x: (from.x + meet.x) / 2,
        y: Math.min(from.y, meet.y) - ARC,
      };
      const spot: Point = { x: 0, y: 0 };
      return (ms: number) =>
        bezier(
          from,
          via,
          meet,
          clamp01((ms - meets + flightMs) / flightMs),
          spot,
        );
    };
    const clash = (
      at: Point,
      meets: number,
      size: number,
      shakes: boolean,
    ): Clash => ({
      meets,
      at,
      size,
      shakes,
      bombs: corners.map((c) => lob(c, at, meets)),
    });
    let clock: number = flightMs;
    const clashes: Clash[] = [];
    for (let i = 0; i < PAIRS; i++) {
      clashes.push(
        clash(
          {
            x: area.left + width * between([0.3, 0.7]),
            y: area.top + height * between([0.3, 0.55]),
          },
          clock,
          BLAST,
          true,
        ),
      );
      clock += lerp(clashesMs, i / (PAIRS - 1));
    }
    const volleyAt = clock - lerp(clashesMs, 1) + volleyGapMs;
    const rowY = area.top + height * 0.42;
    for (let i = 0; i < VOLLEY; i++)
      clashes.push(
        clash(
          {
            x: area.left + (width * (i + 1)) / (VOLLEY + 1),
            y: rowY + (i % 2 ? -50 : 50),
          },
          volleyAt,
          VOLLEY_BLAST,
          i === 0,
        ),
      );
    const coreAt = volleyAt + CORE_DELAY_MS;
    const core: Point = { x: area.left + width / 2, y: rowY };

    const clashing = createBeats(
      clashes,
      (c) => c.meets,
      (c, i) => {
        cover!.launchFrom(
          c.at,
          clampTargetsY(
            ringTargets(c.at, RING, [90, 260]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive() || !c.shakes) return;
        playExplosion();
        shakeScreen(
          i < PAIRS ? lerp(CLASH_SHAKE, i / (PAIRS - 1)) : VOLLEY_SHAKE,
        );
      },
    );
    const finale = createBeats(
      [coreAt],
      (ms) => ms,
      () => cover!.blast(core),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clashing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const c of clashes) {
            drawDetonation(ctx, c.at, ms - c.meets, c.size, now);
            const flying = ms - c.meets + flightMs;
            if (flying < 0 || ms >= c.meets) continue;
            for (const bomb of c.bombs) {
              drawLitFuse(ctx, bomb(ms), flying / flightMs, FUSE, now);
              drawWispBetween(
                ctx,
                bomb,
                ms,
                now,
                WISP_SIZE * BOMB,
                0.5,
                c.meets - flightMs,
                c.meets,
              );
            }
          }
          drawDetonation(ctx, core, ms - coreAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
