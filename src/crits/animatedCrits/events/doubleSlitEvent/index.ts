// the "Double Slit" event (experiment: the double-slit experiment; levels):
// it covers its crit, whose click freezes the screen while a wall of light
// with two narrow slits snaps up across the screen, a source wisp on one
// side and a faint screen line on the other; then the source fires glitter
// particles one at a time, faster and faster, each through one of the slits
// and onto the screen, where they pile up not in two lumps but in bright
// interference fringes, one on every income bar, every few hits a click and
// a jolt; then the fringes blaze one by one, outermost first, and smear
// along their bars for free levels, the clicked floor's own fringe last
// with a slam. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawBeam } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "doubleSlit";
const PARTICLES = 340;
const DOT = 11;
const SOURCE = WISP_SIZE * 0.9;
// the source, the wall and the screen line at these shares across
const SOURCE_X = 0.1;
const WALL_X = 0.34;
const SCREEN_X = 0.8;
// the slits' middles this far apart, each this wide
const SLIT_GAP = 120;
const SLIT = 34;
const WALL_W = 14;
// px a fringe's hits scatter up and down and across the screen line
const FRINGE = 16;
const SPREAD_X = 12;
// the pattern dims away from the clicked bar over this share of the
// screen's height, but every fringe keeps at least FLOOR of the brightest
const ENVELOPE = 0.5;
const FLOOR = 0.3;
const CLICK_EVERY = 20;
const CLICK_SHAKE: [number, number] = [0.12, 0.45];
const BLAZE_SHAKE = 0.6;
const SOUND_GAP_MS = 60;

interface Hit {
  firesAt: number;
  lands: number;
  // the share of its flight spent reaching the slit
  split: number;
  slit: Point;
  at: Point;
  band: number;
  // where along its bar it smears to
  smear: Point;
}

