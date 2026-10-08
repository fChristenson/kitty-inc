// the "Gravitational Lens" event (galaxy; free hires): it covers its crit,
// whose click freezes the screen while a galaxy of glitter swirls up in the
// middle of it; a heavy wisp drifts in front of it, slowing, and its gravity
// bends the starlight round it: stars near it smear into bright arcs and
// split into twin images, every arc that sweeps through it a pop and a
// jolt; it settles dead in front of the core, whose light wraps all the way
// round it into a blazing Einstein ring with a shake; then the ring breaks
// into pieces flung off round it, each arcing down onto an empty spot as a
// new worker, the last in a big blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { planDisk, scatterDisk } from "../../../../shared/galaxy";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "gravitationalLens";
const MAX_PIECES = 5;
const STARS = 300;
const STAR = 8;
const DISK = 0.4;
const OUTER = 300;
const INNER = 20;
const SQUASH = 0.6;
const CORE = WISP_SIZE * 1.1;
// the lens: drifts in from this far off, bending light within EINSTEIN px
const LENS = WISP_SIZE * 0.7;
const FROM: Point = { x: -480, y: -70 };
const EINSTEIN = 80;
const MAX_ZOOM = 2.6;
const RING_DOTS = 56;
const RING_DOT = 16;
const FLING = 200;
const PIECE = WISP_SIZE * 0.8;
const ARC_SHAKE = 0.3;
const RING_SHAKE = 1.1;
const LAND_SHAKE = 0.6;

interface Piece {
  hire: RewardHire;
  flings: number;
  lands: number;
  flight: (ms: number) => Point | null;
}

export const forceGravitationalLensEvent = registerWispEvent(
  KEY,
  "Gravitational Lens",
  () => CONFIG.gravitationalLensEvent.chance,
  (floor, context, area) => {
    const { growMs, driftMs, ringMs, gapMs, dropMs, holdMs, mergeMs } =
      CONFIG.gravitationalLensEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_PIECES);
    if (hires.length === 0) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.4),
    };
    const outer = Math.min(OUTER, (area.right - area.left) * DISK);
    const disk = planDisk(centre, {
      inner: INNER,
      outer,
      squash: SQUASH,
      tilt: -0.2,
      rimHz: 0.7,
    });
    const stars = scatterDisk(disk, STARS);
    const alignAt = growMs + driftMs;
    const breakAt = alignAt + ringMs;
    const lens: Point = { x: 0, y: 0 };
    const lensAt = (ms: number): Point => {
      const u = 1 - clamp01((ms - growMs * 0.5) / (alignAt - growMs * 0.5));
      lens.x = centre.x + FROM.x * u * u;
      lens.y = centre.y + FROM.y * u * u;
      return lens;
    };

    // the ring breaks into pieces flung off round it onto the spots
    const n = hires.length;
    const pieces: Piece[] = hires.map((hire, k) => {
      const a = (k / n) * Math.PI * 2 - Math.PI / 2;
      const from: Point = {
        x: centre.x + Math.cos(a) * EINSTEIN,
        y: centre.y + Math.sin(a) * EINSTEIN,
      };
      const bow: Point = {
        x: from.x - Math.sin(a) * FLING,
        y: from.y + Math.cos(a) * FLING,
      };
      const to: Point = { x: hire.x, y: hire.y };
      const flings = breakAt + k * gapMs;
      const lands = flings + dropMs;
      const spot: Point = { x: 0, y: 0 };
      return {
        hire,
        flings,
        lands,
        flight: (ms) =>
          ms < flings || ms > lands
            ? null
            : bezier(from, bow, to, easeIn((ms - flings) / dropMs), spot),
      };
    });
    const last = pieces[pieces.length - 1];
    const endMs = last.lands;

    const drifting = createBeats(
      [
        0,
        alignAt - driftMs * 0.45,
        alignAt - driftMs * 0.25,
        alignAt - driftMs * 0.1,
      ],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        if (ms === 0) {
          playSwoosh();
          return;
        }
        playBloop();
        shakeScreen(ARC_SHAKE);
      },
    );
    const ringing = createBeats(
      [alignAt],
      (ms) => ms,
      () => {
        cover!.burst(centre, 1.2);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(RING_SHAKE);
      },
    );
    const landing = createBeats(
      pieces,
      (p) => p.lands,
      (p) => {
        giveHire(p.hire);
        const at = { x: p.hire.x, y: p.hire.y };
        if (p === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        playBloop();
      },
    );

    const star: Point = { x: 0, y: 0 };
    const centreAt = () => centre;
    const lensSpot = (ms: number) => lensAt(ms);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          drifting.tick(ms, now);
          ringing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - breakAt) / 400);
          const l = lensAt(ms);
          // every star seen through the lens: pushed out round it, with a
          // faint twin on the far side when it's close
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < stars.length; i++) {
            disk.at(stars[i], ms, star, grow);
            const dx = star.x - l.x;
            const dy = star.y - l.y;
            const b = Math.hypot(dx, dy) || 0.01;
            const root = Math.sqrt(b * b + 4 * EINSTEIN * EINSTEIN);
            const zoom = Math.min(MAX_ZOOM, 1 + (EINSTEIN / b) * 0.7);
            const color = i % 2 ? COLOR.heavenlyGold : COLOR.white;
            const out = (b + root) / 2 / b;
            stampGlimmer(
              ctx,
              l.x + dx * out,
              l.y + dy * out,
              STAR * zoom,
              i,
              color,
            );
            if (b < EINSTEIN * 1.5) {
              const twin = (b - root) / 2 / b;
              stampGlimmer(
                ctx,
                l.x + dx * twin,
                l.y + dy * twin,
                STAR * zoom * 0.6,
                i,
                color,
              );
            }
          }
          // the core's light wrapped round the lens as it lines up
          const core = Math.hypot(centre.x - l.x, centre.y - l.y);
          const ring = Math.exp(-core / (EINSTEIN * 0.6));
          if (ring > 0.05) {
            for (let k = 0; k < RING_DOTS; k++) {
              const a = (k / RING_DOTS) * Math.PI * 2 + now / 900;
              const r = EINSTEIN * (1 + 0.04 * Math.sin(now / 60 + k));
              stampGlimmer(
                ctx,
                l.x + Math.cos(a) * r,
                l.y + Math.sin(a) * r,
                RING_DOT * ring,
                a * 3,
                k % 2 ? COLOR.white : COLOR.heavenlyGold,
              );
            }
          }
          ctx.restore();
          if (ring < 0.5)
            drawWisp(ctx, centreAt, ms, now, CORE * grow * (1 - ring), 0.6);
          if (fade > 0) drawWisp(ctx, lensSpot, ms, now, LENS * fade, 0.2);
          for (const p of pieces)
            drawWispBetween(
              ctx,
              p.flight,
              ms,
              now,
              PIECE,
              1,
              p.flings,
              p.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
