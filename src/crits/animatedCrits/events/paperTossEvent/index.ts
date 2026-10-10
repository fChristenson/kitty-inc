// the "Paper Toss" event (experiment: the office paper-toss game; free
// upgrade levels): it covers its crit, whose click freezes the screen while
// a tosser wisp pops out of the clicked floor's button and lobs crumpled
// paper wisps one after another; each banks high off the side of the screen
// and drops dead into a bin at the end of an income bar: "SWISH!", a pop
// and a jolt as the bar lands free levels; ever quicker, the last shot
// dropping in for a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";
import { levelsFor } from "../../../../gameState";

const KEY = "paperToss";
const MAX_BARS = 4;
const EDGE = 50;
const BIN = 50;
const HIGH = 180;
const CALL_MS = 340;
const STYLE = { fontSize: 46, strokeWidth: 8 };
const BALL = 0.32;
const TOSSER = 0.45;
const SWISH_SHAKE: [number, number] = [0.6, 1.3];

export const forcePaperTossEvent = registerWispEvent(
  KEY,
  "Paper Toss",
  () => CONFIG.paperTossEvent.chance,
  (floor, context, area) => {
    const { tossesMs, flightMs, holdMs, mergeMs } = CONFIG.paperTossEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const swish = createCritTextSprite("SWISH!", COLOR.heavenlyGold, STYLE);
    const right = button.x < (area.left + area.right) / 2;
    const wallX = right ? area.right - EDGE : area.left + EDGE;
    let clock = 0;
    const tosses = bars.map((bar, k) => {
      const bin: Point = {
        x: right ? bar.box.x + bar.box.width + BIN : bar.box.x - BIN,
        y: bar.center.y,
      };
      // up, off the wall, and straight down into the bin
      const route: Point[] = [
        button,
        {
          x: lerp([button.x, wallX], 0.6),
          y: Math.min(button.y, bin.y) - HIGH,
        },
        { x: wallX, y: Math.min(button.y, bin.y) - HIGH * 0.6 },
        { x: bin.x, y: bin.y - 90 },
        bin,
      ];
      const leaves = clock;
      const lands = leaves + flightMs;
      clock += lerp(tossesMs, k / Math.max(1, bars.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        bin,
        wall: route[2],
        leaves,
        lands,
        banks: leaves + flightMs * 0.5,
        at: (ms: number): Point =>
          alongRoute(route, clamp01((ms - leaves) / flightMs), at),
      };
    });
    const last = tosses[tosses.length - 1];
    const endAt = last.lands;
    const tosser = (): Point => button;

    const banking = createBeats(
      tosses,
      (t) => t.banks,
      (t) => {
        cover!.burst(t.wall, 0.2);
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      tosses,
      (t) => t.lands,
      (t, k) => {
        cover!.levels(t.bar, levelsFor(t.bar.floor), t.bin);
        if (t === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(t.bin);
          return;
        }
        cover!.burst(t.bin, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SWISH_SHAKE, k / Math.max(1, tosses.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          banking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const t of tosses) {
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * BALL,
              0.8,
              t.leaves,
              t.lands,
            );
            const c = (ms - t.lands) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              swish,
              t.bin.x,
              t.bin.y - 60,
              (t === last ? 1.4 : 1) * (1 + 0.4 * (1 - clamp01(c * 3))),
            );
            ctx.globalAlpha = 1;
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              tosser,
              ms,
              now,
              WISP_SIZE * TOSSER,
              0.5,
              0,
              last.leaves,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
