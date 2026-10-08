// the "Claw Machine" event (experiment: an arcade claw machine; free hires
// and cash): it covers its crit, whose click freezes the screen while the
// clicked floor's button heaps a pile of cash at the bottom of it with a
// glowing prize buried in it, and a claw of three wisp prongs on a cable
// of light whirs out along the top; it drops into the pile, clamps a prize
// and hauls it up, swings across and lets it fall onto an empty spot on a
// floor in view, where it lands with a pop and a jolt as a new worker;
// grab after grab, ever faster, the last a huge blast and shake. Pays
// floor income × floor number × REWARD, plus the hires
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "clawMachine";
const REWARD = 2;
const MAX_HIRES = 3;
const FORM_MS = 300;
const PILE_COINS = 500;
const COIN = 0.42;
// the pile is PILE px wide, HEAP px tall, LOW px up off the bottom; the
// claw rides HIGH px under the top, prongs OPEN or SHUT px apart
const PILE = 150;
const HEAP = 60;
const LOW = 30;
const HIGH = 50;
const OPEN = 22;
const SHUT = 7;
const PRONG = 0.3;
const PRIZE = 0.45;
const CABLE = 4;
const DROP_MS = 220;
// shares of a grab: across, down, clamp, up, across, release
const LEGS = [0.2, 0.2, 0.1, 0.2, 0.2, 0.1];
const LAND_SHAKE: [number, number] = [0.6, 1.3];

export const forceClawMachineEvent = registerWispEvent(
  KEY,
  "Claw Machine",
  () => CONFIG.clawMachineEvent.chance,
  (floor, context, area) => {
    const { pileMs, grabsMs, holdMs, mergeMs } = CONFIG.clawMachineEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const pile: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - LOW,
    };
    const railY = area.top + HIGH;
    let clock: number = pileMs;
    let fromX = pile.x;
    let fromY = railY;
    const dropYOf = (spot: Point) => Math.max(railY + 20, spot.y - 70);
    const grabs = hires.map((hire, k) => {
      const span = lerp(grabsMs, k / Math.max(1, hires.length - 1));
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const marks: number[] = [clock];
      for (const leg of LEGS) marks.push(marks[marks.length - 1] + span * leg);
      const g = { hire, spot, fromX, fromY, marks, lands: marks[6] + DROP_MS };
      clock = marks[6];
      fromX = spot.x;
      fromY = dropYOf(spot);
      return g;
    });
    const last = grabs[grabs.length - 1];
    const endAt = last.lands;
    const dropY = (g: (typeof grabs)[number]) => dropYOf(g.spot);
    // the claw's spot and how open its prongs are
    const claw = { x: pile.x, y: railY, open: OPEN };
    const legOf = (m: number[], i: number, ms: number) =>
      smoothstep(clamp01((ms - m[i]) / (m[i + 1] - m[i])));
    const clawAt = (ms: number) => {
      claw.x = pile.x;
      claw.y = railY;
      claw.open = OPEN;
      for (const g of grabs) {
        const m = g.marks;
        if (ms < m[0]) break;
        claw.x = lerp([g.fromX, pile.x], legOf(m, 0, ms));
        claw.y =
          lerp([g.fromY, railY], legOf(m, 0, ms)) +
          (pile.y - HEAP - railY) * legOf(m, 1, ms);
        claw.open = lerp([OPEN, SHUT], legOf(m, 2, ms));
        claw.y -= (pile.y - HEAP - railY) * legOf(m, 3, ms);
        claw.x = lerp([claw.x, g.spot.x], legOf(m, 4, ms));
        claw.y += (dropY(g) - railY) * legOf(m, 4, ms);
        if (ms >= m[5]) claw.open = lerp([SHUT, OPEN], legOf(m, 5, ms));
      }
      return claw;
    };
    const prongs = [-1, 0, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        const c = clawAt(ms);
        at.x = c.x + side * c.open;
        at.y = c.y + (side === 0 ? -6 : 4);
        return at;
      };
    });
    const prizes = grabs.map((g) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const m = g.marks;
        if (ms < m[2] || ms >= g.lands) return null;
        if (ms < m[6]) {
          const c = clawAt(ms);
          at.x = c.x;
          at.y = c.y + 14;
          return at;
        }
        const u = easeIn((ms - m[6]) / DROP_MS);
        at.x = g.spot.x;
        at.y = lerp([dropY(g) + 14, g.spot.y], u);
        return at;
      };
    });

    const paths: CoinPath[] = Array.from({ length: PILE_COINS }, () => {
      const u = Math.random() * 2 - 1;
      const rest: Point = {
        x: pile.x + u * (PILE / 2),
        y: pile.y - Math.random() * HEAP * (1 - u * u),
      };
      const poured = Math.random() * pileMs * 0.7;
      return (f) => {
        const ms = f * endAt;
        if (ms < poured) return { x: button.x, y: button.y, scale: 0 };
        const p = easeOut(clamp01((ms - poured) / (pileMs * 0.3)));
        return {
          x: lerp([button.x, rest.x], p),
          y: lerp([button.y, rest.y], p),
          scale: COIN,
        };
      };
    });
    const cableTop: Point = { x: 0, y: area.top };
    const cableEnd: Point = { x: 0, y: 0 };

    const moving = createBeats(
      grabs,
      (g) => g.marks[0],
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const clamping = createBeats(
      grabs,
      (g) => g.marks[3],
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      grabs,
      (g) => g.lands,
      (g, k) => {
        giveHire(g.hire);
        if (g === last) {
          cover!.blast(g.spot);
          return;
        }
        cover!.burst(g.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, grabs.length - 1)));
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
          moving.tick(ms, now);
          clamping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          if (ms <= endAt) {
            const c = clawAt(ms);
            cableTop.x = cableEnd.x = c.x;
            cableEnd.y = c.y - 8;
            drawBeam(ctx, cableTop, cableEnd, CABLE, 0.7);
          }
          for (const prong of prongs)
            drawWispBetween(
              ctx,
              prong,
              ms,
              now,
              WISP_SIZE * PRONG,
              0.5,
              0,
              endAt,
            );
          grabs.forEach((g, k) =>
            drawWispBetween(
              ctx,
              prizes[k],
              ms,
              now,
              WISP_SIZE * PRIZE,
              1,
              g.marks[2],
              g.lands,
            ),
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
