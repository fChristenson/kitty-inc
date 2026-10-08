// the "Battleship" event (experiment: the Battleship game; cash): it covers
// its crit, whose click freezes the screen while a grid of light lines
// flashes up over the screen and the clicked floor's button opens fire:
// shot after shot arcs into a cell of the grid, every one a "HIT!" with a
// flash, a bang, a jolt and a spray of coins; when a hidden ship's last
// cell is hit it's "SUNK!" and the whole ship blows, cell by cell; the
// second ship goes down in a huge blast and shake. Pays floor income ×
// floor number × REWARD
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
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { drawDetonation } from "../../../../shared/explosion";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { COLOR } from "../../../../palette";

const KEY = "battleship";
const REWARD = 4;
const COLS = 6;
const ROWS = 5;
const EDGE = 90;
const TOP = 220;
const GRID_MS = 200;
const LINE_WIDTH = 6;
const LOFT = 180;
const SINK_GAP_MS = 70;
const CALL_MS = 380;
const STYLE = { fontSize: 44, strokeWidth: 8 };
const SHOT = 0.32;
const CELL_BLAST = 150;
const COINS = 14;
const COIN_REACH: [number, number] = [20, 100];
const HIT_SHAKE: [number, number] = [0.5, 1];

export const forceBattleshipEvent = registerWispEvent(
  KEY,
  "Battleship",
  () => CONFIG.battleshipEvent.chance,
  (floor, context, area) => {
    const { shotsMs, flightMs, holdMs, mergeMs } = CONFIG.battleshipEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const bottom = area.bottom - EDGE;
    const cw = (right - left) / COLS;
    const ch = (bottom - top) / ROWS;
    const cell = (c: number, r: number): Point => ({
      x: left + (c + 0.5) * cw,
      y: top + (r + 0.5) * ch,
    });
    const lines: [Point, Point][] = [
      ...Array.from({ length: COLS + 1 }, (_, c): [Point, Point] => [
        { x: left + c * cw, y: top },
        { x: left + c * cw, y: bottom },
      ]),
      ...Array.from({ length: ROWS + 1 }, (_, r): [Point, Point] => [
        { x: left, y: top + r * ch },
        { x: right, y: top + r * ch },
      ]),
    ];
    // two ships: one across, one down, never crossing
    const across = Math.floor(Math.random() * 2);
    const ships = [
      Array.from({ length: 3 }, (_, i) => cell(1 + i, across)),
      Array.from({ length: 4 }, (_, i) =>
        cell(COLS - 1 - (across === 0 ? 0 : 1), 1 + i),
      ),
    ];
    const hit = createCritTextSprite("HIT!", COLOR.heavenlyGold, STYLE);
    const sunk = createCritTextSprite("SUNK!", COLOR.heavenlyGold, STYLE);
    let clock: number = GRID_MS;
    const shots: {
      to: Point;
      fires: number;
      lands: number;
      at: (ms: number) => Point;
    }[] = [];
    const calls: { at: Point; ms: number; sunk: boolean; scale: number }[] = [];
    const sinks: { at: Point; ms: number }[] = [];
    const total = ships.reduce((n, s) => n + s.length, 0);
    let n = 0;
    ships.forEach((ship, s) => {
      ship.forEach((to, i) => {
        const fires = clock;
        const lands = fires + flightMs;
        clock += lerp(shotsMs, n++ / (total - 1));
        const ctrl: Point = {
          x: (button.x + to.x) / 2,
          y: Math.min(button.y, to.y) - LOFT,
        };
        const at: Point = { x: 0, y: 0 };
        shots.push({
          to,
          fires,
          lands,
          at: (ms: number) =>
            bezier(button, ctrl, to, clamp01((ms - fires) / flightMs), at),
        });
        const isLast = i === ship.length - 1;
        calls.push({ at: to, ms: lands, sunk: false, scale: 1 });
        if (!isLast) return;
        // the whole ship blows, cell by cell
        ship.forEach((c, j) =>
          sinks.push({ at: c, ms: lands + 80 + j * SINK_GAP_MS }),
        );
        const mid = ship[Math.floor(ship.length / 2)];
        calls.push({
          at: mid,
          ms: lands + 80,
          sunk: true,
          scale: s === ships.length - 1 ? 1.6 : 1.3,
        });
        clock = Math.max(clock, lands + 80 + ship.length * SINK_GAP_MS);
      });
    });
    const lastSink = sinks[sinks.length - 1];
    const endAt = lastSink.ms;
    const finalShip = ships[ships.length - 1];
    const finaleAt = finalShip[Math.floor(finalShip.length / 2)];

    const firing = createBeats(
      shots,
      (s) => s.fires,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.lands,
      (s, k) => {
        cover!.launchFrom(s.to, ringTargets(s.to, COINS, COIN_REACH));
        cover!.burst(s.to, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (shots.length - 1)));
      },
    );
    const sinking = createBeats(
      sinks,
      (s) => s.ms,
      (s) => {
        cover!.launchFrom(s.at, ringTargets(s.at, COINS, COIN_REACH));
        if (s === lastSink) {
          cover!.blast(finaleAt);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.1);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
          sinking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          const show =
            clamp01(ms / GRID_MS) * (1 - clamp01((ms - endAt) / CALL_MS));
          for (const [a, b] of lines)
            drawBeam(ctx, a, b, LINE_WIDTH, show * 0.5);
          for (const s of sinks)
            drawDetonation(ctx, s.at, ms - s.ms, CELL_BLAST, now);
          for (const s of shots)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHOT,
              1,
              s.fires,
              s.lands,
            );
          for (const c of calls) {
            const t = (ms - c.ms) / CALL_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              c.sunk ? sunk : hit,
              c.at.x,
              c.at.y - (c.sunk ? 50 : 30),
              c.scale * (1 + 0.4 * (1 - clamp01(t * 3))),
            );
            ctx.globalAlpha = 1;
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
