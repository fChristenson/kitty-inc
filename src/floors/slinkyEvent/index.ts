// the "Slinky" event: it covers its crit, whose click freezes the screen
// while a river of cash springs out of the clicked floor's button and coils
// its way over the screen into the total-income readout in loop after loop,
// like a slinky tumbling, every loop a flash and a jolt; when the last of the
// cash lands, the total goes off in a huge blast and shake. Pays floor income
// × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pointAlong,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "slinky";
const REWARD = 4;
// LOOPS coils, each LOOP of the screen's width across, along an arc bowed
// out BOW of its width to one side
const LOOPS = 6;
const LOOP = 0.075;
const BOW = 0.38;
const LOOP_BURST: [number, number] = [0.4, 0.9];
const LOOP_SHAKE: [number, number] = [0.6, 1.6];

export const forceSlinkyEvent = registerWispEvent(
  KEY,
  "Slinky",
  () => CONFIG.slinkyEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.slinkyEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const way = button.x > (area.left + area.right) / 2 ? -1 : 1;
    const bend = {
      x: (button.x + total.x) / 2 + way * width * BOW,
      y: (button.y + total.y) / 2,
    };
    const spine = (u: number) => bezier(button, bend, total, u, { x: 0, y: 0 });
    const r = width * LOOP;
    // a coil turning round the arc, fading in and out at its ends
    const line = sampleLine((u) => {
      const at = spine(u);
      const ahead = spine(Math.min(1, u + 0.001));
      const behind = spine(Math.max(0, u - 0.001));
      const len = Math.hypot(ahead.x - behind.x, ahead.y - behind.y) || 1;
      const tx = (ahead.x - behind.x) / len;
      const ty = (ahead.y - behind.y) / len;
      const a = Math.PI * 2 * LOOPS * u;
      const fade = Math.sqrt(Math.sin(Math.PI * u));
      const along = -Math.sin(a) * r * fade;
      const across = (1 - Math.cos(a)) * r * fade * way;
      at.x += tx * along - ty * across;
      at.y += ty * along + tx * across;
      return at;
    }, 360);
    const middle = sampleLine(spine, 40);
    const spineAlong = measure(middle);
    const along = measure(line);
    const length = along[along.length - 1];
    // each loop's top, when the head swings over it
    const loops = Array.from({ length: LOOPS }, (_, k) => {
      const i = Math.round((360 * (k + 0.5)) / LOOPS);
      return { u: (k + 0.5) / LOOPS, at: (travelMs * along[i]) / length };
    });
    const pour: Pour = { coinsAlong: 1_700, width: 24, streamMs, travelMs };
    const endAt = streamMs + travelMs;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      endAt + holdMs + mergeMs,
    );

    const coiling = createBeats(
      loops,
      (l) => l.at,
      (l, k) => {
        const t = k / (LOOPS - 1);
        cover!.burst(
          pointAlong(middle, spineAlong, l.u, { x: 0, y: 0 }),
          lerp(LOOP_BURST, t),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LOOP_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          coiling.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
