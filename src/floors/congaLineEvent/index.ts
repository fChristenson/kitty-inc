// the "Conga Line" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while a conga line of wisps dances out of the
// clicked floor's button, each one following in the one ahead's footsteps,
// the whole line swaying and kicking on the beat as it snakes from one
// empty spot on the floors in view to the next; at each spot the wisp at
// the back of the line peels off with a pop and a jolt and a new worker
// forms where it lands, the line ever shorter and quicker; the leader
// dances onto the last spot in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "congaLine";
const MAX_HIRES = 5;
const FORM_MS = 300;
// dancers follow LAG ms behind the one ahead, swaying SWAY px and kicking
// KICK px up every BEAT ms
const LAG = 110;
const SWAY = 7;
const KICK = 14;
const BEAT = 360;
const RAISE = 30;
const HOP_MS = 200;
const DANCER = 0.45;
const LEADER = 0.65;
const DROP_SHAKE: [number, number] = [0.6, 1.2];

export const forceCongaLineEvent = registerWispEvent(
  KEY,
  "Conga Line",
  () => CONFIG.congaLineEvent.chance,
  (floor, context) => {
    const { danceMs, holdMs, mergeMs } = CONFIG.congaLineEvent;
    const button = getButtonCenter(context.isGroundFloor);
    // the spots in a chain, each the nearest left to the last
    const left = findRewardHires(floor, context);
    const hires: typeof left = [];
    let here: Point = button;
    while (left.length && hires.length < MAX_HIRES) {
      let best = 0;
      left.forEach((h, i) => {
        if (
          Math.hypot(h.x - here.x, h.y - here.y) <
          Math.hypot(left[best].x - here.x, left[best].y - here.y)
        )
          best = i;
      });
      const [next] = left.splice(best, 1);
      hires.push(next);
      here = { x: next.x, y: next.y - RAISE };
    }
    if (hires.length === 0) return;
    const spots = hires.map((h) => ({ x: h.x, y: h.y - RAISE }));
    const route: Point[] = [button, ...spots];
    const n = hires.length;
    // the leader's u along the route, ever faster
    const leaderU = (ms: number) => smoothstep(clamp01(ms / danceMs)) ** 0.85;
    const reachAt = (k: number) => {
      // when the leader reaches spot k (u = (k + 1) / n)
      const target = (k + 1) / n;
      let lo = 0;
      let hi: number = danceMs;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (leaderU(mid) < target) lo = mid;
        else hi = mid;
      }
      return hi;
    };
    const endAt = danceMs;
    const dancerAt = (i: number, ms: number, into: Point) => {
      const t = ms - i * LAG;
      alongRoute(route, leaderU(Math.max(0, t)), into);
      into.x += Math.sin(t / 140 + i) * SWAY;
      const beat = (((t % BEAT) + BEAT) % BEAT) / BEAT;
      into.y -= beat > 0.75 ? Math.sin(Math.PI * (beat - 0.75) * 4) * KICK : 0;
      return into;
    };
    // dancer n-1-k (the back of the line) peels off onto spot k
    const drops = spots.slice(0, -1).map((spot, k) => {
      const dancer = n - 1 - k;
      const leaves = reachAt(k);
      const from = dancerAt(dancer, leaves, { x: 0, y: 0 });
      return {
        hire: hires[k],
        spot,
        dancer,
        leaves,
        lands: leaves + HOP_MS,
        from,
      };
    });
    const dancers = Array.from({ length: n }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      const drop = drops.find((d) => d.dancer === i);
      return {
        size: i === 0 ? LEADER : DANCER,
        until: drop ? drop.lands : endAt,
        at: (ms: number): Point | null => {
          if (ms < i * LAG * 0.5) return null;
          if (drop && ms >= drop.leaves) {
            if (ms >= drop.lands) return null;
            const u = easeOut((ms - drop.leaves) / HOP_MS);
            at.x = lerp([drop.from.x, drop.spot.x], u);
            at.y =
              lerp([drop.from.y, drop.spot.y], u) - Math.sin(Math.PI * u) * 30;
            return at;
          }
          return dancerAt(i, ms, at);
        },
      };
    });
    const last = { hire: hires[n - 1], spot: spots[n - 1] };

    const dropping = createBeats(
      drops,
      (d) => d.lands,
      (d, k) => {
        giveHire(d.hire);
        cover!.burst(d.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DROP_SHAKE, k / Math.max(1, drops.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        giveHire(last.hire);
        cover!.blast(last.spot);
        if (cover!.isLive()) playExplosion();
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
          dropping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          for (const d of dancers)
            drawWispBetween(
              ctx,
              d.at,
              ms,
              now,
              WISP_SIZE * d.size,
              0.6,
              0,
              d.until,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
