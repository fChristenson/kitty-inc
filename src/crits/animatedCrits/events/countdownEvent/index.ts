// the "Countdown" event (an experiment beyond the money/wisp templates): it
// covers its crit, whose click freezes the screen while a giant 3, 2, 1
// slams down into the middle of it one after another, each harder, a flash,
// a bang, a jolt and a ring of coins knocked out; then "GO!" slams down in a
// huge blast and shake and a geyser of cash roars up out of it into the
// total-income readout, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "countdown";
const REWARD = 4;
const LABELS = ["3", "2", "1", "GO!"];
const COLORS = [
  COLOR.heavenlyGold,
  COLOR.heavenlyGold,
  COLOR.heavenlyGold,
  COLOR.moneyGreen,
];
// each slams in from SLAM times its size over SLAM_MS, FONT of the screen's
// width tall ("GO!" a touch smaller to fit), then fades over FADE_MS once
// the next lands
const SLAM = 2.6;
const SLAM_MS = 110;
const FADE_MS = 120;
const FONT = 0.42;
const GO_FONT = 0.3;
// the middle, DROP of the screen's height under its middle
const DROP = 0.05;
// each slam: a burst, a bang, a jolt and a ring of coins, growing
const SLAM_COINS = [20, 28, 36];
const SLAM_REACH: [number, number] = [60, 160];
const SLAM_BURST: [number, number] = [0.8, 1.3];
const SLAM_SHAKE: [number, number] = [1.4, 2.4];

export const forceCountdownEvent = registerWispEvent(
  KEY,
  "Countdown",
  () => CONFIG.countdownEvent.chance,
  (floor, context, area) => {
    const { beatMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.countdownEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const mid = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const slams = LABELS.map((_, k) => k * beatMs + SLAM_MS);
    const goAt = slams[LABELS.length - 1];
    const geyser = sampleLine(
      (u) => ({
        x: mid.x + (total.x - mid.x) * u,
        y: mid.y + (total.y - mid.y) * u,
      }),
      30,
    );
    const pour: Pour = { coinsAlong: 1_300, width: 120, streamMs, travelMs };
    const durationMs = Math.max(
      pourDurationMs(goAt, pour),
      goAt + holdMs + mergeMs,
    );
    const sprites = LABELS.map((label, k) => {
      const fontSize = Math.round(width * (label.length > 1 ? GO_FONT : FONT));
      return createCritTextSprite(label, COLORS[k], {
        fontSize,
        strokeWidth: Math.round(fontSize * 0.08),
      });
    });

    const slamming = createBeats(
      slams,
      (ms) => ms,
      (_, k) => {
        if (k === LABELS.length - 1) {
          cover!.blast(mid);
          pourLine(cover!, geyser, pour);
          return;
        }
        const t = k / (LABELS.length - 2);
        cover!.burst(mid, lerp(SLAM_BURST, t));
        cover!.launchFrom(mid, ringTargets(mid, SLAM_COINS[k], SLAM_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => slamming.tick(ms, now),
        drawOver: (ctx, ms) => {
          LABELS.forEach((_, k) => {
            const from = k * beatMs;
            const until =
              k === LABELS.length - 1 ? goAt + holdMs : from + beatMs;
            if (ms < from || ms >= until + FADE_MS) return;
            const scale =
              1 +
              (SLAM - 1) * (1 - easeOutCubic(clamp01((ms - from) / SLAM_MS)));
            const alpha = 1 - clamp01((ms - until) / FADE_MS);
            ctx.globalAlpha = alpha * clamp01((ms - from) / (SLAM_MS * 0.5));
            drawCritTextSprite(ctx, sprites[k], mid.x, mid.y, scale);
            ctx.globalAlpha = 1;
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
