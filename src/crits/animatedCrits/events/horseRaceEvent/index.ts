// the "Horse Race" event (experiment: a day at the races; crit tiers): it
// covers its crit, whose click freezes the screen while a horse wisp lines
// up at the start of every income bar's lane and a finish line of light
// flashes up across the far end; "GO!" and they're off, surging and
// falling back neck and neck down their lanes, and as each crosses the line
// it flashes with a bang and a jolt and its bar jumps a crit tier; the
// winner gets "1ST!" and the last across sets off a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars } from "../../eventRewards";
import { COLOR } from "../../../../palette";

const KEY = "horseRace";
const MAX_BARS = 4;
const EDGE = 60;
const RIDE = 18;
const LINE_REACH = 30;
const SETUP_MS = 260;
const SURGE = 0.08;
const STYLE = { fontSize: 50, strokeWidth: 8 };
const CALL_MS = 380;
const HORSE = 0.45;
const FINISH_SHAKE: [number, number] = [0.7, 1.2];

export const forceHorseRaceEvent = registerWispEvent(
  KEY,
  "Horse Race",
  () => CONFIG.horseRaceEvent.chance,
  (floor, context, area) => {
    const { raceMs, spreadMs, holdMs, mergeMs } = CONFIG.horseRaceEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const ltr = Math.random() < 0.5;
    const start = ltr ? area.left + EDGE : area.right - EDGE;
    const finish = ltr ? area.right - EDGE : area.left + EDGE;
    const go = createCritTextSprite("GO!", COLOR.heavenlyGold, STYLE);
    const first = createCritTextSprite("1ST!", COLOR.heavenlyGold, {
      fontSize: 64,
      strokeWidth: 10,
    });
    // finishing order shuffled, each a little behind the last
    const order = bars.map((_, i) => i).sort(() => Math.random() - 0.5);
    const horses = bars.map((bar, i) => {
      const place = order.indexOf(i);
      const finishes =
        SETUP_MS + raceMs + place * (spreadMs / Math.max(1, bars.length - 1));
      const lane = bar.center.y - RIDE;
      const phase = Math.random() * Math.PI * 2;
      const span = finishes - SETUP_MS;
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        place,
        finishes,
        line: { x: finish, y: lane },
        at: (ms: number): Point => {
          if (ms < SETUP_MS) {
            const u = easeOut(clamp01(ms / SETUP_MS));
            at.x = lerp([button.x, start], u);
            at.y = lerp([button.y, lane], u);
            return at;
          }
          const t = clamp01((ms - SETUP_MS) / span);
          // surging ahead and falling back, but always crossing on time
          const s =
            t + Math.sin(t * Math.PI * 3 + phase) * SURGE * t * (1 - t) * 4;
          at.x = lerp([start, finish], s);
          at.y = lane - Math.abs(Math.sin(ms / 55 + phase)) * 8;
          return at;
        },
      };
    });
    const winner = horses.find((h) => h.place === 0)!;
    const loser = horses.reduce((a, b) => (b.finishes > a.finishes ? b : a));
    const endAt = loser.finishes;
    const top =
      Math.min(...bars.map((b) => b.center.y)) - RIDE - LINE_REACH * 2;
    const bottom = Math.max(...bars.map((b) => b.center.y)) + LINE_REACH;
    const lineTop: Point = { x: finish, y: top };
    const lineBottom: Point = { x: finish, y: bottom };

    const starting = createBeats(
      [SETUP_MS],
      (ms) => ms,
      () => {
        if (cover?.isLive()) shakeScreen(0.6);
      },
    );
    const finishing = createBeats(
      horses,
      (h) => h.finishes,
      (h) => {
        cover!.tierUp(h.bar, h.line);
        if (h === loser) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.line);
          return;
        }
        cover!.burst(h.line, h === winner ? 0.9 : 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FINISH_SHAKE, h === winner ? 1 : 0));
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
          starting.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          const show =
            clamp01(ms / SETUP_MS) * (1 - clamp01((ms - endAt) / CALL_MS));
          drawBeam(
            ctx,
            lineTop,
            lineBottom,
            12,
            show * (0.6 + 0.4 * Math.sin(now / 60)),
          );
          const g = (ms - SETUP_MS) / CALL_MS;
          if (g >= 0 && g < 1) {
            ctx.globalAlpha = 1 - g * g;
            drawCritTextSprite(
              ctx,
              go,
              (start + finish) / 2,
              top - 30,
              1 + 0.4 * (1 - clamp01(g * 3)),
            );
            ctx.globalAlpha = 1;
          }
          const w = (ms - winner.finishes) / CALL_MS;
          if (w >= 0 && w < 1.5) {
            ctx.globalAlpha = 1 - clamp01(w - 0.5);
            drawCritTextSprite(
              ctx,
              first,
              finish + (ltr ? -60 : 60),
              winner.line.y - 50,
              1 + 0.4 * (1 - clamp01(w * 3)),
            );
            ctx.globalAlpha = 1;
          }
          for (const h of horses)
            drawWispBetween(
              ctx,
              h.at,
              ms,
              now,
              WISP_SIZE * HORSE,
              h === winner ? 1 : 0.6,
              0,
              h.finishes,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
