// the "Dunk Tank" event (experiment: the fairground dunk tank; crit tiers):
// it covers its crit, whose click freezes the screen while a dunkee wisp
// perches on a seat of light above an income bar, a target wisp glowing
// beside it, and a pitcher wisp winds up at the clicked floor's button; it
// hurls a ball, smack into the target: "DUNK!", the seat drops and the
// dunkee plunges into the bar in a splash of light, a bang and a jolt, the
// bar jumping a crit tier; then the next bar's dunkee climbs up, each pitch
// faster, the last dunk in a huge blast and shake. Then the crit's tier
// pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "dunkTank";
const MAX_BARS = 3;
// the seat SEAT px above the bar, SEAT_W across; the target TARGET px aside
const SEAT = 110;
const SEAT_W = 60;
const TARGET = 110;
const UP_MS = 200;
const LOFT = 120;
const PLUNGE_MS = 150;
const SPLASH_MS = 260;
const CALL_MS = 380;
const STYLE = { fontSize: 50, strokeWidth: 8 };
const DUNKEE = 0.5;
const BALL = 0.32;
const TARGET_SIZE = 0.38;
const PITCHER = 0.45;
const DUNK_SHAKE: [number, number] = [0.9, 1.4];

export const forceDunkTankEvent = registerWispEvent(
  KEY,
  "Dunk Tank",
  () => CONFIG.dunkTankEvent.chance,
  (floor, context) => {
    const { pitchesMs, flightMs, holdMs, mergeMs } = CONFIG.dunkTankEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const dunk = createCritTextSprite("DUNK!", COLOR.heavenlyGold, STYLE);
    let clock = 0;
    const dunks = bars.map((bar, k) => {
      const seat: Point = { x: bar.center.x, y: bar.center.y - SEAT };
      const side = button.x < bar.center.x ? -1 : 1;
      const target: Point = { x: seat.x + side * TARGET, y: seat.y };
      const appears = clock;
      const throws = appears + UP_MS;
      const hits = throws + flightMs;
      const lands = hits + PLUNGE_MS;
      clock = hits + lerp(pitchesMs, k / Math.max(1, bars.length - 1)) - UP_MS;
      const ctrl: Point = {
        x: (button.x + target.x) / 2,
        y: Math.min(button.y, target.y) - LOFT,
      };
      const ball: Point = { x: 0, y: 0 };
      const dunkee: Point = { x: 0, y: 0 };
      return {
        bar,
        seat,
        target,
        seatL: { x: seat.x - SEAT_W / 2, y: seat.y + 16 },
        seatR: { x: seat.x + SEAT_W / 2, y: seat.y + 16 },
        appears,
        throws,
        hits,
        lands,
        targetAt: (): Point => target,
        ball: (ms: number): Point =>
          bezier(button, ctrl, target, clamp01((ms - throws) / flightMs), ball),
        dunkee: (ms: number): Point => {
          if (ms < hits) {
            const u = easeOut(clamp01((ms - appears) / UP_MS));
            dunkee.x = seat.x;
            dunkee.y = lerp([bar.center.y, seat.y], u) + Math.sin(ms / 90) * 3;
            return dunkee;
          }
          dunkee.x = seat.x;
          dunkee.y = lerp(
            [seat.y, bar.center.y],
            easeIn(clamp01((ms - hits) / PLUNGE_MS)),
          );
          return dunkee;
        },
      };
    });
    const last = dunks[dunks.length - 1];
    const endAt = last.lands;
    const pitcher = (): Point => button;

    const pitching = createBeats(
      dunks,
      (d) => d.throws,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const smacking = createBeats(
      dunks,
      (d) => d.hits,
      (d) => {
        cover!.burst(d.target, 0.35);
        if (cover!.isLive()) shakeScreen(0.5);
      },
    );
    const dunking = createBeats(
      dunks,
      (d) => d.lands,
      (d, k) => {
        cover!.tierUp(d.bar, d.seat);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.bar.center);
          return;
        }
        cover!.burst(d.bar.center, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DUNK_SHAKE, k / Math.max(1, dunks.length - 1)));
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
          pitching.tick(ms, now);
          smacking.tick(ms, now);
          dunking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + SPLASH_MS) return;
          for (const d of dunks) {
            if (ms < d.appears || ms > d.lands + SPLASH_MS) continue;
            // the seat drops away on the hit
            if (ms < d.hits)
              drawBeam(
                ctx,
                d.seatL,
                d.seatR,
                10,
                clamp01((ms - d.appears) / UP_MS),
              );
            const s = (ms - d.lands) / SPLASH_MS;
            if (s >= 0 && s < 1)
              drawBeamFlare(ctx, d.bar.center, 50 * (1 + s), 1 - s, now);
            const c = (ms - d.hits) / CALL_MS;
            if (c >= 0 && c < 1) {
              ctx.globalAlpha = 1 - c * c;
              drawCritTextSprite(
                ctx,
                dunk,
                d.target.x,
                d.target.y - 50,
                (d === last ? 1.4 : 1) * (1 + 0.4 * (1 - clamp01(c * 3))),
              );
              ctx.globalAlpha = 1;
            }
            drawWispBetween(
              ctx,
              d.targetAt,
              ms,
              now,
              WISP_SIZE * TARGET_SIZE,
              0.5,
              d.appears,
              d.hits,
            );
            drawWispBetween(
              ctx,
              d.ball,
              ms,
              now,
              WISP_SIZE * BALL,
              1,
              d.throws,
              d.hits,
            );
            drawWispBetween(
              ctx,
              d.dunkee,
              ms,
              now,
              WISP_SIZE * DUNKEE,
              0.7,
              d.appears,
              d.lands,
            );
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              pitcher,
              ms,
              now,
              WISP_SIZE * PITCHER,
              0.5,
              0,
              last.throws,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
