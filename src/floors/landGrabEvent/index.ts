// the "Land Grab" event (experiment: the Qix arcade game; cash): it covers
// its crit, whose click freezes the screen while a cutter wisp shoots out of
// the clicked floor's button and slices a line of light clean across the
// screen; the piece it cuts off is claimed: its edges blaze and it spews a
// fountain of coins with a bang and a jolt; it slices again and again
// through what's left, ever faster, the claims ever smaller, until the last
// piece is claimed in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { drawBeam } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";

const KEY = "landGrab";
const REWARD = 4;
const CUTS = 5;
const EDGE = 50;
const TOP = 160;
const MOVE_MS = 140;
// each cut claims CLAIM of what's left
const CLAIM: [number, number] = [0.3, 0.45];
const LINE_WIDTH = 10;
const EDGE_WIDTH = 18;
const BLAZE_MS = 320;
const COINS_PER_PX = 0.0009;
const MAX_COINS = 60;
const CUTTER = 0.45;
const CLAIM_SHAKE: [number, number] = [0.6, 1.3];

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const forceLandGrabEvent = registerWispEvent(
  KEY,
  "Land Grab",
  () => CONFIG.landGrabEvent.chance,
  (floor, context, area) => {
    const { cutsMs, holdMs, mergeMs } = CONFIG.landGrabEvent;
    const button = getButtonCenter(context.isGroundFloor);
    let left: Box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + TOP,
      bottom: area.bottom - EDGE,
    };
    let clock = 0;
    let from: Point = button;
    const corners = (b: Box): Point[] => [
      { x: b.left, y: b.top },
      { x: b.right, y: b.top },
      { x: b.right, y: b.bottom },
      { x: b.left, y: b.bottom },
      { x: b.left, y: b.top },
    ];
    const coinsIn = (b: Box): Point[] => {
      const n = Math.min(
        MAX_COINS,
        Math.round((b.right - b.left) * (b.bottom - b.top) * COINS_PER_PX) + 8,
      );
      return Array.from({ length: n }, () => ({
        x: lerp([b.left, b.right], Math.random()),
        y: lerp([b.top, b.bottom], Math.random()),
      }));
    };
    const cuts = Array.from({ length: CUTS }, (_, k) => {
      const final = k === CUTS - 1;
      const wide = left.right - left.left > left.bottom - left.top;
      const share = lerp(CLAIM, Math.random());
      const flip = Math.random() < 0.5;
      let a: Point;
      let b: Point;
      let claim: Box;
      let rest: Box;
      if (wide) {
        const x = flip
          ? lerp([left.left, left.right], share)
          : lerp([left.right, left.left], share);
        a = { x, y: left.top };
        b = { x, y: left.bottom };
        claim = flip ? { ...left, right: x } : { ...left, left: x };
        rest = flip ? { ...left, left: x } : { ...left, right: x };
      } else {
        const y = flip
          ? lerp([left.top, left.bottom], share)
          : lerp([left.bottom, left.top], share);
        a = { x: left.left, y };
        b = { x: left.right, y };
        claim = flip ? { ...left, bottom: y } : { ...left, top: y };
        rest = flip ? { ...left, top: y } : { ...left, bottom: y };
      }
      const moves = clock;
      const cuts = moves + MOVE_MS;
      const claims = cuts + lerp(cutsMs, k / (CUTS - 1));
      clock = claims;
      const cut = {
        from,
        a,
        b,
        tip: { x: a.x, y: a.y },
        moves,
        cuts,
        claims,
        final,
        // the last claim takes everything that's left
        edges: corners(claim),
        finalEdges: corners(rest),
        coins: final ? [...coinsIn(claim), ...coinsIn(rest)] : coinsIn(claim),
        middle: {
          x: (claim.left + claim.right) / 2,
          y: (claim.top + claim.bottom) / 2,
        },
      };
      from = b;
      left = rest;
      return cut;
    });
    const last = cuts[CUTS - 1];
    const endAt = last.claims;
    const cutterAt: Point = { x: 0, y: 0 };
    const cutter = (ms: number): Point => {
      let c = cuts[0];
      for (const cut of cuts) if (ms >= cut.moves) c = cut;
      if (ms < c.cuts) {
        const u = easeOut(clamp01((ms - c.moves) / MOVE_MS));
        cutterAt.x = lerp([c.from.x, c.a.x], u);
        cutterAt.y = lerp([c.from.y, c.a.y], u);
        return cutterAt;
      }
      const u = clamp01((ms - c.cuts) / (c.claims - c.cuts));
      cutterAt.x = lerp([c.a.x, c.b.x], u);
      cutterAt.y = lerp([c.a.y, c.b.y], u);
      return cutterAt;
    };

    const cutting = createBeats(
      cuts,
      (c) => c.cuts,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const claiming = createBeats(
      cuts,
      (c) => c.claims,
      (c, k) => {
        cover!.launchFrom(c.b, c.coins);
        if (c.final) {
          cover!.blast(c.b);
          return;
        }
        cover!.burst(c.middle, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLAIM_SHAKE, k / (CUTS - 1)));
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
          cutting.tick(ms, now);
          claiming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BLAZE_MS) return;
          for (const c of cuts) {
            if (ms < c.cuts) continue;
            const u = clamp01((ms - c.cuts) / (c.claims - c.cuts));
            c.tip.x = lerp([c.a.x, c.b.x], u);
            c.tip.y = lerp([c.a.y, c.b.y], u);
            drawBeam(ctx, c.a, c.tip, LINE_WIDTH, 0.8);
            const t = (ms - c.claims) / BLAZE_MS;
            if (t < 0 || t >= 1) continue;
            for (let i = 1; i < c.edges.length; i++)
              drawBeam(
                ctx,
                c.edges[i - 1],
                c.edges[i],
                EDGE_WIDTH * (1 - t),
                1 - t,
              );
            if (c.final)
              for (let i = 1; i < c.finalEdges.length; i++)
                drawBeam(
                  ctx,
                  c.finalEdges[i - 1],
                  c.finalEdges[i],
                  EDGE_WIDTH * (1 - t),
                  1 - t,
                );
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              cutter,
              ms,
              now,
              WISP_SIZE * CUTTER,
              1,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
