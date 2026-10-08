// the "Darts" event (experiment: a darts match; crit tiers): it covers its
// crit, whose click freezes the screen while a dartboard of glowing rings
// lights up in the middle of the screen and a thrower wisp flies out of the
// clicked floor's button below it; it throws dart after dart, each thunking
// into the board with a flash, a jolt and its score slamming up ("20",
// "TRIPLE 20"), and a beam leaping from the dart to an income bar, which
// jumps a crit tier; the last dart hits the bullseye: "BULLSEYE!" in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "darts";
const MAX_BARS = 3;
const TOP = 300;
// the board's rings, SIDES beams round each
const RINGS = [36, 84, 132];
const SIDES = 16;
const RING_WIDTH = 8;
const BOARD_MS = 220;
const THROWER_DROP = 260;
const LOFT = 80;
const LINK_MS = 180;
const LINK_WIDTH = 16;
const CALL_MS = 420;
const STYLE = { fontSize: 50, strokeWidth: 8 };
const DART = 0.3;
const THROWER = 0.5;
const HIT_SHAKE: [number, number] = [0.7, 1.3];

export const forceDartsEvent = registerWispEvent(
  KEY,
  "Darts",
  () => CONFIG.dartsEvent.chance,
  (floor, context, area) => {
    const { throwsMs, flightMs, holdMs, mergeMs } = CONFIG.dartsEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const board: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    const thrower: Point = { x: board.x, y: board.y + THROWER_DROP };
    const rings = RINGS.map((r) =>
      Array.from({ length: SIDES + 1 }, (_, i): Point => {
        const a = (i / SIDES) * Math.PI * 2;
        return { x: board.x + Math.cos(a) * r, y: board.y + Math.sin(a) * r };
      }),
    );
    const scores = ["20", "TRIPLE 20", "BULLSEYE!"];
    let clock: number = BOARD_MS;
    const darts = bars.map((bar, k) => {
      const final = k === bars.length - 1;
      // outer ring, inner ring, then dead centre
      const r = final ? 0 : RINGS[Math.max(0, 1 - k)] - 10;
      const a = -Math.PI / 2 + (k - 0.5) * 0.9;
      const to: Point = {
        x: board.x + Math.cos(a) * r,
        y: board.y + Math.sin(a) * r,
      };
      const throws = clock;
      clock += lerp(throwsMs, k / Math.max(1, bars.length - 1));
      const ctrl: Point = {
        x: (thrower.x + to.x) / 2,
        y: Math.min(thrower.y, to.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        to,
        throws,
        hits: throws + flightMs,
        final,
        sprite: createCritTextSprite(
          final ? scores[2] : scores[Math.min(k, 1)],
          COLOR.heavenlyGold,
          STYLE,
        ),
        at: (ms: number): Point =>
          bezier(thrower, ctrl, to, clamp01((ms - throws) / flightMs), at),
      };
    });
    const last = darts[darts.length - 1];
    const endAt = last.hits;
    const throwerAt: Point = { x: 0, y: 0 };
    const throwerPath = (ms: number): Point => {
      const u = easeOut(clamp01(ms / BOARD_MS));
      throwerAt.x = lerp([button.x, thrower.x], u);
      throwerAt.y = lerp([button.y, thrower.y], u);
      return throwerAt;
    };
    // where each dart stays stuck once it's hit
    const stuck = darts.map((d) => (): Point => d.to);

    const throwing = createBeats(
      darts,
      (d) => d.throws,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      darts,
      (d) => d.hits,
      (d, k) => {
        cover!.tierUp(d.bar, d.to);
        if (d.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.to);
          return;
        }
        cover!.burst(d.to, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, darts.length - 1)));
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
          throwing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          const show =
            clamp01(ms / BOARD_MS) * (1 - clamp01((ms - endAt) / CALL_MS));
          for (const ring of rings)
            for (let i = 1; i <= SIDES; i++)
              drawBeam(ctx, ring[i - 1], ring[i], RING_WIDTH, show * 0.7);
          for (let k = 0; k < darts.length; k++) {
            const d = darts[k];
            const t = (ms - d.hits) / LINK_MS;
            if (t >= 0 && t < 1) {
              drawBeam(ctx, d.to, d.bar.center, LINK_WIDTH * (1 - t), 1 - t);
              drawBeamFlare(ctx, d.to, 30, 1 - t, now);
            }
            const c = (ms - d.hits) / CALL_MS;
            if (c >= 0 && c < 1) {
              ctx.globalAlpha = 1 - c * c;
              drawCritTextSprite(
                ctx,
                d.sprite,
                board.x,
                board.y - RINGS[2] - 40,
                (d.final ? 1.4 : 1) * (1 + 0.4 * (1 - clamp01(c * 3))),
              );
              ctx.globalAlpha = 1;
            }
            if (ms < d.hits)
              drawWispBetween(
                ctx,
                d.at,
                ms,
                now,
                WISP_SIZE * DART,
                1,
                d.throws,
                d.hits,
              );
            else
              drawWispBetween(
                ctx,
                stuck[k],
                ms,
                now,
                WISP_SIZE * DART,
                0.4,
                d.hits,
                endAt,
              );
          }
          drawWispBetween(
            ctx,
            throwerPath,
            ms,
            now,
            WISP_SIZE * THROWER,
            0.5,
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
