// the "Foundry" event (money; cash): it covers its crit, whose click freezes
// the screen while molten cash pours down a sprue from the top of the screen
// and floods out sideways into a casting mold, channel after channel
// branching off both ways at once like a fishbone; every channel that
// fills to its tip flares with a bloop and a jolt; the last, deepest one
// bursts in a huge blast and shake and the coins sweep into the total.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "foundry";
const REWARD = 4;
const CHANNELS = 4;
const STEPS = 30;
const EDGE = 40;
const TOP = 150;
// the molten front runs SPEED px a ms down every channel at once
const SPEED = 1.1;
const TIP_SHAKE: [number, number] = [0.4, 1.2];

export const forceFoundryEvent = registerWispEvent(
  KEY,
  "Foundry",
  () => CONFIG.foundryEvent.chance,
  (floor, context, area) => {
    const { streamMs, holdMs, mergeMs } = CONFIG.foundryEvent;
    const cx = (area.left + area.right) / 2;
    const sprue: Point = { x: cx, y: area.top + TOP };
    const channels = Array.from({ length: CHANNELS * 2 }, (_, i) => {
      const level = Math.floor(i / 2);
      const y = lerp(
        [sprue.y + 120, area.bottom - EDGE],
        level / (CHANNELS - 1),
      );
      const tip: Point = {
        x: i % 2 === 0 ? area.left + EDGE : area.right - EDGE,
        y,
      };
      const line: Point[] = [];
      for (let s = 0; s <= STEPS; s++)
        line.push({ x: cx, y: lerp([sprue.y, y], s / STEPS) });
      for (let s = 1; s <= STEPS; s++)
        line.push({ x: lerp([cx, tip.x], s / STEPS), y });
      const along = measure(line);
      const travelMs = along[along.length - 1] / SPEED;
      const pour: Pour = { coinsAlong: 260, width: 26, streamMs, travelMs };
      return { tip, line, pour, fills: travelMs };
    });
    const last = channels.reduce((a, b) => (b.fills > a.fills ? b : a));
    const durationMs = Math.max(
      ...channels.map((c) => pourDurationMs(0, c.pour)),
      last.fills + holdMs + mergeMs,
    );

    const filling = createBeats(
      channels,
      (c) => c.fills,
      (c, k) => {
        if (c === last) {
          cover!.blast(c.tip);
          return;
        }
        cover!.burst(c.tip, 0.45);
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(TIP_SHAKE, k / (channels.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => filling.tick(ms, now),
      },
    );
    if (!cover) return;
    for (const c of channels) pourLine(cover, c.line, c.pour);
    playBoostEventStream();
  },
);
