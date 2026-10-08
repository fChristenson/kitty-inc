// the "Curtain" event (money): it covers its crit, whose click freezes the
// screen while a great curtain of cash drops down over it like a stage
// curtain, bouncing on its hem with a flash and a jolt, and hangs there
// rippling; then it's drawn open, the two halves sweeping aside in bunched
// folds with a whoosh and a jolt, and the cash flies up off both sides, top
// rows first, into the total-income readout in a huge blast and shake, and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "curtain";
const REWARD = 4;
// COLS × ROWS coins from SIDE of the screen's width in from its sides and
// TOP of its height down (under the total) to BOTTOM of it up from its foot
const COLS = 34;
const ROWS = 38;
const SIDE = 0.03;
const TOP = 0.16;
const BOTTOM = 0.04;
const COIN = 0.7;
// the hanging curtain ripples RIPPLE px, most at the hem; drawn open, each
// half bunches into GATHER of its width with FOLD px deep folds
const RIPPLE = 10;
const GATHER = 0.2;
const FOLD = 14;
const HEMS = 5;
const HEM_SHAKE = 1.6;
const OPEN_SHAKE = 1.3;

export const forceCurtainEvent = registerWispEvent(
  KEY,
  "Curtain",
  () => CONFIG.curtainEvent.chance,
  (floor, context, area) => {
    const { dropMs, hangMs, openMs, sweepMs, flightMs, holdMs, mergeMs } =
      CONFIG.curtainEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const mid = (area.left + area.right) / 2;
    const left = area.left + width * SIDE;
    const right = area.right - width * SIDE;
    const top = area.top + height * TOP;
    const hem = area.bottom - height * BOTTOM;
    const openAt = dropMs + hangMs;
    const sweepAt = openAt + openMs;
    const endAt = sweepAt + sweepMs + flightMs;
    const fall = hem - area.top + 40;

    // where the coin at column c, row r hangs ms in
    const hang = (c: number, r: number, ms: number, into: Point): Point => {
      const x0 = left + ((right - left) * (c + 0.5)) / COLS;
      const y0 = top + ((hem - top) * (r + 0.5)) / ROWS;
      const sway = r / ROWS;
      const drop = fall * (1 - easeOutBack(clamp01(ms / dropMs)));
      const open = smoothstep(clamp01((ms - openAt) / openMs));
      // each half gathers toward its own side
      const edge = x0 < mid ? left : right;
      const fold = Math.sin(c * 1.7) * FOLD * open;
      into.x =
        edge +
        (x0 - edge) * (1 - (1 - GATHER) * open) +
        fold +
        Math.sin(y0 * 0.03 - ms * 0.012 + c * 0.3) * RIPPLE * sway;
      into.y = y0 - drop;
      return into;
    };

    const paths: CoinPath[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const leaves =
          sweepAt + sweepMs * (r / ROWS) * (0.8 + 0.2 * Math.random());
        const at = { x: 0, y: 0 };
        let from: Point | null = null;
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < leaves) {
            hang(c, r, ms, at);
            return { x: at.x, y: at.y, scale: COIN };
          }
          from ??= { ...hang(c, r, leaves, at) };
          const total = cover?.total() ?? fallback;
          bezier(
            from,
            { x: from.x, y: total.y },
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }

    const hemming = createBeats(
      [dropMs * 0.55],
      (ms) => ms,
      () => {
        for (let i = 0; i < HEMS; i++)
          cover!.burst(
            { x: left + ((right - left) * (i + 0.5)) / HEMS, y: hem },
            0.8,
          );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HEM_SHAKE);
      },
    );
    const opening = createBeats(
      [openAt],
      (ms) => ms,
      () => {
        for (let i = 0; i < HEMS; i++)
          cover!.burst(
            { x: mid, y: top + ((hem - top) * (i + 0.5)) / HEMS },
            0.6,
          );
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(OPEN_SHAKE);
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
          hemming.tick(ms, now);
          opening.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
