// the "Deluge" event (spray; free upgrade levels): it covers its crit, whose
// click freezes the screen while a sprinkler head pops open over the top
// income bar with a burst and hisses a cone of glittering gold mist down
// onto it; its spray sets off the next head along, and the next, a deluge
// system tripping head after head across and down the bars, quicker and
// quicker; every bar soaked under its heads is coated gold and flashes with
// a jolt of free levels, the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/spray";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "deluge";
const MAX_BARS = 4;
// heads over each bar, as shares of its width, and how high above it
const SPOTS = [0.28, 0.72];
const ABOVE = 110;
const POP_MS = 120;
const HEAD = 0.4;
const DROPLET = WISP_SIZE * 1.3;
const MIST = WISP_SIZE * 1.8;
const SOAK_MS = 220;
const COAT = 0.55;
const FLASH_MS = 260;
const POP_SHAKE = 0.25;
const SOAK_SHAKE: [number, number] = [0.6, 1.2];

interface Head {
  bar: RewardBar;
  at: Point;
  pops: number;
  spray: Spray;
}

export const forceDelugeEvent = registerWispEvent(
  KEY,
  "Deluge",
  () => CONFIG.delugeEvent.chance,
  (floor, context, area) => {
    const { headsMs, sprayMs, levelShare, holdMs, mergeMs } =
      CONFIG.delugeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const count = bars.length * SPOTS.length;
    const heads: Head[] = [];
    let clock = 0;
    bars.forEach((bar, k) => {
      // across one bar and back along the next
      const spots = k % 2 === 0 ? SPOTS : [...SPOTS].reverse();
      for (const share of spots) {
        const at: Point = {
          x: bar.box.x + bar.box.width * share,
          y: Math.max(area.top + 30, bar.box.y - ABOVE),
        };
        const pops = clock;
        heads.push({
          bar,
          at,
          pops,
          spray: planSpray(
            at,
            (ms) => Math.PI / 2 + 0.25 * Math.sin((ms - pops) * 0.012),
            {
              startMs: pops + POP_MS,
              endMs: pops + POP_MS + sprayMs,
              reach: bar.center.y - at.y,
              spread: 0.5,
              flightMs: 380,
            },
          ),
        });
        clock += lerp(headsMs, heads.length / Math.max(1, count - 1));
      }
    });
    // a bar's soaked once its last head's mist reaches it
    const soaks = bars.map((bar) => ({
      bar,
      ms:
        Math.max(...heads.filter((h) => h.bar === bar).map((h) => h.pops)) +
        POP_MS +
        SOAK_MS,
    }));
    const last = soaks[soaks.length - 1];
    const endAt = Math.max(last.ms, ...heads.map((h) => h.spray.endMs)) + 400;
    const headAts = heads.map((h) => () => h.at);

    const popping = createBeats(
      heads,
      (h) => h.pops,
      (h) => {
        cover!.burst(h.at, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(POP_SHAKE);
      },
    );
    const soaking = createBeats(
      soaks,
      (s) => s.ms,
      (s, k) => {
        cover!.levels(
          s.bar,
          levelsFor(s.bar.floor, levelShare, 2),
          s.bar.center,
        );
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SOAK_SHAKE, k / Math.max(1, soaks.length - 1)));
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
          popping.tick(ms, now);
          soaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - (endAt - 400)) / 400);
          for (const s of soaks) {
            const t = ms - (s.ms - SOAK_MS);
            if (t < 0) continue;
            drawSprayCoat(
              ctx,
              s.bar.center,
              s.bar.box.width,
              s.bar.box.height * 2,
              COAT * clamp01(t / SOAK_MS) * fade,
              1 - clamp01((ms - s.ms) / FLASH_MS),
            );
            drawSprayMist(ctx, s.bar.center, t, 0.8 * fade, MIST, now);
          }
          for (const h of heads) drawSpray(ctx, h.spray, ms, now, DROPLET);
          for (let i = 0; i < heads.length; i++) {
            const h = heads[i];
            if (ms < h.pops || ms > h.spray.endMs) continue;
            const pop = easeOut(clamp01((ms - h.pops) / POP_MS));
            drawWispHead(ctx, headAts[i], ms, now, WISP_SIZE * HEAD * pop, 0.7);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
