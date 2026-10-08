// the "Bouncy Castle" event (bounce; free hires): it covers its crit, whose
// click freezes the screen while a springy floor of glitter stretches
// across the bottom of the screen and wisps drop onto it one after another,
// bouncing higher and higher, the floor sagging under every landing; one by
// one each launches off in a towering leap onto an empty spot, landing in
// a flash and a jolt as a new worker forms there, the last in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "bouncyCastle";
const MAX_HIRES = 6;
const LOW = 110;
const DROP = 500;
const BOUNCES = 3;
const LIFT: [number, number] = [60, 260];
const KID = 0.4;
const DOTS = 32;
const DOT = 6;
const SAG = 34;
const SAG_MS = 220;
const SAG_REACH = 90;
const SPLASH = 80;
const FORM_MS = 300;
const BOING_GAP_MS = 60;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

interface Kid {
  hire: RewardHire;
  path: BouncePath;
  lands: Bounce;
}

export const forceBouncyCastleEvent = registerWispEvent(
  KEY,
  "Bouncy Castle",
  () => CONFIG.bouncyCastleEvent.chance,
  (floor, context, area) => {
    const { staggerMs, hopMs, holdMs, mergeMs } = CONFIG.bouncyCastleEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const floorY = area.bottom - LOW;
    const kids: Kid[] = hires.map((hire, k) => {
      const x = area.left + (width * (k + 0.5)) / hires.length;
      const spot: Point = { x, y: floorY };
      const points: Point[] = [
        { x, y: floorY - DROP },
        ...Array.from({ length: BOUNCES }, () => spot),
        { x: hire.x, y: hire.y },
      ];
      const path = hops(points, hopMs, LIFT, k * staggerMs);
      return { hire, path, lands: path.bounces[path.bounces.length - 1] };
    });
    const springs = kids.flatMap((k) => k.path.bounces.slice(0, -1));
    const order = kids.slice().sort((a, b) => a.lands.ms - b.lands.ms);
    const last = order[order.length - 1];
    const endAt = last.lands.ms;
    let boing = -Infinity;

    const bouncing = createBeats(
      springs,
      (b) => b.ms,
      (b) => {
        if (b.ms - boing < BOING_GAP_MS || !cover!.isLive()) return;
        boing = b.ms;
        playBloop();
      },
    );
    const landing = createBeats(
      order,
      (k) => k.lands.ms,
      (kid, k) => {
        giveHire(kid.hire);
        if (kid === last) {
          cover!.blast(kid.lands.at);
          return;
        }
        cover!.burst(kid.lands.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, order.length - 1)));
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
          bouncing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          // the springy floor, sagging round every fresh landing
          const fade =
            ms > endAt - 200 ? Math.max(0, 1 - (ms - (endAt - 200)) / 400) : 1;
          for (let i = 0; i < DOTS; i++) {
            const x = area.left + (width * (i + 0.5)) / DOTS;
            let sag = 0;
            for (const b of springs) {
              const t = ms - b.ms;
              if (t < 0 || t > SAG_MS * 3) continue;
              const dx = (x - b.at.x) / SAG_REACH;
              sag += SAG * Math.exp(-t / SAG_MS) * Math.exp(-dx * dx);
            }
            drawGlitterLight(
              ctx,
              x,
              floorY + Math.min(sag, SAG * 1.5),
              DOT,
              i,
              0.8 * fade,
              now,
            );
          }
          for (const b of springs)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const kid of kids)
            drawWispBetween(
              ctx,
              kid.path.at,
              ms,
              now,
              WISP_SIZE * KID,
              0.8,
              kid.path.startMs,
              kid.lands.ms,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
