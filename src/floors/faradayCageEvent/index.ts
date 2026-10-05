// the "Faraday Cage" event (lightning; a crit tier): it covers its crit,
// whose click freezes the screen while a cage of light drops down over the
// clicked floor's bar; then lightning hammers it from every side, bolt after
// bolt ever faster, each cracking onto the cage in a blinding strike and a
// jolt while its current races off both ways round the cage's frame, the bar
// safe inside; a colossal last bolt sets the whole cage blazing, and it
// crushes down onto the bar, which jumps a crit tier. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawGlitterLight, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { findRewardBars } from "../eventRewards";

const KEY = "faradayCage";
const STRIKES = 9;
// the cage: this far round the bar, a bar of light every BAR_GAP px
const PAD_X = 50;
const PAD_Y = 110;
const BAR_GAP = 70;
const BAR_W = 7;
const RAIL_W = 11;
const DROP = 420;
// each bolt shows this long; the current races this fast round the frame
const BOLT_MS = 110;
const CURRENT_MS = 260;
const CURRENT_SPARKS = 6;
const STRIKE_SHAKE: [number, number] = [0.5, 1];
const FINAL_SHAKE = 1.6;

interface Hit {
  ms: number;
  at: Point;
  // how far round the frame it hit, as a share of its perimeter
  along: number;
  bolt: Bolt;
}

export const forceFaradayCageEvent = registerWispEvent(
  KEY,
  "Faraday Cage",
  () => CONFIG.faradayCageEvent.chance,
  (floor, context, area) => {
    const { dropMs, strikeMs, finalMs, crushMs, holdMs, mergeMs } =
      CONFIG.faradayCageEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const left = bar.box.x - PAD_X;
    const right = bar.box.x + bar.box.width + PAD_X;
    const top = bar.box.y - PAD_Y;
    const bottom = bar.box.y + bar.box.height + PAD_Y * 0.5;
    const w = right - left;
    const h = bottom - top;
    const perimeter = 2 * (w + h);
    // a point `s` px round the frame, clockwise from its top left
    const round = (s: number, into: Point): Point => {
      let d = ((s % perimeter) + perimeter) % perimeter;
      if (d < w) return Object.assign(into, { x: left + d, y: top });
      d -= w;
      if (d < h) return Object.assign(into, { x: right, y: top + d });
      d -= h;
      if (d < w) return Object.assign(into, { x: right - d, y: bottom });
      d -= w;
      return Object.assign(into, { x: left, y: bottom - d });
    };

    // strikes from off every side, quickening
    const hits: Hit[] = Array.from({ length: STRIKES }, (_, k) => {
      const along = (k * 0.382 + Math.random() * 0.1) % 1;
      const at = round(along * perimeter, { x: 0, y: 0 });
      const away = Math.atan2(at.y - bar.center.y, at.x - bar.center.x);
      const from: Point = {
        x: at.x + Math.cos(away) * 900,
        y: Math.min(at.y + Math.sin(away) * 900, area.top),
      };
      const u = k / (STRIKES - 1);
      return {
        ms: dropMs + strikeMs * (1 - (1 - u) ** 1.6),
        at,
        along,
        bolt: createBolt(from, at, 2),
      };
    });
    const finalAt = dropMs + strikeMs + finalMs;
    const finalHit: Point = { x: bar.center.x, y: top };
    const finalBolt = createBolt(
      { x: bar.center.x, y: area.top - 200 },
      finalHit,
      4,
    );
    const crushAt = finalAt + crushMs;

    const dropping = createBeats(
      [0, dropMs],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        if (ms > 0) shakeScreen(STRIKE_SHAKE[0]);
      },
    );
    const striking = createBeats(
      hits,
      (hit) => hit.ms,
      (hit, k) => {
        cover!.burst(hit.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (STRIKES - 1)));
      },
    );
    const finishing = createBeats(
      [finalAt, crushAt],
      (ms) => ms,
      (ms) => {
        if (ms >= crushAt) {
          cover!.tierUp(bar, finalHit);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(finalHit, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const spark: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: crushAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > crushAt) return;
          // dropping in, then crushed flat onto the bar
          const fall = DROP * (1 - easeOut(clamp01(ms / dropMs)));
          const crush = easeIn(clamp01((ms - finalAt) / crushMs));
          const yTop = lerp([top, bar.box.y], crush) - fall;
          const yBottom =
            lerp([bottom, bar.box.y + bar.box.height], crush) - fall;
          const blaze = ms >= finalAt ? 1 : 0.55;
          for (let x = left; x <= right + 1; x += BAR_GAP) {
            a.x = b.x = Math.min(x, right);
            a.y = yTop;
            b.y = yBottom;
            drawBeam(ctx, a, b, BAR_W, blaze);
          }
          a.x = left;
          b.x = right;
          a.y = b.y = yTop;
          drawBeam(ctx, a, b, RAIL_W, blaze);
          a.y = b.y = yBottom;
          drawBeam(ctx, a, b, RAIL_W, blaze);
          for (const hit of hits) {
            const t = ms - hit.ms;
            if (t < 0 || t > CURRENT_MS) continue;
            if (t < BOLT_MS) {
              drawBolt(ctx, hit.bolt, 1 - t / BOLT_MS);
              drawStrike(ctx, hit.at, 1 - t / BOLT_MS, 1.2, now);
            }
            // its current racing off both ways round the frame
            const run = (t / CURRENT_MS) * perimeter * 0.5;
            for (let k = 0; k < CURRENT_SPARKS; k++)
              for (const dir of [-1, 1]) {
                round(
                  hit.along * perimeter + dir * run * (1 - k * 0.08),
                  spark,
                );
                drawGlitterLight(
                  ctx,
                  spark.x,
                  spark.y - fall,
                  16 * (1 - k / CURRENT_SPARKS),
                  k + dir * 31,
                  1 - t / CURRENT_MS,
                  now,
                );
              }
          }
          const t = ms - finalAt;
          if (t >= 0 && t < BOLT_MS * 2) {
            drawBolt(ctx, finalBolt, 1 - t / (BOLT_MS * 2), 2);
            drawStrike(ctx, finalHit, 1 - t / (BOLT_MS * 2), 2.5, now);
          }
        },
        tick: (ms, now) => {
          dropping.tick(ms, now);
          striking.tick(ms, now);
          finishing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
