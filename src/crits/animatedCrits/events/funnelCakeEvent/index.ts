// the "Funnel Cake" event (money; cash): it covers its crit, whose click
// freezes the screen while a river of cash drizzles out of the clicked
// floor's button and squiggles back and forth across the screen in tight
// loopy curls like funnel-cake batter, row after row, every curl a splash, a
// bloop and a jolt, harder as it goes; the last curl bursts in a huge blast
// and shake and the coins sweep into the total. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "funnelCake";
const REWARD = 4;
// ROWS sweeps across the screen, CURLS loops of CURL px on each
const ROWS = 3;
const CURLS = 6;
const CURL = 55;
const EDGE = 70;
const TOP = 200;
const STEPS_PER_CURL = 16;
const LEAD = 12;
const CURL_SHAKE: [number, number] = [0.25, 1];

export const forceFunnelCakeEvent = registerWispEvent(
  KEY,
  "Funnel Cake",
  () => CONFIG.funnelCakeEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.funnelCakeEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const rowY = (r: number) =>
      lerp([area.top + TOP, area.bottom - EDGE - 60], r / (ROWS - 1));
    const ltr0 = button.x > (left + right) / 2;
    const line: Point[] = [];
    const curlIndex: number[] = [];
    const first: Point = { x: ltr0 ? left : right, y: rowY(0) };
    for (let i = 0; i <= LEAD; i++)
      line.push({
        x: lerp([button.x, first.x], i / LEAD),
        y: lerp([button.y, first.y], i / LEAD),
      });
    for (let r = 0; r < ROWS; r++) {
      const ltr = (r % 2 === 0) === ltr0;
      const from = ltr ? left : right;
      const to = ltr ? right : left;
      const y = rowY(r);
      const steps = CURLS * STEPS_PER_CURL;
      for (let i = 1; i <= steps; i++) {
        const u = i / steps;
        // a trochoid: the centre glides across while the pen loops round
        const a = u * CURLS * Math.PI * 2;
        line.push({
          x: lerp([from, to], u) + (ltr ? 1 : -1) * Math.sin(a) * CURL,
          y: y - (1 - Math.cos(a)) * CURL * 0.8,
        });
        if (i % STEPS_PER_CURL === STEPS_PER_CURL / 2)
          curlIndex.push(line.length - 1);
      }
      if (r < ROWS - 1)
        for (let i = 1; i <= 8; i++)
          line.push({ x: to, y: lerp([y, rowY(r + 1)], i / 8) });
    }
    const along = measure(line);
    const length = along[along.length - 1];
    const curls = curlIndex.map((i) => ({
      at: line[i],
      ms: (along[i] / length) * travelMs,
    }));
    const pour: Pour = { coinsAlong: 1_400, width: 26, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );

    const curling = createBeats(
      curls,
      (c) => c.ms,
      (c, k) => {
        cover!.burst(c.at, 0.3);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(CURL_SHAKE, k / (curls.length - 1)));
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(line[line.length - 1]),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          curling.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
