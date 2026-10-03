// the "Beam Splitter" event (beam; crit tiers): it covers its crit, whose
// click freezes the screen while a blazing beam fires up out of the clicked
// floor's button into a splitter wisp hanging above, which splits it in two
// diverging beams; each lands on another splitter that splits it again, a
// tree of beams fanning out generation by generation, every split a flare,
// a crack and a jolt, until the last generation's tips all land on the
// income bars at once, burning each a crit tier in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars } from "../eventRewards";

const KEY = "beamSplitter";
const MAX_BARS = 4;
// splitter rows: 1, 2 then 4 wisps, then 8 tips on the bars
const ROWS = 3;
const TOP = 130;
const ROW_GAP = 110;
const WIDTHS = [34, 26, 20, 16];
const SPLITTER = 0.42;
const FLASH_MS = 160;
const FADE_MS = 220;
const FLARE = 30;
const TIP_FLARE = 54;
const BANG_GAP_MS = 60;
const SPLIT_SHAKE: [number, number] = [0.6, 1.3];

interface Node {
  at: Point;
  lands: number;
  gen: number;
  hold: () => Point;
}

interface Segment {
  from: Point;
  to: Point;
  tip: Point;
  starts: number;
  lands: number;
  width: number;
}

export const forceBeamSplitterEvent = registerWispEvent(
  KEY,
  "Beam Splitter",
  () => CONFIG.beamSplitterEvent.chance,
  (floor, context, area) => {
    const { genMs, holdMs, mergeMs } = CONFIG.beamSplitterEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left;
    const width = area.right - area.left;
    const topBar = Math.min(...bars.map((b) => b.box.y));
    // the rows squeeze up when the top bar sits high
    const gap = Math.max(
      50,
      Math.min(ROW_GAP, (topBar - 60 - area.top - TOP) / (ROWS - 1)),
    );
    const genAt = (g: number) => lerp(genMs, g / ROWS);
    const nodes: Node[] = [];
    const segments: Segment[] = [];
    let clock = 0;
    let previous: Point[] = [button];
    for (let g = 0; g < ROWS; g++) {
      const count = 2 ** g;
      const starts = clock;
      const lands = starts + genAt(g);
      clock = lands;
      const row = Array.from(
        { length: count },
        (_, i): Point => ({
          x: left + width * ((i + 0.5) / count),
          y: area.top + TOP + gap * g,
        }),
      );
      row.forEach((at, i) => {
        nodes.push({ at, lands, gen: g, hold: () => at });
        segments.push({
          from: previous[g === 0 ? 0 : i >> 1],
          to: at,
          tip: { x: 0, y: 0 },
          starts,
          lands,
          width: WIDTHS[g],
        });
      });
      previous = row;
    }
    // the last generation: two tips per splitter, landing on the bars in turn
    const tipsStart = clock;
    const endAt = tipsStart + genAt(ROWS);
    const tips = Array.from({ length: 2 ** ROWS }, (_, j) => {
      const bar = bars[Math.floor((j * bars.length) / 2 ** ROWS)];
      const at: Point = {
        x: bar.box.x + bar.box.width * (0.15 + 0.7 * ((j * 0.37 + 0.2) % 1)),
        y: bar.center.y,
      };
      segments.push({
        from: previous[j >> 1],
        to: at,
        tip: { x: 0, y: 0 },
        starts: tipsStart,
        lands: endAt,
        width: WIDTHS[ROWS],
      });
      return { bar, at, from: previous[j >> 1] };
    });
    let lastBang = -Infinity;

    const splitting = createBeats(
      nodes,
      (n) => n.lands,
      (n, k) => {
        cover!.burst(n.at, 0.4 + 0.15 * n.gen);
        if (!cover!.isLive() || n.lands - lastBang < BANG_GAP_MS) return;
        lastBang = n.lands;
        playExplosion();
        shakeScreen(lerp(SPLIT_SHAKE, k / Math.max(1, nodes.length - 1)));
      },
    );
    const landing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        const done = new Set<(typeof bars)[number]>();
        for (const tip of tips) {
          if (done.has(tip.bar)) {
            cover!.burst(tip.at, 0.6);
            continue;
          }
          done.add(tip.bar);
          cover!.tierUp(tip.bar, tip.from);
          cover!.slam(tip.bar);
        }
        cover!.blast(bars[0].center);
        if (cover!.isLive()) playExplosion();
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
          splitting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FADE_MS + FLASH_MS) return;
          const fade = 1 - clamp01((ms - endAt) / FADE_MS);
          const pulse = 0.85 + 0.15 * Math.sin(now / 30);
          const blaze = ms >= endAt ? 1.8 : 1;
          for (const s of segments) {
            if (ms < s.starts) continue;
            const grow = easeOut(
              clamp01((ms - s.starts) / (s.lands - s.starts)),
            );
            s.tip.x = lerp([s.from.x, s.to.x], grow);
            s.tip.y = lerp([s.from.y, s.to.y], grow);
            drawBeam(ctx, s.from, s.tip, s.width * pulse * blaze * fade, fade);
          }
          for (const n of nodes) {
            if (ms < n.lands) continue;
            const t = (ms - n.lands) / FLASH_MS;
            const flash = t < 1 ? 1 - t : 0;
            drawBeamFlare(ctx, n.at, FLARE * (0.6 + flash), fade, now);
            drawWispBetween(
              ctx,
              n.hold,
              ms,
              now,
              WISP_SIZE * SPLITTER,
              flash,
              n.lands,
              endAt,
            );
          }
          if (ms >= endAt)
            for (const tip of tips)
              drawBeamFlare(ctx, tip.at, TIP_FLARE * (0.6 + fade), fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
