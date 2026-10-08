// the "Portcullis" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while blazing bars of light slam down out
// of the top of the screen one after another, ever faster, each a bang and
// a jolt as it hits bottom, until a gate of them stands across the whole
// screen like a portcullis; then a crossbar of light slams across it at
// every income bar in view, top to bottom, each bar jolting with a clang
// and free levels; the whole gate blazes and every bar slams in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "portcullis";
const MAX_BARS = 5;
const POSTS = 7;
const EDGE = 30;
const DROP_MS = 120;
const POST = 12;
const CROSS = 14;
const FLARE = 24;
const POST_SHAKE: [number, number] = [0.4, 0.9];
const CROSS_SHAKE: [number, number] = [0.8, 1.4];

export const forcePortcullisEvent = registerWispEvent(
  KEY,
  "Portcullis",
  () => CONFIG.portcullisEvent.chance,
  (floor, context, area) => {
    const { postsMs, crossesMs, levelShare, holdMs, mergeMs } =
      CONFIG.portcullisEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.center.y - b.center.y);
    if (bars.length === 0) return;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    let clock = 0;
    const posts = Array.from({ length: POSTS }, (_, i) => {
      // from the outside in, alternating sides
      const slot = i % 2 === 0 ? i / 2 : POSTS - 1 - (i - 1) / 2;
      const x = lerp([left, right], slot / (POSTS - 1));
      const drops = clock;
      clock += lerp(postsMs, i / (POSTS - 1));
      return {
        drops,
        lands: drops + DROP_MS,
        top: { x, y: area.top },
        foot: { x, y: area.bottom },
        end: { x, y: area.top },
      };
    });
    clock = posts[POSTS - 1].lands + 100;
    const crosses = bars.map((bar, k) => {
      const at = clock;
      clock += lerp(crossesMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        at,
        from: { x: left, y: bar.center.y },
        to: { x: left, y: bar.center.y },
        far: right,
      };
    });
    const endAt = crosses[crosses.length - 1].at + DROP_MS;

    const dropping = createBeats(
      posts,
      (p) => p.lands,
      (p, k) => {
        cover!.burst(p.foot, 0.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POST_SHAKE, k / (POSTS - 1)));
      },
    );
    const crossing = createBeats(
      crosses,
      (c) => c.at + DROP_MS,
      (c, k) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2), {
          x: right,
          y: c.bar.center.y,
        });
        if (k === crosses.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, k / Math.max(1, crosses.length - 1)));
      },
    );
    const glowAt = (ms: number) =>
      ms > endAt ? Math.max(0, 1 - (ms - endAt) / 500) : 1;

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          dropping.tick(ms, now);
          crossing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const alpha = glowAt(ms);
          if (alpha <= 0) return;
          for (const p of posts) {
            if (ms < p.drops) continue;
            const u = easeIn(clamp01((ms - p.drops) / DROP_MS));
            p.end.y = lerp([area.top, area.bottom], u);
            drawBeam(ctx, p.top, p.end, POST, 0.8 * alpha);
            if (u < 1 || ms < p.lands + 150)
              drawBeamFlare(ctx, p.end, FLARE, alpha, now);
          }
          for (const c of crosses) {
            if (ms < c.at) continue;
            const u = easeIn(clamp01((ms - c.at) / DROP_MS));
            c.to.x = lerp([left, c.far], u);
            drawBeam(ctx, c.from, c.to, CROSS, 0.9 * alpha);
            if (u < 1) drawBeamFlare(ctx, c.to, FLARE, alpha, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
