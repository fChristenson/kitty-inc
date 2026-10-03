// the "Banner" event (money; cash): it covers its crit, whose click freezes
// the screen while a river of cash unfurls across the screen like a long
// waving banner, rippling as it goes, and smacks into the far edge with a
// splash, a bloop and a jolt; a second banner unfurls back the other way
// below it, then a third, each wider and quicker, and the last one cracks
// like a whip in a huge blast and shake as the coins sweep into the total.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "banner";
const REWARD = 4;
const BANNERS = 3;
const EDGE = 20;
const ROWS: [number, number] = [0.3, 0.75];
// each banner ripples WAVE px through WAVES waves, its width growing
const WAVE = 55;
const WAVES = 2.5;
const WIDTH: [number, number] = [36, 56];
const SMACK_SHAKE: [number, number] = [0.5, 1.2];

export const forceBannerEvent = registerWispEvent(
  KEY,
  "Banner",
  () => CONFIG.bannerEvent.chance,
  (floor, context, area) => {
    const { gapsMs, streamMs, travelMs, holdMs, mergeMs } = CONFIG.bannerEvent;
    const height = area.bottom - area.top;
    const ltr0 = Math.random() < 0.5;
    let clock = 0;
    const banners = Array.from({ length: BANNERS }, (_, k) => {
      const u0 = k / (BANNERS - 1);
      const y = area.top + height * lerp(ROWS, u0);
      const ltr = (k % 2 === 0) === ltr0;
      const from = ltr ? area.left + EDGE : area.right - EDGE;
      const to = ltr ? area.right - EDGE : area.left + EDGE;
      const phase = Math.random() * Math.PI * 2;
      const line = sampleLine(
        (u) => ({
          x: lerp([from, to], u),
          y: y + Math.sin(u * WAVES * Math.PI * 2 + phase) * WAVE * (0.4 + u),
        }),
        60,
      );
      const travel = travelMs * lerp([1, 0.75], u0);
      const pour: Pour = {
        coinsAlong: 800,
        width: lerp(WIDTH, u0),
        streamMs,
        travelMs: travel,
      };
      const starts = clock;
      clock += lerp(gapsMs, u0);
      return {
        line,
        pour,
        starts,
        smacks: starts + travel,
        end: line[line.length - 1] as Point,
      };
    });
    const last = banners[BANNERS - 1];
    const endAt = Math.max(...banners.map((b) => b.smacks));
    const durationMs = Math.max(
      ...banners.map((b) => pourDurationMs(b.starts, b.pour)),
      endAt + holdMs + mergeMs,
    );

    const unfurling = createBeats(
      banners,
      (b) => b.starts,
      (b) => pourLine(cover!, b.line, b.pour),
    );
    const smacking = createBeats(
      banners,
      (b) => b.smacks,
      (b, k) => {
        if (b === last) {
          cover!.blast(b.end);
          return;
        }
        cover!.burst(b.end, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SMACK_SHAKE, k / (BANNERS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          unfurling.tick(ms, now);
          smacking.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
