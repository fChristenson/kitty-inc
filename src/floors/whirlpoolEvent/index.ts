// the "Whirlpool" event (money; free upgrade levels, a crit tier and cash):
// it covers its crit, whose click freezes the screen while four rivers of
// cash pour in off the screen's edges and spiral round the clicked floor's
// income bar into a giant whirlpool, its arms wheeling round ever faster as
// the screen rumbles; the bar gulps the cash down in great swallows, each a
// bloop and a jolt with free levels, and the last swallow drains it dry: the
// bar jumps a crit tier in a huge blast and shake. Pays floor income × floor
// number × REWARD, plus the levels and tier
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "whirlpool";
const REWARD = 2;
const ARMS = 4;
const COINS = 1_600;
const COIN = 0.6;
// each coin winds TURNS times round on its way in; the arms wheel SPIN
// turns a second
const TURNS = 1.4;
const SPIN = 0.5;
const SPREAD = 0.06;
const GULPS = 4;
const RUMBLE_MS = 80;
const GULP_SHAKE: [number, number] = [0.8, 1.5];

export const forceWhirlpoolEvent = registerWispEvent(
  KEY,
  "Whirlpool",
  () => CONFIG.whirlpoolEvent.chance,
  (floor, context, area) => {
    const { streamMs, spiralMs, levelShare, holdMs, mergeMs } =
      CONFIG.whirlpoolEvent;
    const own = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!own) return;
    const eye = own.center;
    const reach =
      40 +
      Math.max(
        Math.hypot(area.left - eye.x, area.top - eye.y),
        Math.hypot(area.right - eye.x, area.top - eye.y),
        Math.hypot(area.left - eye.x, area.bottom - eye.y),
        Math.hypot(area.right - eye.x, area.bottom - eye.y),
      );
    const dir = Math.random() < 0.5 ? 1 : -1;
    const start = Math.random() * Math.PI * 2;
    const endAt = streamMs + spiralMs;
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const arm = i % ARMS;
      const leaves = Math.random() * streamMs;
      // the arm's mouth wheels round with the time the coin sets off
      const mouth =
        start +
        (arm / ARMS) * Math.PI * 2 +
        dir * Math.PI * 2 * SPIN * (leaves / 1000) +
        (Math.random() * 2 - 1) * SPREAD;
      const wide = 1 + (Math.random() * 2 - 1) * SPREAD;
      return (f) => {
        const u = (f * endAt - leaves) / spiralMs;
        if (u <= 0) return { x: eye.x, y: eye.y, scale: 0 };
        if (u >= 1) return { x: eye.x, y: eye.y, scale: 0 };
        const r = reach * wide * (1 - u) ** 1.3;
        const a = mouth + dir * Math.PI * 2 * TURNS * u * u;
        return {
          x: eye.x + Math.cos(a) * r,
          y: eye.y + Math.sin(a) * r,
          scale: COIN * (0.6 + 0.4 * (1 - u)),
        };
      };
    });
    const gulps = Array.from(
      { length: GULPS },
      (_, k) => spiralMs + ((endAt - spiralMs) * (k + 1)) / GULPS,
    );

    let lastRumble = -Infinity;
    const gulping = createBeats(
      gulps,
      (ms) => ms,
      (_, k) => {
        cover!.levels(own, levelsFor(own.floor, levelShare, 2));
        if (k === GULPS - 1) {
          cover!.tierUp(own);
          cover!.slam(own);
          cover!.blast(eye);
          return;
        }
        cover!.burst(eye, 0.6 + 0.3 * k);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(GULP_SHAKE, k / (GULPS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars: [own],
        tick: (ms, now) => {
          gulping.tick(ms, now);
          if (ms < endAt && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(lerp([0.3, 1], clamp01(ms / endAt)));
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
