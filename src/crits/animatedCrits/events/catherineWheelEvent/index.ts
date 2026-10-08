// the "Catherine Wheel" event (money; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button spins up like a
// firework wheel, four jets of cash gushing out of it and curling into
// spiral arms of cash across the screen as it whirls ever faster, every
// half turn a whoosh, a flash and a jolt; then it stops dead with a bang and
// the whole spiral of cash pours up into the total, which goes off in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "catherineWheel";
const REWARD = 4;
const JETS = 4;
const COINS = 1_800;
const COIN = 0.7;
// each coin flies out at SPEED px/ms
const SPEED = 0.85;
const SPREAD = 0.03;
const TURN_SHAKE: [number, number] = [0.5, 1.4];
const TURN_BURST: [number, number] = [0.4, 0.8];

export const forceCatherineWheelEvent = registerWispEvent(
  KEY,
  "Catherine Wheel",
  () => CONFIG.catherineWheelEvent.chance,
  (floor, context, area) => {
    const { spinMs, spinRate, outMs, flightMs, holdMs, mergeMs } =
      CONFIG.catherineWheelEvent;
    const fallback = totalSpot(area);
    const hub = getButtonCenter(context.isGroundFloor);
    const [w0, w1] = spinRate;
    const turned = (ms: number) =>
      w0 * ms + ((w1 - w0) * ms * ms) / (2 * spinMs);
    // every half turn of the wheel
    const halves: number[] = [];
    for (let ms = 0, next = Math.PI; ms < spinMs; ms += 4)
      if (turned(ms) >= next) {
        halves.push(ms);
        next += Math.PI;
      }
    const stopAt = spinMs;
    const endAt = stopAt + outMs + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const leaves = (i / COINS) * spinMs;
      const angle =
        turned(leaves) +
        ((i % JETS) / JETS) * Math.PI * 2 +
        (Math.random() - 0.5) * SPREAD * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const speed = SPEED * (0.9 + 0.1 * Math.random());
      // out along its arm, then curling on into the total
      const sweeps = leaves + outMs;
      const from: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: hub.x, y: hub.y, scale: 0 };
        const r = speed * (Math.min(ms, sweeps) - leaves);
        from.x = hub.x + dx * r;
        from.y = hub.y + dy * r;
        if (ms < sweeps) return { x: from.x, y: from.y, scale: COIN };
        const total = cover?.total() ?? fallback;
        lift.x = from.x;
        lift.y = total.y;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - sweeps) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const turning = createBeats(
      halves,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, halves.length - 1);
        cover!.burst(hub, lerp(TURN_BURST, t));
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(TURN_SHAKE, t));
      },
    );
    const stopping = createBeats(
      [stopAt],
      (ms) => ms,
      () => {
        cover!.burst(hub, 1.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          stopping.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
