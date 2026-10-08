// the "Laser Web" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while six wisps burst out of the clicked floor's button
// and fan into a hexagon round an income bar; beams snap between them into a
// glowing web, rim and spokes, that turns as it tightens, then cinches down
// onto the bar with a crack and a jolt as the bar jumps a crit tier; the
// wisps spring out of it into a web round the next bar, quicker each time,
// the last cinching in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "laserWeb";
const MAX_BARS = 4;
const NODES = 6;
const FORM = 0.35;
const CINCH = 0.7;
const OUT_X = 50;
const OUT_Y = 70;
const SPIN = 0.9;
const WIDTH = 10;
const NODE = 0.32;
const CINCH_SHAKE: [number, number] = [0.7, 1.4];

interface Web {
  bar: RewardBar;
  from: Point;
  starts: number;
  ends: number;
  rx: number;
  ry: number;
  final: boolean;
}

export const forceLaserWebEvent = registerWispEvent(
  KEY,
  "Laser Web",
  () => CONFIG.laserWebEvent.chance,
  (floor, context) => {
    const { websMs, holdMs, mergeMs } = CONFIG.laserWebEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const webs: Web[] = bars.map((bar, k) => {
      const starts = clock;
      clock += lerp(websMs, k / Math.max(1, bars.length - 1));
      const web = {
        bar,
        from,
        starts,
        ends: clock,
        rx: bar.box.width / 2 + OUT_X,
        ry: bar.box.height / 2 + OUT_Y,
        final: k === bars.length - 1,
      };
      from = bar.center;
      return web;
    });
    const endAt = clock;
    const webAt = (ms: number): Web => {
      let w = webs[0];
      for (const web of webs) if (ms >= web.starts) w = web;
      return w;
    };
    const place = (i: number, ms: number, into: Point): Point => {
      const t = Math.max(0, Math.min(ms, endAt));
      const w = webAt(t);
      const u = clamp01((t - w.starts) / (w.ends - w.starts));
      const a = (i / NODES) * Math.PI * 2 + SPIN * u;
      const squeeze = 1 - 0.88 * easeIn(clamp01((u - CINCH) / (1 - CINCH)));
      const rx = w.bar.center.x + Math.cos(a) * w.rx * squeeze;
      const ry = w.bar.center.y + Math.sin(a) * w.ry * squeeze;
      const out = easeOut(clamp01(u / FORM));
      into.x = lerp([w.from.x, rx], out);
      into.y = lerp([w.from.y, ry], out);
      return into;
    };
    const nodes = Array.from({ length: NODES }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => place(i, ms, at);
    });
    const spots: Point[] = Array.from({ length: NODES }, () => ({
      x: 0,
      y: 0,
    }));

    const cinching = createBeats(
      webs,
      (w) => w.ends,
      (w, k) => {
        cover!.tierUp(w.bar);
        if (w.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(w.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(w.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CINCH_SHAKE, k / Math.max(1, webs.length - 1)));
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
        tick: (ms, now) => cinching.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const w = webAt(ms);
          const u = clamp01((ms - w.starts) / (w.ends - w.starts));
          const joined = clamp01((u - FORM) / 0.1);
          if (joined > 0) {
            for (let i = 0; i < NODES; i++) place(i, ms, spots[i]);
            const width = WIDTH * (1 + 2 * clamp01((u - CINCH) / (1 - CINCH)));
            for (let i = 0; i < NODES; i++) {
              drawBeam(ctx, spots[i], spots[(i + 1) % NODES], width, joined);
              if (i < NODES / 2)
                drawBeam(
                  ctx,
                  spots[i],
                  spots[i + NODES / 2],
                  width * 0.6,
                  joined,
                );
            }
          }
          for (const node of nodes)
            drawWispBetween(
              ctx,
              node,
              ms,
              now,
              WISP_SIZE * NODE,
              0.6,
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
