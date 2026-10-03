// the "Coin Pusher" event (an experiment beyond the seven looks: the arcade
// coin pusher; cash): it covers its crit, whose click freezes the screen
// while a river of cash pours out of the clicked floor's button onto a ledge
// across the middle of the screen and a pusher wisp shoves along it, back
// and forth, ever faster; every time it reaches an end a waterfall of cash
// spills off that edge with a splash, a bloop and a jolt; on its last shove
// the whole ledge gives way, both ends gushing at once in a huge blast and
// shake as the coins sweep into the total. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "coinPusher";
const REWARD = 4;
const PUSHES = 6;
const EDGE = 50;
// each spill falls FALL px off the ledge's end
const FALL = 260;
const PUSHER = 0.6;
const SPILL_SHAKE: [number, number] = [0.5, 1.3];

export const forceCoinPusherEvent = registerWispEvent(
  KEY,
  "Coin Pusher",
  () => CONFIG.coinPusherEvent.chance,
  (floor, context, area) => {
    const { pushesMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.coinPusherEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const y = (area.top + area.bottom) / 2;
    const ends: Point[] = [
      { x: area.left + EDGE, y },
      { x: area.right - EDGE, y },
    ];
    const cx = (ends[0].x + ends[1].x) / 2;
    const feed = sampleLine(
      (u) => ({
        x: lerp([button.x, cx], u),
        y: lerp([button.y, y], u) - Math.sin(Math.PI * u) * 120,
      }),
      30,
    );
    const feedPour: Pour = { coinsAlong: 600, width: 30, streamMs, travelMs };
    const spills = ends.map((end, side) => {
      const out = side === 0 ? -1 : 1;
      return sampleLine(
        (u) => ({
          x: end.x + out * 30 * Math.sin((Math.PI / 2) * u),
          y: end.y + FALL * u * u,
        }),
        24,
      );
    });
    const spill: Pour = {
      coinsAlong: 700,
      width: 28,
      streamMs: 180,
      travelMs: 380,
    };
    const gush: Pour = {
      coinsAlong: 900,
      width: 44,
      streamMs: 400,
      travelMs: 380,
    };
    let clock = travelMs * 0.6;
    const pushes = Array.from({ length: PUSHES }, (_, k) => {
      const starts = clock;
      clock += lerp(pushesMs, k / (PUSHES - 1));
      return { starts, ends: clock, side: k % 2, final: k === PUSHES - 1 };
    });
    const last = pushes[PUSHES - 1];
    const endAt = last.ends;
    const durationMs = Math.max(
      pourDurationMs(endAt, gush),
      pourDurationMs(0, feedPour),
      endAt + holdMs + mergeMs,
    );
    const pusherAt: Point = { x: 0, y: y - 30 };
    const pusher = (ms: number): Point => {
      let p = pushes[0];
      for (const push of pushes) if (ms >= push.starts) p = push;
      const prev = p === pushes[0] ? cx : ends[1 - p.side].x;
      const u = smoothstep(clamp01((ms - p.starts) / (p.ends - p.starts)));
      pusherAt.x = ms < pushes[0].starts ? cx : lerp([prev, ends[p.side].x], u);
      return pusherAt;
    };

    const spilling = createBeats(
      pushes,
      (p) => p.ends,
      (p, k) => {
        if (p.final) {
          for (const line of spills) pourLine(cover!, line, gush);
          cover!.blast(ends[p.side]);
          return;
        }
        pourLine(cover!, spills[p.side], spill);
        cover!.burst(ends[p.side], 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPILL_SHAKE, k / (PUSHES - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => spilling.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            pusher,
            ms,
            now,
            WISP_SIZE * PUSHER,
            0.6,
            pushes[0].starts - 100,
            endAt,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, feed, feedPour);
    playBoostEventStream();
  },
);
