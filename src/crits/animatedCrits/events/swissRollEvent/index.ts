// the "Swiss Roll" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while the clicked floor's
// button spreads a sheet of cash over the whole screen; then its bottom
// edge curls over and rolls up the screen like a Swiss roll, ever faster,
// swallowing the sheet into a fat spinning log of cash, and every income
// bar it rolls over jolts with a whump and free levels; at the top the
// whole roll is flung up into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "swissRoll";
const REWARD = 3;
const MAX_BARS = 5;
const COINS = 1_300;
const COIN = 0.5;
const DEPTH = 0.25;
// the roll grows from CORE to CORE + FAT px round as it gathers the sheet
const CORE = 14;
const FAT = 70;
const EDGE = 20;
const SURGE_SPREAD = 260;
const LIFT = 60;
const BAR_SHAKE: [number, number] = [0.6, 1.3];

export const forceSwissRollEvent = registerWispEvent(
  KEY,
  "Swiss Roll",
  () => CONFIG.swissRollEvent.chance,
  (floor, context, area) => {
    const { layMs, rollMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.swissRollEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const top = area.top + EDGE;
    const bottom = area.bottom - EDGE;
    const span = bottom - top;
    // the front of the roll, rising ever faster
    const frontAt = (ms: number) =>
      bottom - span * easeIn(clamp01((ms - layMs) / rollMs));
    const radiusAt = (front: number) =>
      CORE + FAT * Math.sqrt((bottom - front) / span);
    const passesAt = (y: number) =>
      layMs + rollMs * Math.sqrt(clamp01((bottom - y) / span));
    const doneAt = layMs + rollMs;
    const endAt = doneAt + SURGE_SPREAD + flightMs;
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context)
          .filter((b) => b.center.y > top && b.center.y < bottom)
          .slice(0, MAX_BARS)
      : [];

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const sheet: Point = {
        x:
          area.left +
          EDGE +
          Math.random() * (area.right - area.left - EDGE * 2),
        y: top + Math.random() * span,
      };
      const laid = Math.random() * layMs * 0.7;
      const rolled = passesAt(sheet.y);
      const depth = Math.sqrt(Math.random());
      const phase = Math.random() * Math.PI * 2;
      const leaves = doneAt + Math.random() * SURGE_SPREAD;
      const flungFrom: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const inRoll = (ms: number, into: Point) => {
        const front = frontAt(ms);
        const r = radiusAt(front) * depth;
        const angle = phase - (bottom - front) / (CORE + FAT * 0.5);
        into.x = sheet.x;
        into.y = front + Math.cos(angle) * r;
        return Math.sin(angle);
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < laid) return { x: button.x, y: button.y, scale: 0 };
        if (ms < rolled) {
          const u = easeOut(clamp01((ms - laid) / (layMs * 0.3)));
          return {
            x: lerp([button.x, sheet.x], u),
            y: lerp([button.y, sheet.y], u),
            scale: COIN,
          };
        }
        if (ms < leaves) {
          const d = inRoll(ms, at);
          return { x: at.x, y: at.y, scale: COIN * (1 + DEPTH * d) };
        }
        inRoll(doneAt, flungFrom);
        lift.x = flungFrom.x;
        lift.y = flungFrom.y - LIFT;
        const total = cover?.total() ?? fallback;
        bezier(
          flungFrom,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const rolling = createBeats(
      bars.map((bar) => ({ bar, at: passesAt(bar.center.y) })),
      (r) => r.at,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 2), {
          x: r.bar.center.x,
          y: r.bar.center.y + 60,
        });
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BAR_SHAKE, k / Math.max(1, bars.length - 1)));
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
        bars,
        tick: (ms, now) => {
          rolling.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
