// the "Inkblot" event (money; cash): it covers its crit, whose click
// freezes the screen while cash splats out of a line down the middle of
// the screen in great mirrored blots like a Rorschach inkblot test, blot
// after blot blooming out both ways at once, each a splat and a jolt, ever
// faster, into a big symmetrical butterfly of cash; then the two halves
// fold shut on the middle like the paper closing, in a slap and a big
// jolt, and the whole blot surges into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "inkblot";
const REWARD = 4;
const BLOTS = 6;
const PER_BLOT = 230;
const COIN = 0.5;
// each blot sits OUT px off the middle line, RADIUS px round, its rim
// lumpy by LUMPS; blots spread down Y of the screen
const OUT: [number, number] = [40, 150];
const RADIUS: [number, number] = [45, 85];
const LUMPS = [0.3, 0.18];
const Y: [number, number] = [0.15, 0.85];
const SURGE_SPREAD = 260;
const LIFT = 70;
const SPLAT_SHAKE: [number, number] = [0.5, 1.1];

export const forceInkblotEvent = registerWispEvent(
  KEY,
  "Inkblot",
  () => CONFIG.inkblotEvent.chance,
  (floor, context, area) => {
    const { gapsMs, bloomMs, foldMs, flightMs, holdMs, mergeMs } =
      CONFIG.inkblotEvent;
    const fallback = totalSpot(area);
    const axis = (area.left + area.right) / 2;
    const height = area.bottom - area.top;
    let clock = 0;
    const blots = Array.from({ length: BLOTS }, (_, k) => {
      const splats = clock;
      clock += lerp(gapsMs, k / (BLOTS - 1));
      return {
        splats,
        out: lerp(OUT, Math.random()),
        y: area.top + height * lerp(Y, (k + Math.random()) / BLOTS),
        radius: lerp(RADIUS, Math.random()),
        phase: [Math.random() * 6, Math.random() * 6],
      };
    });
    const foldAt = blots[BLOTS - 1].splats + bloomMs + 150;
    const surgeAt = foldAt + foldMs;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = [];
    for (const blot of blots) {
      for (let i = 0; i < PER_BLOT; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const angle = Math.random() * Math.PI * 2;
        const rim =
          blot.radius *
          (1 +
            LUMPS[0] * Math.sin(3 * angle + blot.phase[0]) +
            LUMPS[1] * Math.sin(5 * angle + blot.phase[1]));
        const r = rim * Math.sqrt(Math.random());
        // mirrored: the same blot both sides of the line
        const dx = blot.out + Math.cos(angle) * r;
        const rest: Point = {
          x: axis + side * Math.abs(dx),
          y: blot.y + Math.sin(angle) * r,
        };
        const folded: Point = { x: axis + side * 4, y: rest.y };
        const leaves = surgeAt + Math.random() * SURGE_SPREAD;
        const lift: Point = { x: folded.x, y: folded.y - LIFT };
        const at: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < blot.splats) return { x: axis, y: blot.y, scale: 0 };
          if (ms < foldAt) {
            const u = easeOutBack(clamp01((ms - blot.splats) / bloomMs));
            return {
              x: lerp([axis, rest.x], u),
              y: lerp([blot.y, rest.y], u),
              scale: COIN,
            };
          }
          if (ms < leaves) {
            const u = easeIn(clamp01((ms - foldAt) / foldMs));
            return { x: lerp([rest.x, folded.x], u), y: rest.y, scale: COIN };
          }
          const total = cover?.total() ?? fallback;
          bezier(
            folded,
            lift,
            total,
            easeIn(clamp01((ms - leaves) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    }

    const splatting = createBeats(
      blots,
      (b) => b.splats,
      (b, k) => {
        cover!.burst({ x: axis - b.out, y: b.y }, 0.35);
        cover!.burst({ x: axis + b.out, y: b.y }, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPLAT_SHAKE, k / (BLOTS - 1)));
      },
    );
    const finale = createBeats(
      [surgeAt, endAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        cover!.burst({ x: axis, y: (area.top + area.bottom) / 2 }, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.5);
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
          splatting.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
