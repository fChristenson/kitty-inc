// the "Bait Ball" event (mix; cash): it covers its crit, whose click
// freezes the screen while the clicked floor's button spills a huge shoal
// of cash that balls up mid-screen, milling round and round like a school
// of fish; wisp predators dart in from the screen's edges and slash through
// it one after another, quicker each time, the shoal bursting apart round
// each with a flash, a whoosh and a jolt and swirling shut behind it; then
// the whole shoal streams up into the total, the last hunter chasing it in,
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "baitBall";
const REWARD = 4;
const COINS = 1_300;
const COIN = 0.55;
// the ball is RADIUS px round, seen SQUASH as deep, milling MILL turns a
// second at its middle, slower at its rim
const RADIUS = 170;
const SQUASH = 0.7;
const MILL = 0.9;
// it settles HEIGHT of the way up the screen from the button
const HEIGHT = 0.45;
// a slash parts the shoal PART px either side, within REACH px of its line,
// closing over PART_MS
const PART = 90;
const REACH = 70;
const PART_MS = 360;
const HUNTER = 0.7;
const STREAM_SPREAD = 350;
const LIFT = 80;
const SLASH_SHAKE: [number, number] = [0.8, 1.5];

export const forceBaitBallEvent = registerWispEvent(
  KEY,
  "Bait Ball",
  () => CONFIG.baitBallEvent.chance,
  (floor, context, area) => {
    const { formMs, slashesMs, dashMs, flightMs, holdMs, mergeMs } =
      CONFIG.baitBallEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const middle: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([button.y, area.top], HEIGHT),
    };
    const ballAt = (ms: number, into: Point): Point => {
      const u = easeOut(clamp01(ms / formMs));
      into.x = lerp([button.x, middle.x], u);
      into.y = lerp([button.y, middle.y], u);
      return into;
    };
    const span = Math.max(area.right - area.left, area.bottom - area.top);
    // each slash crosses the ball's middle, from off one edge to off the other
    const slashes = slashesMs.map((at) => {
      const angle = Math.random() * Math.PI;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const flip = Math.random() < 0.5 ? 1 : -1;
      return {
        crossAt: at,
        dx: dx * flip,
        dy: dy * flip,
        from: {
          x: middle.x - dx * flip * span,
          y: middle.y - dy * flip * span,
        },
        to: { x: middle.x + dx * flip * span, y: middle.y + dy * flip * span },
      };
    });
    const streamAt = slashesMs[slashesMs.length - 1] + PART_MS * 0.6;
    const endAt = streamAt + STREAM_SPREAD + flightMs;
    const centre: Point = { x: 0, y: 0 };

    const place = (
      angle0: number,
      r: number,
      ms: number,
      into: Point,
    ): Point => {
      ballAt(ms, centre);
      const grow = 0.3 + 0.7 * easeOut(clamp01(ms / formMs));
      const turn = (ms / 1000) * MILL * Math.PI * 2 * (1.4 - 0.8 * r);
      const a = angle0 + turn;
      let x = Math.cos(a) * r * RADIUS * grow;
      let y = Math.sin(a) * r * RADIUS * grow * SQUASH;
      for (const s of slashes) {
        const t = (ms - s.crossAt) / PART_MS;
        if (t < -0.15 || t >= 1) continue;
        // pushed off the slash's line, bursting open then swirling shut
        const side = x * -s.dy + y * s.dx;
        const near = Math.exp(-Math.abs(side) / REACH);
        const open = t < 0 ? 1 + t / 0.15 : (1 - t) * (1 - t);
        const push = Math.sign(side || 1) * PART * near * open;
        x += -s.dy * push;
        y += s.dx * push;
      }
      into.x = centre.x + x;
      into.y = centre.y + y;
      return into;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const angle0 = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const from = place(angle0, r, streamAt, { x: 0, y: 0 });
      // the side nearest the total leaves first
      const leaves =
        streamAt +
        clamp01((from.y - middle.y + RADIUS) / (2 * RADIUS)) * STREAM_SPREAD;
      const at: Point = { x: 0, y: 0 };
      const start: Point = { x: 0, y: 0 };
      const lift: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) {
          place(angle0, r, ms, at);
          return { x: at.x, y: at.y, scale: COIN };
        }
        place(angle0, r, leaves, start);
        lift.x = start.x;
        lift.y = start.y - LIFT;
        const total = cover?.total() ?? fallback;
        bezier(
          start,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });
    const hunters = slashes.map((s) => {
      const at: Point = { x: 0, y: 0 };
      const fromMs = s.crossAt - dashMs / 2;
      const toMs = s.crossAt + dashMs / 2;
      return {
        fromMs,
        toMs,
        at: (ms: number): Point | null => {
          if (ms < fromMs || ms > toMs) return null;
          const u = (ms - fromMs) / dashMs;
          at.x = lerp([s.from.x, s.to.x], 0.5 + (u - 0.5) * 0.5);
          at.y = lerp([s.from.y, s.to.y], 0.5 + (u - 0.5) * 0.5);
          return at;
        },
      };
    });
    const chaserAt: Point = { x: 0, y: 0 };
    const chaser = (ms: number): Point | null => {
      if (ms < streamAt || ms > endAt) return null;
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - streamAt) / (endAt - streamAt)));
      chaserAt.x = lerp([middle.x, total.x], u);
      chaserAt.y = lerp([middle.y + RADIUS * SQUASH, total.y], u);
      return chaserAt;
    };

    const slashing = createBeats(
      slashes,
      (s) => s.crossAt,
      (_, k) => {
        cover!.burst(middle, 0.6 + 0.3 * (k / Math.max(1, slashes.length - 1)));
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SLASH_SHAKE, k / Math.max(1, slashes.length - 1)));
      },
    );
    const finishing = createBeats(
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
          slashing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const h of hunters)
            drawWispBetween(
              ctx,
              h.at,
              ms,
              now,
              WISP_SIZE * HUNTER,
              0.8,
              h.fromMs,
              h.toMs,
            );
          drawWispBetween(ctx, chaser, ms, now, WISP_SIZE, 1, streamAt, endAt);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
