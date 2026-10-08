// the "Arrow Volley" event (wisp; crit tiers): it covers its crit, whose
// click freezes the screen while three archer wisps fly out of the clicked
// floor's button to the bottom corner of the screen, and on the command they
// loose: a volley of arrow wisps arcs high over the screen and rains down
// along an income bar, a pop for every arrow, the last of them landing with
// a bang and a big jolt as the bar jumps a crit tier; volley after volley,
// ever quicker, the last raining down in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
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
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars } from "../../eventRewards";

const KEY = "arrowVolley";
const MAX_BARS = 3;
const ARCHERS = 3;
const ARROWS = 6;
const EDGE = 50;
const LOFT = 260;
const FORM_MS = 280;
const STAGGER_MS = 25;
const ARCHER = 0.45;
const ARROW = 0.25;
const HIT_SHAKE: [number, number] = [0.9, 1.4];

export const forceArrowVolleyEvent = registerWispEvent(
  KEY,
  "Arrow Volley",
  () => CONFIG.arrowVolleyEvent.chance,
  (floor, context, area) => {
    const { volleysMs, flightMs, holdMs, mergeMs } = CONFIG.arrowVolleyEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = button.x > (area.left + area.right) / 2;
    const archers = Array.from({ length: ARCHERS }, (_, i) => {
      const post: Point = {
        x: ltr ? area.left + EDGE + i * 34 : area.right - EDGE - i * 34,
        y: area.bottom - EDGE - i * 40,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        post,
        at: (ms: number): Point => {
          const u = easeOut(clamp01(ms / FORM_MS));
          at.x = lerp([button.x, post.x], u);
          at.y = lerp([button.y, post.y], u) + Math.sin(ms / 80 + i) * 3;
          return at;
        },
      };
    });
    let clock: number = FORM_MS;
    const volleys = bars.map((bar, v) => {
      const looses = clock;
      clock += lerp(volleysMs, v / Math.max(1, bars.length - 1));
      const arrows = Array.from({ length: ARROWS }, (_, i) => {
        const from = archers[i % ARCHERS].post;
        const to: Point = {
          x:
            bar.box.x +
            (bar.box.width * ((ltr ? i : ARROWS - 1 - i) + 0.5)) / ARROWS,
          y: bar.center.y,
        };
        const ctrl: Point = {
          x: (from.x + to.x) / 2,
          y: Math.min(from.y, to.y) - LOFT,
        };
        const leaves = looses + i * STAGGER_MS;
        const lands = leaves + flightMs;
        const at: Point = { x: 0, y: 0 };
        return {
          to,
          leaves,
          lands,
          at: (ms: number): Point =>
            bezier(from, ctrl, to, clamp01((ms - leaves) / flightMs), at),
        };
      });
      return { bar, looses, arrows, lands: arrows[ARROWS - 1].lands };
    });
    const last = volleys[volleys.length - 1];
    const endAt = last.lands;
    const arrows = volleys.flatMap((v) => v.arrows);

    const loosing = createBeats(
      volleys,
      (v) => v.looses,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const pinging = createBeats(
      arrows,
      (a) => a.lands,
      (a) => cover!.burst(a.to, 0.25),
    );
    const landing = createBeats(
      volleys,
      (v) => v.lands,
      (v, k) => {
        cover!.tierUp(v.bar, archers[0].post);
        if (v === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(v.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, volleys.length - 1)));
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
          loosing.tick(ms, now);
          pinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const a of archers)
            drawWispBetween(
              ctx,
              a.at,
              ms,
              now,
              WISP_SIZE * ARCHER,
              0.5,
              0,
              endAt,
            );
          for (const a of arrows)
            drawWispBetween(
              ctx,
              a.at,
              ms,
              now,
              WISP_SIZE * ARROW,
              1,
              a.leaves,
              a.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
