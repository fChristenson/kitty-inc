// the "Bumblebee" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while a plump bee wisp buzzes out of the clicked
// floor's button in a jittery, looping figure-of-eight flight to each empty
// spot, wobbles over it a moment, then darts down: a flash, a buzz and a
// jolt as a new worker forms there; each flight quicker than the last, the
// last hire landing in a big blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "bumblebee";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
// it hovers HOVER px over each spot for HOVER_MS, wobbling WOBBLE px
const HOVER = 110;
const HOVER_MS = 120;
const WOBBLE = 9;
const DART_MS = 90;
// the figure-of-eight loops EIGHT px out; JITTER px of buzzing all the way
const EIGHT = 90;
const JITTER = 5;
const BEE = 0.55;
const HIT_SHAKE: [number, number] = [0.5, 1.2];

export const forceBumblebeeEvent = registerWispEvent(
  KEY,
  "Bumblebee",
  () => CONFIG.bumblebeeEvent.chance,
  (floor, context) => {
    const { flightsMs, holdMs, mergeMs } = CONFIG.bumblebeeEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const visits = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const hover: Point = { x: spot.x, y: spot.y - HOVER };
      const a = from;
      const dx = hover.x - a.x;
      const dy = hover.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const leaves = clock;
      const arrives =
        leaves + lerp(flightsMs, k / Math.max(1, hires.length - 1));
      const darts = arrives + HOVER_MS;
      const hits = darts + DART_MS;
      clock = hits;
      from = spot;
      return {
        hire,
        spot,
        leaves,
        hits,
        at: (ms: number, into: Point): Point => {
          if (ms < arrives) {
            const u = clamp01((ms - leaves) / (arrives - leaves));
            const e = smoothstep(u);
            const env = Math.sin(Math.PI * u);
            const side = EIGHT * Math.sin(Math.PI * 2 * u) * env;
            const along = EIGHT * 0.5 * Math.sin(Math.PI * 4 * u) * env;
            into.x =
              a.x + dx * e - (dy / length) * side + (dx / length) * along;
            into.y =
              a.y + dy * e + (dx / length) * side + (dy / length) * along;
          } else if (ms < darts) {
            const w = (ms - arrives) / HOVER_MS;
            into.x = hover.x + Math.sin(w * Math.PI * 6) * WOBBLE;
            into.y = hover.y + Math.sin(w * Math.PI * 4) * WOBBLE * 0.5;
          } else {
            const e = easeIn(clamp01((ms - darts) / DART_MS));
            into.x = hover.x;
            into.y = lerp([hover.y, spot.y], e);
          }
          into.x += Math.sin(ms * 0.11 + k) * JITTER;
          into.y += Math.cos(ms * 0.13 + k) * JITTER;
          return into;
        },
      };
    });
    const last = visits[visits.length - 1];
    const endAt = last.hits;
    const into: Point = { x: 0, y: 0 };
    const bee = (ms: number): Point => {
      const t = Math.max(0, ms);
      let v = visits[0];
      for (const visit of visits) if (t >= visit.leaves) v = visit;
      return v.at(Math.min(t, endAt), into);
    };

    const hitting = createBeats(
      visits,
      (v) => v.hits,
      (v, k) => {
        giveHire(v.hire);
        if (v === last) {
          cover!.blast(v.spot);
          return;
        }
        cover!.burst(v.spot, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, visits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms <= endAt)
            drawWispBetween(ctx, bee, ms, now, WISP_SIZE * BEE, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
