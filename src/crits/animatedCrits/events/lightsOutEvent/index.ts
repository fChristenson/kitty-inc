// the "Lights Out" event (experiment: the Lights Out puzzle solving
// itself; cash): it covers its crit, whose click freezes the screen and
// dims it while a grid of gold lights appears, some lit, some dark; a
// cursor wisp hops from light to light pressing each, every press flipping
// it and its four neighbours in a cross with a pop and a jolt, quicker and
// quicker, until with the last press every light blazes gold at once and
// the whole board bursts into cash in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { fadeStops, glowSprite } from "../../../../shared/glowSprite";

const KEY = "lightsOut";
const REWARD = 4;
const N = 7;
const PRESSES = 12;
const START_MS = 200;
const FLIP_MS = 120;
const HOP = 40;
const LIGHT = 0.42;
const VEIL = "rgba(0,0,0,0.6)";
const LIT = fadeStops(COLOR.heavenlyGold, 0.7);
const DARK = 0.12;
const CURSOR = 0.4;
const PRESS_SHAKE: [number, number] = [0.2, 0.6];
const FINAL_SHAKE = 2.0;

export const forceLightsOutEvent = registerWispEvent(
  KEY,
  "Lights Out",
  () => CONFIG.lightsOutEvent.chance,
  (floor, context, area) => {
    const { pressesMs, holdMs, mergeMs } = CONFIG.lightsOutEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cell = Math.min(width * 0.85, height * 0.6) / N;
    const offX = area.left + (width - cell * N) / 2;
    const offY = area.top + (height - cell * N) / 2;
    const centres: Point[] = Array.from({ length: N * N }, (_, c) => ({
      x: offX + ((c % N) + 0.5) * cell,
      y: offY + (((c / N) | 0) + 0.5) * cell,
    }));
    // scrambled from all lit by the same presses that then solve it
    const order = Array.from({ length: N * N }, (_, c) => c)
      .sort(() => Math.random() - 0.5)
      .slice(0, PRESSES);
    const crossOf = (c: number) => {
      const x = c % N;
      const y = (c / N) | 0;
      const cells = [c];
      if (x > 0) cells.push(c - 1);
      if (x < N - 1) cells.push(c + 1);
      if (y > 0) cells.push(c - N);
      if (y < N - 1) cells.push(c + N);
      return cells;
    };
    const start = new Uint8Array(N * N).fill(1);
    for (const c of order) for (const k of crossOf(c)) start[k] ^= 1;
    let clock = START_MS;
    const presses = order.map((c, i) => {
      const ms = clock;
      clock += lerp(pressesMs, i / (PRESSES - 1));
      return { cell: c, ms };
    });
    const flips: number[][] = Array.from({ length: N * N }, () => []);
    for (const p of presses)
      for (const k of crossOf(p.cell))
        flips[k].push(p.ms + (k === p.cell ? 0 : 40));
    for (const list of flips) list.sort((a, b) => a - b);
    const lastPress = presses[presses.length - 1].ms;
    const endAt = lastPress + 40 + FLIP_MS + 120;
    const spot: Point = { x: 0, y: 0 };
    // hopping cell to cell, landing on each press
    const cursorAt = (ms: number): Point => {
      let from = centres[presses[0].cell];
      let leaves = 0;
      for (const p of presses) {
        const to = centres[p.cell];
        if (ms < p.ms) {
          const u = clamp01((ms - leaves) / (p.ms - leaves));
          spot.x = lerp([from.x, to.x], u);
          spot.y = lerp([from.y, to.y], u) - 4 * HOP * u * (1 - u);
          return spot;
        }
        from = to;
        leaves = p.ms;
      }
      return from;
    };

    const pressing = createBeats(
      presses,
      (p) => p.ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PRESS_SHAKE, k / (PRESSES - 1)));
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const at of centres)
          cover!.launchFrom(
            at,
            clampTargetsY(
              ringTargets(at, 4, [20, 90]),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        cover!.blast({ x: offX + (cell * N) / 2, y: offY + (cell * N) / 2 });
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + 700 + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pressing.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms < 0 || ms >= endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          ctx.globalAlpha = fade;
          ctx.fillStyle = VEIL;
          ctx.fillRect(area.left, area.top, width, height);
          const sprite = glowSprite(LIT);
          const r = cell * LIGHT;
          // every light blazes as the board's solved
          const blaze = 1 + 0.4 * clamp01((ms - lastPress - 40) / FLIP_MS);
          for (let c = 0; c < N * N; c++) {
            let on = start[c];
            let since = Infinity;
            for (const t of flips[c]) {
              if (ms < t) break;
              on ^= 1;
              since = ms - t;
            }
            // flipping: squashed flat at the midpoint, the new state after
            let squash = 1;
            let shows = on;
            if (since < FLIP_MS) {
              const u = since / FLIP_MS;
              squash = Math.abs(Math.cos(Math.PI * u));
              if (u < 0.5) shows = on ^ 1;
            }
            const { x, y } = centres[c];
            const s = r * (shows ? blaze : 1);
            ctx.globalAlpha = fade * (shows ? 1 : DARK);
            ctx.drawImage(sprite, x - s, y - s * squash, s * 2, s * 2 * squash);
          }
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > lastPress + 200) return;
          drawWisp(ctx, cursorAt, ms, now, WISP_SIZE * CURSOR, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
