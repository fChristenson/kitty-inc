// the "Black Hole Merger" event (clutter; a crit tier): it covers its crit,
// whose click freezes the screen while glitter ripples out over the whole
// screen in rings; two gravity holes tear open on either side of it and
// orbit each other, spiralling in ever faster, each gulping the glitter in
// its path into its throat, every half orbit a whoosh and a jolt; they
// collide in the middle in a blinding flash and merge into one big hole
// holding the whole mess, which sinks onto the clicked floor's bar, the bar
// jumping a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawGravityHole,
  scatterRings,
  simulateClean,
  type GravityHole,
} from "../../../../shared/clutter";
import { findRewardBars } from "../../eventRewards";

const KEY = "blackHoleMerger";
const BITS = 420;
const BIT = 10;
const MARGIN = 40;
const RING_GAP = 70;
// the holes start this share of the screen's width out, TURNS orbits
// before they meet; their pull swells to GULP as they close in
const ORBIT = 0.3;
const TURNS = 2;
const SQUASH = 0.8;
const PULL = 0.04;
const GULP = 0.35;
const CORE = 36;
const SWIRL = 0.6;
const HOLE: [number, number] = [80, 120];
const MERGED = 190;
const OPEN_MS = 180;
const GATHER_MS = 160;
const HEAP = 0.6;
const RIPPLE_SHAKE = 0.3;
const ORBIT_SHAKE: [number, number] = [0.3, 0.8];
const MERGE_SHAKE = 1.5;

export const forceBlackHoleMergerEvent = registerWispEvent(
  KEY,
  "Black Hole Merger",
  () => CONFIG.blackHoleMergerEvent.chance,
  (floor, context, area) => {
    const { rippleMs, spiralMs, sinkMs, holdMs, mergeMs } =
      CONFIG.blackHoleMergerEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const box = {
      left: area.left + MARGIN,
      top: area.top + MARGIN,
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const centre: Point = {
      x: (box.left + box.right) / 2,
      y: (box.top + box.bottom) / 2,
    };
    const spots = scatterRings(box, BITS, RING_GAP);
    const far = Math.max(
      ...spots.map((p) => Math.hypot(p.x - centre.x, p.y - centre.y)),
    );
    // each bit pops in as the ripple reaches it
    const appears = spots.map(
      (p) =>
        (rippleMs * 0.8 * Math.hypot(p.x - centre.x, p.y - centre.y)) / far,
    );

    const openAt = rippleMs;
    const meetAt = openAt + spiralMs;
    const r0 = (box.right - box.left) * ORBIT;
    const uAt = (ms: number) => clamp01((ms - openAt) / spiralMs);
    // the pair's spacing shrinks and their spin quickens as they close in
    const angleAt = (u: number) => Math.PI * 2 * TURNS * u ** 1.6;
    const holeAt =
      (side: number) =>
      (ms: number, into: Point): Point | null => {
        if (ms < openAt) return null;
        const u = uAt(ms);
        const r = r0 * (1 - u) ** 0.7;
        const a = angleAt(u) + (side > 0 ? 0 : Math.PI);
        into.x = centre.x + Math.cos(a) * r;
        into.y = centre.y + Math.sin(a) * r * SQUASH;
        return into;
      };
    const pull = (ms: number) =>
      lerp([PULL, GULP], smoothstep(clamp01((uAt(ms) - 0.5) / 0.5)));
    const holes: GravityHole[] = [1, -1].map((side) => ({
      kind: "hole",
      at: holeAt(side),
      pull,
      core: CORE,
      swirl: SWIRL,
    }));
    const swept = simulateClean(spots, holes, openAt, meetAt);
    // the merged hole's heap: every bit pulled in tight round the middle
    const settled = spots.map((_, i) => {
      const end = swept.end(i);
      const dx = end.x - centre.x;
      const dy = end.y - centre.y;
      const k = Math.min(1, (CORE * HEAP) / (Math.hypot(dx, dy) || 1));
      return { x: dx * k, y: dy * k };
    });
    const sinkAt = meetAt + GATHER_MS;
    const landAt = sinkAt + sinkMs;
    const sunkAt = (ms: number, into: Point): Point => {
      const u = easeIn(clamp01((ms - sinkAt) / sinkMs));
      into.x = lerp([centre.x, bar.center.x], u);
      into.y = lerp([centre.y, bar.center.y], u);
      return into;
    };

    // a jolt every half orbit
    const halves: number[] = [];
    for (let k = 1; k < TURNS * 2; k++)
      halves.push(
        openAt +
          spiralMs * ((k * Math.PI) / (Math.PI * 2 * TURNS)) ** (1 / 1.6),
      );
    const rippling = createBeats(
      [0, rippleMs * 0.4],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(RIPPLE_SHAKE);
      },
    );
    const orbiting = createBeats(
      [openAt, ...halves],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(ORBIT_SHAKE, k / halves.length));
      },
    );
    const merging = createBeats(
      [meetAt, landAt],
      (ms) => ms,
      (ms) => {
        if (ms >= landAt) {
          cover!.tierUp(bar, centre);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(centre, 1.3);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(MERGE_SHAKE);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const hole: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: landAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          rippling.tick(ms, now);
          orbiting.tick(ms, now);
          merging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms >= landAt) return;
          ctx.save();
          if (ms < meetAt) {
            const open = easeOutBack(clamp01((ms - openAt) / OPEN_MS));
            const size = lerp(HOLE, uAt(ms)) * open;
            for (const h of holes)
              if (h.at(ms, hole)) drawGravityHole(ctx, hole, size, 1, ms, now);
          } else {
            const grow = easeOutBack(clamp01((ms - meetAt) / GATHER_MS));
            drawGravityHole(ctx, sunkAt(ms, hole), MERGED * grow, 1, ms, now);
          }
          ctx.globalCompositeOperation = "lighter";
          const gather = clamp01((ms - meetAt) / GATHER_MS);
          if (ms >= meetAt) sunkAt(ms, hole);
          for (let i = 0; i < spots.length; i++) {
            if (ms < appears[i]) continue;
            if (ms < meetAt) swept.at(i, ms, bit);
            else {
              const end = swept.end(i);
              bit.x = lerp([end.x - centre.x, settled[i].x], gather) + hole.x;
              bit.y = lerp([end.y - centre.y, settled[i].y], gather) + hole.y;
            }
            const pop = clamp01((ms - appears[i]) / 120);
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT * pop,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