export const forceDoubleSlitEvent = registerWispEvent(
  KEY,
  "Double Slit",
  () => CONFIG.doubleSlitEvent.chance,
  (floor, context, area) => {
    const {
      setupMs,
      emitMs,
      flyMs,
      blazeMs,
      smearMs,
      gapMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.doubleSlitEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor);
    if (!clicked) return;
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const yMid = clicked.center.y;
    const source: Point = { x: area.left + w * SOURCE_X, y: yMid };
    const wallX = area.left + w * WALL_X;
    const screenX = area.left + w * SCREEN_X;
    const slits = [yMid - SLIT_GAP / 2, yMid + SLIT_GAP / 2];
    // each bar a fringe, brightest on the clicked one
    const weights = bars.map(
      (bar) =>
        FLOOR +
        (1 - FLOOR) *
          Math.exp(-(((bar.center.y - yMid) / (ENVELOPE * h)) ** 2)),
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    const pick = (r: number): number => {
      let left = r * sum;
      for (let b = 0; b < bars.length; b++) {
        left -= weights[b];
        if (left < 0) return b;
      }
      return bars.length - 1;
    };
    const gauss = () =>
      (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const hits: Hit[] = Array.from({ length: PARTICLES }, (_, i) => {
      const band = pick(Math.random());
      const bar = bars[band];
      const at: Point = {
        x: screenX + (Math.random() * 2 - 1) * SPREAD_X,
        y: bar.center.y + gauss() * FRINGE,
      };
      const slit: Point = {
        x: wallX,
        y: slits[i % 2] + (Math.random() - 0.5) * SLIT * 0.6,
      };
      const firesAt = setupMs + emitMs * Math.sqrt(i / PARTICLES);
      const a = Math.hypot(slit.x - source.x, slit.y - source.y);
      const b = Math.hypot(at.x - slit.x, at.y - slit.y);
      return {
        firesAt,
        lands: firesAt + flyMs,
        split: a / (a + b),
        slit,
        at,
        band,
        smear: {
          x: bar.box.x + bar.box.width * (0.05 + 0.9 * hash01(i, 5)),
          y: bar.center.y + (hash01(i, 9) - 0.5) * bar.box.height * 0.6,
        },
      };
    });
    const done = hits[PARTICLES - 1].lands;
    // the fringes blaze outermost first, the clicked bar's last
    const order = bars
      .map((bar, b) => ({ bar, b }))
      .sort(
        (p, q) =>
          Math.abs(q.bar.center.y - yMid) - Math.abs(p.bar.center.y - yMid),
      );
    const blazes = new Array<number>(bars.length);
    order.forEach(({ b }, k) => (blazes[b] = done + blazeMs + k * gapMs));
    const flights = order.map(({ bar, b }) => ({
      bar,
      lands: blazes[b] + smearMs,
      levels: levelsFor(bar.floor, levelShare, 1) * (bar === clicked ? 2 : 1),
    }));
    const endMs = Math.max(...flights.map((f) => f.lands));

    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };
    const clicks = hits
      .filter((_, i) => i % CLICK_EVERY === CLICK_EVERY - 1)
      .map((hit) => hit.lands);
    const setting = createBeats(
      [0, setupMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clicking = createBeats(
      clicks,
      (ms) => ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CLICK_SHAKE, k / Math.max(1, clicks.length - 1)));
        sound(now);
      },
    );
    const landing = createBeats(
      flights,
      (f) => f.lands,
      (f: { bar: RewardBar; levels: number }, _, now) => {
        cover!.levels(f.bar, f.levels, { x: screenX, y: f.bar.center.y });
        if (f.bar === clicked) {
          cover!.slam(f.bar);
          cover!.blast(f.bar.center);
          return;
        }
        cover!.burst({ x: screenX, y: f.bar.center.y }, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(BLAZE_SHAKE);
        sound(now);
      },
    );

    const sourceAt = () => source;
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const dot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          setting.tick(ms, now);
          clicking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const shown =
            clamp01(ms / setupMs) * (1 - clamp01((ms - done) / 300));
          if (shown > 0) {
            // the wall, open at the two slits, and the screen line
            a.x = b.x = wallX;
            const edges = [
              area.top,
              slits[0] - SLIT / 2,
              slits[0] + SLIT / 2,
              slits[1] - SLIT / 2,
              slits[1] + SLIT / 2,
              area.bottom,
            ];
            for (let e = 0; e < edges.length; e += 2) {
              a.y = edges[e];
              b.y = edges[e + 1];
              drawBeam(ctx, a, b, WALL_W, 0.75 * shown);
            }
            for (let s = 0; s < 2; s++)
              drawGlitterLight(ctx, wallX, slits[s], 18, s, shown, now);
            a.x = b.x = screenX;
            a.y = area.top;
            b.y = area.bottom;
            drawBeam(ctx, a, b, 4, 0.25 * shown);
            drawWisp(
              ctx,
              sourceAt,
              ms,
              now,
              SOURCE * shown,
              0.4 + 0.6 * clamp01((ms - setupMs) / emitMs),
            );
          }
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < PARTICLES; i++) {
            const hit = hits[i];
            if (ms < hit.firesAt) break;
            const blazeAt = blazes[hit.band];
            if (ms >= blazeAt + smearMs) continue;
            let size = DOT;
            let color: string = i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold;
            if (ms < hit.lands) {
              const u = (ms - hit.firesAt) / flyMs;
              if (u < hit.split) {
                const v = u / hit.split;
                dot.x = lerp([source.x, hit.slit.x], v);
                dot.y = lerp([source.y, hit.slit.y], v);
              } else {
                const v = (u - hit.split) / (1 - hit.split);
                dot.x = lerp([hit.slit.x, hit.at.x], v);
                dot.y = lerp([hit.slit.y, hit.at.y], v);
              }
            } else if (ms < blazeAt) {
              dot.x = hit.at.x;
              dot.y = hit.at.y;
            } else {
              const v = smoothstep(clamp01((ms - blazeAt) / smearMs));
              dot.x = lerp([hit.at.x, hit.smear.x], v);
              dot.y = lerp([hit.at.y, hit.smear.y], v);
              size = DOT * 1.4;
              color = COLOR.white;
            }
            stampGlimmer(ctx, dot.x, dot.y, size, i + ms * 0.004, color);
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((bar) => bar.floor === floor),
);
