// the "Hula Hoop" event (wisp; worker perma tiers): it covers its crit,
// whose click freezes the screen while a hoop of wisps drops out of the
// sky over a worker in view and whirls round its waist, wobbling up and
// down, faster and faster until it flicks off with a pop and a jolt that
// lights the worker up a perma tier; it sails over onto the next worker
// and does it again, quicker each time; the last spin flings it off in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeIn, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardWorkers } from "../eventRewards";

const KEY = "hulaHoop";
const MAX_WORKERS = 5;
const BEADS = 8;
// the hoop is RX by RY px, whirling LAPS laps per worker; it wobbles
// WOBBLE px and sails HOP px over between workers
const RX = 36;
const RY = 11;
const LAPS = 4;
const WOBBLE = 8;
const HOP = 90;
const SKY = 60;
const BEAD = 0.28;
const SPIN_SHAKE: [number, number] = [0.6, 1.3];

export const forceHulaHoopEvent = registerWispEvent(
  KEY,
  "Hula Hoop",
  () => CONFIG.hulaHoopEvent.chance,
  (floor, context, area) => {
    const { dropMs, spinsMs, hopMs, holdMs, mergeMs } = CONFIG.hulaHoopEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    let clock: number = dropMs;
    const stops = workers.map((worker, k) => {
      const arrives = clock;
      const spin = lerp(spinsMs, k / Math.max(1, workers.length - 1));
      const leaves = arrives + spin;
      clock = leaves + (k < workers.length - 1 ? hopMs : 0);
      return { worker, arrives, leaves, spin };
    });
    const endAt = stops[stops.length - 1].leaves;
    const sky: Point = { x: workers[0].at.x, y: area.top - SKY };
    // the hoop's middle and how far round it has whirled
    const middle: Point = { x: 0, y: 0 };
    const hoopAt = (ms: number): number => {
      if (ms < dropMs) {
        const u = easeIn(ms / dropMs);
        middle.x = sky.x;
        middle.y = lerp([sky.y, workers[0].at.y], u);
        return 0;
      }
      let k = 0;
      while (k < stops.length - 1 && ms >= stops[k + 1].arrives) k++;
      const s = stops[k];
      if (ms <= s.leaves || k === stops.length - 1) {
        const u = Math.min(1, (ms - s.arrives) / s.spin);
        middle.x = s.worker.at.x;
        middle.y = s.worker.at.y + Math.sin(u * LAPS * Math.PI * 2) * WOBBLE;
        return (k + u * u) * LAPS * Math.PI * 2;
      }
      const next = stops[k + 1];
      const u = smoothstep((ms - s.leaves) / hopMs);
      middle.x = lerp([s.worker.at.x, next.worker.at.x], u);
      middle.y =
        lerp([s.worker.at.y, next.worker.at.y], u) -
        Math.sin(Math.PI * u) * HOP;
      return (k + 1) * LAPS * Math.PI * 2 + u * Math.PI;
    };
    const beads = Array.from({ length: BEADS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        const a = hoopAt(ms) + (i / BEADS) * Math.PI * 2;
        at.x = middle.x + Math.cos(a) * RX;
        at.y = middle.y + Math.sin(a) * RY;
        return at;
      };
    });

    const flicking = createBeats(
      stops,
      (s) => s.leaves,
      (s, k) => {
        cover!.promote(s.worker);
        if (k === stops.length - 1) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        playSwoosh();
        shakeScreen(lerp(SPIN_SHAKE, k / Math.max(1, stops.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => flicking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          for (const bead of beads)
            drawWispBetween(
              ctx,
              bead,
              ms,
              now,
              WISP_SIZE * BEAD,
              0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
