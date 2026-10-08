// the "Arc Weld" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while two electrode wisps fly out of the clicked
// floor's button to either end of an income bar, and an arc of lightning
// crackles up between them; they weld their way along the bar toward each
// other, the arc spitting and blazing ever shorter and brighter, until they
// meet in the middle with a blinding flash, a bang and a big jolt as the bar
// jumps a crit tier; then on to the next bar, ever faster, the last weld
// ending in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "arcWeld";
const MAX_BARS = 3;
const MOVE_MS = 180;
const ELECTRODE = 0.4;
const RUMBLE_MS = 80;
const HIT_SHAKE: [number, number] = [0.9, 1.5];

export const forceArcWeldEvent = registerWispEvent(
  KEY,
  "Arc Weld",
  () => CONFIG.arcWeldEvent.chance,
  (floor, context) => {
    const { weldsMs, holdMs, mergeMs } = CONFIG.arcWeldEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let fromL: Point = button;
    let fromR: Point = button;
    const welds = bars.map((bar, k) => {
      const left: Point = { x: bar.box.x, y: bar.center.y };
      const right: Point = { x: bar.box.x + bar.box.width, y: bar.center.y };
      const moves = clock;
      const starts = moves + MOVE_MS;
      const meets = starts + lerp(weldsMs, k / Math.max(1, bars.length - 1));
      clock = meets;
      const weld = { bar, left, right, fromL, fromR, moves, starts, meets };
      fromL = bar.center;
      fromR = bar.center;
      return weld;
    });
    const last = welds[welds.length - 1];
    const endAt = last.meets;
    const weldAt = (ms: number) => {
      let w = welds[0];
      for (const weld of welds) if (ms >= weld.moves) w = weld;
      return w;
    };
    const electrode = (side: 1 | -1) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const w = weldAt(ms);
        const end = side < 0 ? w.left : w.right;
        if (ms < w.starts) {
          const from = side < 0 ? w.fromL : w.fromR;
          const u = easeOut(clamp01((ms - w.moves) / MOVE_MS));
          at.x = lerp([from.x, end.x], u);
          at.y = lerp([from.y, end.y], u);
          return at;
        }
        const u = easeIn(clamp01((ms - w.starts) / (w.meets - w.starts)));
        at.x = lerp([end.x, w.bar.center.x], u);
        at.y = end.y + Math.sin(ms / 23 + side) * 3;
        return at;
      };
    };
    const leftAt = electrode(-1);
    const rightAt = electrode(1);
    // the arc's ends, moved with the electrodes each frame
    const arcL: Point = { x: 0, y: 0 };
    const arcR: Point = { x: 0, y: 0 };
    const arc = createBolt(arcL, arcR, 2);
    let lastRumble = -Infinity;

    const meeting = createBeats(
      welds,
      (w) => w.meets,
      (w, k) => {
        cover!.tierUp(w.bar, w.left);
        if (w === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(w.bar.center);
          return;
        }
        cover!.burst(w.bar.center, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, welds.length - 1)));
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
          meeting.tick(ms, now);
          const w = weldAt(ms);
          if (
            ms >= w.starts &&
            ms < w.meets &&
            now - lastRumble > RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(0.3);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const w = weldAt(ms);
          if (ms >= w.starts) {
            const l = leftAt(ms);
            arcL.x = l.x;
            arcL.y = l.y;
            const r = rightAt(ms);
            arcR.x = r.x;
            arcR.y = r.y;
            const u = clamp01((ms - w.starts) / (w.meets - w.starts));
            drawBolt(ctx, arc, 1, 0.7 + 0.6 * u);
            drawStrike(ctx, arcL, 0.8, 0.6 + 0.5 * u, now);
            drawStrike(ctx, arcR, 0.8, 0.6 + 0.5 * u, now);
          }
          drawWispBetween(
            ctx,
            leftAt,
            ms,
            now,
            WISP_SIZE * ELECTRODE,
            1,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            rightAt,
            ms,
            now,
            WISP_SIZE * ELECTRODE,
            1,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
