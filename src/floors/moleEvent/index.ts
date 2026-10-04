// the "Mole" event (drill; free hires): it covers its crit, whose click
// freezes the screen while a drill head dives out of the clicked floor's
// button and tunnels under an empty spot, then bores straight up through
// the floor beneath it in shuddering shoves, sparks and chips spraying,
// and punches out in a burst and a jolt as a new worker climbs out of the
// hole; then it dives back down and tunnels on to the next spot, quicker
// each time, the last breaking out in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import {
  drawDrill,
  drawDrillHead,
  planDrill,
  type Drill,
} from "../../shared/drill";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "mole";
const MAX_HIRES = 5;
const SIZE = WISP_SIZE * 0.9;
const DEEP = 200;
const FOOT = 30;
const LOOP = 160;
const EXIT = 90;
const FORM_MS = 300;
const BITE_SHAKE = 0.3;
const PUSH_SHAKE = 0.2;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Dig {
  hire: RewardHire;
  // the dive from where it last broke out round to under the spot
  from: Point;
  bend: Point;
  under: Point;
  dives: number;
  drill: Drill;
}

export const forceMoleEvent = registerWispEvent(
  KEY,
  "Mole",
  () => CONFIG.moleEvent.chance,
  (floor, context) => {
    const { divesMs, boresMs, holdMs, mergeMs } = CONFIG.moleEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const digs: Dig[] = hires.map((hire, k) => {
      const t = k / Math.max(1, hires.length - 1);
      const under: Point = { x: hire.x, y: hire.y + DEEP };
      const ground: Point = { x: hire.x, y: hire.y + FOOT };
      // down and round underneath
      const bend: Point = {
        x: lerp([from.x, under.x], 0.5),
        y: Math.max(from.y, under.y) + LOOP,
      };
      const dives = clock;
      const diveMs = lerp(divesMs, t);
      const drill = planDrill(under, ground, {
        approachMs: diveMs * 0.35,
        boreMs: lerp(boresMs, t),
        pushes: 3,
        reach: FOOT,
        exit: EXIT,
        startMs: dives + diveMs,
      });
      const out = drill.at(drill.endMs);
      const dig = { hire, from, bend, under, dives, drill };
      from = { x: out.x, y: out.y };
      clock = drill.endMs;
      return dig;
    });
    const last = digs[digs.length - 1];
    const endAt = last.drill.through;
    const pushes = digs.flatMap((d) => d.drill.pushes.slice(0, -1));
    const spots = digs.map((d) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number) =>
        bezier(
          d.from,
          d.bend,
          d.under,
          easeIn(clamp01((ms - d.dives) / (d.drill.startMs - d.dives))),
          spot,
        );
    });

    const diving = createBeats(
      digs,
      (d) => d.dives,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const biting = createBeats(
      digs,
      (d) => d.drill.bites,
      () => {
        if (cover!.isLive()) shakeScreen(BITE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(PUSH_SHAKE);
      },
    );
    const breaking = createBeats(
      digs,
      (d) => d.drill.through,
      (d, k) => {
        giveHire(d.hire);
        const at = d.drill.target;
        if (d === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, digs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          diving.tick(ms, now);
          biting.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 600) return;
          for (let k = 0; k < digs.length; k++) {
            const d = digs[k];
            drawDrill(ctx, d.drill, ms, now, SIZE);
            if (ms < d.dives || ms >= d.drill.startMs) continue;
            // the dive: its head pointed the way it's heading
            const next = spots[k](ms + 16);
            const nx = next.x;
            const ny = next.y;
            const at = spots[k](ms);
            const angle = Math.atan2(ny - at.y, nx - at.x);
            drawDrillHead(ctx, at, angle, SIZE, (ms * Math.PI * 6) / 1000, now);
            drawWispBetween(
              ctx,
              spots[k],
              ms,
              now,
              SIZE * 0.5,
              0.6,
              d.dives,
              d.drill.startMs,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
