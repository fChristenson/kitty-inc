// the "Rewind" event (experiment: the cash plays backwards; cash): it
// covers its crit, whose click freezes the screen while a river of cash
// bursts out of the total-income readout and runs backwards down its arc
// into the clicked floor's button, ever faster like a tape on rewind, with
// a rising whir; the button swallows it all and swells into a blazing wisp
// as the screen rumbles; then it hits play: the cash blasts back out at
// double speed, a roaring river up the same arc into the total in a huge
// blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "rewind";
const REWARD = 4;
const COINS = 900;
const COIN = 0.5;
// the arc bows LOFT px sideways, each coin up to SPREAD px off it
const LOFT = 220;
const SPREAD = 50;
const GLOW: [number, number] = [0.6, 1.6];
const RUMBLE = 0.5;

export const forceRewindEvent = registerWispEvent(
  KEY,
  "Rewind",
  () => CONFIG.rewindEvent.chance,
  (floor, context, area) => {
    const { rewindMs, pauseMs, playMs, spreadMs, holdMs, mergeMs } =
      CONFIG.rewindEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const playAt = rewindMs + pauseMs;
    const endAt = playAt + spreadMs + playMs;
    const start = fallback;
    const side = button.x < (area.left + area.right) / 2 ? 1 : -1;

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const off = (Math.random() - 0.5) * 2 * SPREAD;
      const lag = Math.random();
      const ctrl: Point = {
        x: (button.x + start.x) / 2 + side * LOFT + off,
        y: (button.y + start.y) / 2 + off,
      };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < playAt) {
          // back down the arc from the total to the button, the coins
          // strung out along it
          const back = easeIn(clamp01(ms / rewindMs));
          const u = 1 - clamp01(back * 1.6 - lag * 0.6);
          if (u <= 0) return { x: button.x, y: button.y, scale: 0 };
          bezier(button, ctrl, start, u, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        const leaves = playAt + lag * spreadMs;
        if (ms < leaves) return { x: button.x, y: button.y, scale: 0 };
        const total = cover?.total() ?? fallback;
        bezier(
          button,
          ctrl,
          total,
          easeIn(clamp01((ms - leaves) / playMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const swell = (ms: number) =>
      ms < rewindMs ? null : ms < playAt + 120 ? button : null;
    const glow = (ms: number) =>
      WISP_SIZE * lerp(GLOW, clamp01((ms - rewindMs) / pauseMs));

    const beats = createBeats(
      [rewindMs, playAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 2) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        cover!.burst(button, k === 0 ? 0.4 : 0.8);
        if (!cover!.isLive()) return;
        if (k === 0) shakeScreen(RUMBLE);
        else {
          playExplosion();
          shakeScreen(1.4);
        }
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < rewindMs || ms > playAt + 120) return;
          drawWispBetween(
            ctx,
            swell,
            ms,
            now,
            glow(ms),
            1,
            rewindMs,
            playAt + 120,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playSwoosh();
    playBoostEventStream();
  },
);
