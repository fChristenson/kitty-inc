// the "Fleas" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a swarm of tiny flea wisps springs out of the
// clicked floor's button and goes boinging all over the screen in huge
// bounding leaps, every landing a tiny pop; leap by leap they home in on the
// empty spots, and as the last flea lands on each, a new worker forms there
// with a bang and a jolt; the very last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, hops, SPLASH_MS } from "../../../../shared/bounce";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "fleas";
const MAX_HIRES = 6;
const FLEAS = 12;
const FORM_MS = 300;
const LIFT = 20;
const HOPS: [number, number] = [2, 4];
const LEAP: [number, number] = [160, 320];
const MARGIN = 120;
const FLEA = 0.3;
const SPLASH = 50;
const BLOOP_GAP_MS = 60;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceFleasEvent = registerWispEvent(
  KEY,
  "Fleas",
  () => CONFIG.fleasEvent.chance,
  (floor, context, area) => {
    const { springGapMs, hopMs, holdMs, mergeMs } = CONFIG.fleasEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const fleas = Array.from({ length: FLEAS }, (_, i) => {
      const hire = hires[i % hires.length];
      const home: Point = { x: hire.x, y: hire.y - LIFT };
      const stops: Point[] = Array.from(
        { length: Math.round(between(HOPS)) },
        () => ({
          x: between([area.left + MARGIN, area.right - MARGIN]),
          y: between([area.top + MARGIN * 2, area.bottom - MARGIN]),
        }),
      );
      const leap = between(LEAP);
      const path = hops(
        [button, ...stops, home],
        hopMs,
        [leap, leap * 0.7],
        i * springGapMs,
      );
      return { hire, home, path, lands: path.endMs };
    });
    // each spot's worker forms as the last flea bound for it lands
    const settles = hires.map((hire) => {
      const mine = fleas.filter((f) => f.hire === hire);
      return {
        hire,
        home: mine[0].home,
        lands: Math.max(...mine.map((f) => f.lands)),
      };
    });
    const endAt = Math.max(...settles.map((s) => s.lands));
    const last = settles.find((s) => s.lands === endAt)!;
    const landings = fleas.flatMap((f) => f.path.bounces.slice(0, -1));
    let lastBloop = -Infinity;

    const popping = createBeats(
      landings,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive() || b.ms - lastBloop < BLOOP_GAP_MS) return;
        lastBloop = b.ms;
        playBloop();
      },
    );
    const settling = createBeats(
      settles,
      (s) => s.lands,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.home);
          return;
        }
        cover!.burst(s.home, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, settles.length - 1)));
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
          popping.tick(ms, now);
          settling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + SPLASH_MS) return;
          for (const b of landings)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const f of fleas)
            drawWispBetween(
              ctx,
              f.path.at,
              ms,
              now,
              WISP_SIZE * FLEA,
              0.7,
              f.path.startMs,
              f.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
