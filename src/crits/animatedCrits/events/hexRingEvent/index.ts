// the "Hex Ring" event (beam; cash): it covers its crit, whose click
// freezes the screen while six wisps fly out of the clicked floor's button
// to the corners of a huge hexagon round the middle of the screen and lock
// together with blazing beams; the hexagon turns and snaps tighter in
// jolts, ever faster, every snap a flash, a zap and coins spat out of its
// corners as beams flare across its middle; then it crushes down to a
// point and goes off in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "hexRing";
const REWARD = 4;
const CORNERS = 6;
const SNAPS = 5;
// the hexagon starts RADIUS of the screen's width round, turning TURN rad
// a snap; each snap spits SPIT coins from each corner
const RADIUS = 0.42;
const TURN = 0.35;
const SNAP_MS = 110;
const EDGE = 9;
const SPOKE = 4;
const CORNER = 0.5;
const SPIT = 3;
const SPIT_REACH: [number, number] = [30, 120];
const SNAP_SHAKE: [number, number] = [0.6, 1.3];

export const forceHexRingEvent = registerWispEvent(
  KEY,
  "Hex Ring",
  () => CONFIG.hexRingEvent.chance,
  (floor, context, area) => {
    const { formMs, gapsMs, crushMs, holdMs, mergeMs } = CONFIG.hexRingEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius = (area.right - area.left) * RADIUS;
    let clock: number = formMs;
    const snaps = Array.from({ length: SNAPS }, (_, k) => {
      clock += lerp(gapsMs, k / (SNAPS - 1));
      return clock;
    });
    const crushAt = clock + 120;
    const endAt = crushAt + crushMs;
    // size and turn after each snap
    const shape = { r: radius, turn: 0 };
    const shapeAt = (ms: number) => {
      let step = 0;
      let partial = 0;
      for (const s of snaps) {
        if (ms >= s + SNAP_MS) step++;
        else if (ms >= s) partial = easeOutBack((ms - s) / SNAP_MS);
      }
      const level = step + partial;
      shape.r = radius * (1 - 0.13 * level);
      shape.turn = TURN * level;
      if (ms > crushAt)
        shape.r *= 1 - easeOut(Math.min(1, (ms - crushAt) / crushMs));
      return shape;
    };
    const corners = Array.from({ length: CORNERS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        const { r, turn } = shapeAt(ms);
        const a = turn + (i / CORNERS) * Math.PI * 2 - Math.PI / 2;
        const u = easeOut(Math.min(1, ms / formMs));
        at.x = lerp([button.x, center.x + Math.cos(a) * r], u);
        at.y = lerp([button.y, center.y + Math.sin(a) * r], u);
        return at;
      };
    });
    const ends = corners.map(() => ({ x: 0, y: 0 }));

    const snapping = createBeats(
      snaps,
      (ms) => ms,
      (ms, k) => {
        for (const corner of corners) {
          const at = corner(ms);
          if (!at) continue;
          const spot = { x: at.x, y: at.y };
          cover!.launchFrom(spot, ringTargets(spot, SPIT, SPIT_REACH));
        }
        cover!.burst(center, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNAP_SHAKE, k / (SNAPS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          snapping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          if (ms >= formMs && ms <= endAt) {
            for (let i = 0; i < CORNERS; i++) {
              const at = corners[i](ms)!;
              ends[i].x = at.x;
              ends[i].y = at.y;
            }
            for (let i = 0; i < CORNERS; i++)
              drawBeam(ctx, ends[i], ends[(i + 1) % CORNERS], EDGE, 0.85);
            // spokes flare across the middle on each snap
            let flare = 0;
            for (const s of snaps) {
              const u = (ms - s) / (SNAP_MS * 2);
              if (u > 0 && u < 1) flare = Math.max(flare, 1 - u);
            }
            if (flare > 0)
              for (let i = 0; i < CORNERS; i++)
                drawBeam(ctx, ends[i], center, SPOKE, flare);
          }
          for (const corner of corners)
            drawWispBetween(
              ctx,
              corner,
              ms,
              now,
              WISP_SIZE * CORNER,
              0.8,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
