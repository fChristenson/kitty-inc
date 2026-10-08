// the "Slingshot" event: it covers its crit, whose click freezes the screen
// while a wisp lights up on the clicked floor's button and is drawn back
// down and away from the total-income readout as if in a slingshot, swelling
// and shaking harder as the screen rumbles; let go, it rockets off, banking
// off one wall and then the other, each bank a flash, a bang, a jolt and a
// ring of coins, and slams into the total in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { measure, pointAlong, totalSpot } from "../../cashFlow";

const KEY = "slingshot";
const REWARD = 4;
// drawn back PULL of the screen's height (or width, if less), shaking up to
// SHIVER px
const PULL = 0.32;
const SHIVER = 8;
// it banks off the walls INSET of the screen's width in from its sides, at
// these shares down the screen
const INSET = 0.04;
const BANKS = [0.42, 0.22];
// the wisp, swelling over WISP of the screen's width as it's drawn back
const WISP: [number, number] = [0.06, 0.14];
const POP_MS = 180;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.2, 1.1];
const BANK_COINS = 16;
const BANK_REACH: [number, number] = [30, 80];
const BANK_BURST = 1;
const BANK_SHAKE = 1.8;

export const forceSlingshotEvent = registerWispEvent(
  KEY,
  "Slingshot",
  () => CONFIG.slingshotEvent.chance,
  (floor, context, area) => {
    const { pullMs, flightMs, holdMs, mergeMs } = CONFIG.slingshotEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const way = Math.random() < 0.5 ? 1 : -1;
    const pull = Math.min(width, height) * PULL;
    // drawn back sideways (the button sits low) away from where it'll fly first
    const back: Point = {
      x: Math.min(
        area.right - 40,
        Math.max(area.left + 40, button.x + way * pull),
      ),
      y: Math.min(area.bottom - 30, button.y + pull * 0.3),
    };
    const banks: Point[] = BANKS.map((share, k) => ({
      x:
        (k % 2 === 0) === (way === 1)
          ? area.left + width * INSET
          : area.right - width * INSET,
      y: area.top + height * share,
    }));
    const route = [back, ...banks, fallback];
    const along = measure(route);
    const length = along[along.length - 1];
    const bankAt = banks.map(
      (_, k) => pullMs + (flightMs * along[k + 1]) / length,
    );
    const inAt = pullMs + flightMs;
    const into = { x: 0, y: 0 };
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= inAt) return null;
      if (ms < pullMs) {
        const u = easeOutCubic(ms / pullMs);
        const t = ms / pullMs;
        into.x =
          button.x + (back.x - button.x) * u + Math.sin(ms * 0.9) * SHIVER * t;
        into.y =
          button.y + (back.y - button.y) * u + Math.sin(ms * 1.3) * SHIVER * t;
        return into;
      }
      route[route.length - 1] = cover?.total() ?? fallback;
      return pointAlong(route, along, (ms - pullMs) / flightMs, into);
    };

    let lastRumble = -Infinity;
    const release = createBeats(
      [pullMs],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const banking = createBeats(
      bankAt,
      (ms) => ms,
      (_, k) => {
        const at = banks[k];
        cover!.burst(at, BANK_BURST);
        cover!.launchFrom(at, ringTargets(at, BANK_COINS, BANK_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BANK_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          release.tick(ms, now);
          banking.tick(ms, now);
          finale.tick(ms, now);
          if (ms < pullMs && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, ms / pullMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          const charge = clamp01(ms / pullMs);
          const size =
            Math.max(WISP_SIZE, width * lerp(WISP, charge)) *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(ctx, wispAt, ms, now, size, charge, 0, inAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
