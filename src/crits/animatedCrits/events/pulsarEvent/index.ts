// the "Pulsar" event (beam; cash): it covers its crit, whose click freezes
// the screen while a wisp shoots out of the clicked floor's button to the
// middle of the screen and ignites into a pulsar: two blazing beams fire out
// of it in opposite directions and it starts to spin, faster and faster,
// the twin beams strobing round the screen, every half turn flashing,
// popping and throwing coins out where a beam meets the screen's edge; then it
// collapses in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "pulsar";
const REWARD = 4;
const ARRIVE_MS = 250;
// the beams turn TURNS times, quickening; coins fly every half turn
const TURNS = 5;
const EDGE = 20;
const BEAM_W = 22;
const STAR = 0.8;
const FLARE = 30;
const COINS = 8;
const COIN_REACH: [number, number] = [30, 120];
const SWEEP_SHAKE: [number, number] = [0.25, 1];

export const forcePulsarEvent = registerWispEvent(
  KEY,
  "Pulsar",
  () => CONFIG.pulsarEvent.chance,
  (floor, context, area) => {
    const { spinMs, holdMs, mergeMs } = CONFIG.pulsarEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE,
      bottom: area.bottom - EDGE,
    };
    const turn0 = Math.random() * Math.PI;
    const toEdge = (a: number, into: Point): Point => {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const reach = Math.min(
        dx > 0
          ? (box.right - center.x) / dx
          : dx < 0
            ? (box.left - center.x) / dx
            : Infinity,
        dy > 0
          ? (box.bottom - center.y) / dy
          : dy < 0
            ? (box.top - center.y) / dy
            : Infinity,
      );
      into.x = center.x + dx * reach;
      into.y = center.y + dy * reach;
      return into;
    };
    const turnAt = (ms: number) =>
      turn0 + TURNS * Math.PI * 2 * easeIn(clamp01((ms - ARRIVE_MS) / spinMs));
    const endAt = ARRIVE_MS + spinMs;
    // every half turn, where one beam meets the edge
    const sweeps: { ms: number; at: Point }[] = [];
    for (let k = 1; k <= TURNS * 2; k++) {
      const turn = (k * Math.PI) / (TURNS * Math.PI * 2);
      const ms = ARRIVE_MS + spinMs * Math.sqrt(Math.min(1, turn));
      const angle = turnAt(ms);
      sweeps.push({ ms, at: toEdge(angle, { x: 0, y: 0 }) });
    }
    const ends: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const starAt: Point = { x: 0, y: 0 };
    const star = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / ARRIVE_MS));
      starAt.x = lerp([button.x, center.x], u);
      starAt.y = lerp([button.y, center.y], u);
      return starAt;
    };

    const sweeping = createBeats(
      sweeps,
      (s) => s.ms,
      (s, k) => {
        cover!.launchFrom(s.at, ringTargets(s.at, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(SWEEP_SHAKE, k / (sweeps.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          sweeping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          if (ms > ARRIVE_MS) {
            const a = turnAt(ms);
            const power = 0.6 + 0.4 * clamp01((ms - ARRIVE_MS) / spinMs);
            for (let i = 0; i < 2; i++) {
              toEdge(a + i * Math.PI, ends[i]);
              drawBeam(ctx, center, ends[i], BEAM_W * power, power);
              drawBeamFlare(ctx, ends[i], FLARE, power, now);
            }
          }
          drawWispBetween(ctx, star, ms, now, WISP_SIZE * STAR, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
