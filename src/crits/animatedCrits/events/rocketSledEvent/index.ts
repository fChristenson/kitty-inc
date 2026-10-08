// the "Rocket Sled" event (explosion; crit tiers): it covers its crit, whose
// click freezes the screen while a sled wisp drops out of the clicked
// floor's button onto the end of an income bar and lights its rockets: it
// blasts off down the bar, every boost a big blast behind it, the blasts
// chaining along the bar faster and faster, until it slams into the far
// end in a cluster of blasts, a big jolt and the bar jumping a crit tier;
// then onto the next bar, the last run ending round a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars } from "../../eventRewards";

const KEY = "rocketSled";
const MAX_BARS = 3;
const RIDE = 14;
const BOOSTS = 4;
const CLUSTER = 4;
const CLUSTER_REACH = 60;
const DROP_MS = 180;
const SLED = 0.48;
const FUSE = 18;
const BOOST_BLAST = 170;
const CLUSTER_BLAST = 120;
const END_BLAST = 230;
const FINALE_BLAST = 360;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceRocketSledEvent = registerWispEvent(
  KEY,
  "Rocket Sled",
  () => CONFIG.rocketSledEvent.chance,
  (floor, context) => {
    const { runsMs, holdMs, mergeMs } = CONFIG.rocketSledEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    let clock = 0;
    let from: Point = button;
    const runs = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const y = bar.box.y - RIDE;
      const a: Point = { x: ltr ? bar.box.x : bar.box.x + bar.box.width, y };
      const b: Point = { x: ltr ? bar.box.x + bar.box.width : bar.box.x, y };
      const drops = clock;
      const fires = drops + DROP_MS;
      const ms = lerp(runsMs, k / Math.max(1, bars.length - 1));
      const ends = fires + ms;
      // boosts behind the sled as it speeds up (x = u²)
      for (let i = 0; i < BOOSTS; i++) {
        const u = i / BOOSTS;
        blasts.push({
          at: { x: lerp([a.x, b.x], u * u), y },
          ms: fires + ms * u,
          size: BOOST_BLAST,
          shake: 0.6 + 0.15 * i,
        });
      }
      const final = k === bars.length - 1;
      blasts.push({
        at: b,
        ms: ends,
        size: final ? FINALE_BLAST : END_BLAST,
        shake: final ? 1.6 : 1.2,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const ang = (c / CLUSTER) * Math.PI * 2;
        blasts.push({
          at: {
            x: b.x + Math.cos(ang) * CLUSTER_REACH,
            y: b.y + Math.sin(ang) * CLUSTER_REACH * 0.7,
          },
          ms: ends + 50 + c * 25,
          size: CLUSTER_BLAST,
          shake: 0.7,
        });
      }
      const run = { bar, from, a, b, drops, fires, ends, final };
      from = b;
      clock = ends + 120;
      return run;
    });
    const last = runs[runs.length - 1];
    const endAt = last.ends;
    const sledAt: Point = { x: 0, y: 0 };
    const sled = (ms: number): Point => {
      let r = runs[0];
      for (const run of runs) if (ms >= run.drops) r = run;
      if (ms < r.fires) {
        const u = easeOut(clamp01((ms - r.drops) / DROP_MS));
        sledAt.x = lerp([r.from.x, r.a.x], u);
        sledAt.y = lerp([r.from.y, r.a.y], u);
        return sledAt;
      }
      const u = clamp01((ms - r.fires) / (r.ends - r.fires));
      sledAt.x = lerp([r.a.x, r.b.x], u * u);
      sledAt.y = r.a.y;
      return sledAt;
    };
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const ending = createBeats(
      runs,
      (r) => r.ends,
      (r) => {
        cover!.tierUp(r.bar, r.a);
        if (!r.final) return;
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(r.b);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          booming.tick(ms, now);
          ending.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          if (ms >= endAt) return;
          drawLitFuse(ctx, sled(ms), ms / endAt, FUSE, now);
          drawWispBetween(
            ctx,
            sled,
            ms,
            now,
            WISP_SIZE * SLED,
            0.6 + 0.4 * (ms / endAt),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
