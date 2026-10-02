// the "Lightning" event: it covers its crit, whose click freezes the screen
// while bolts of lightning crack down out of the top of it onto the clicked
// floor's button: each time the wisp streaks down a jagged zigzag in a blink,
// its glitter hanging along the bolt, and strikes the button in a blinding
// flash, a crack, a big jolt and a spray of coins; the strikes come faster
// and harder, and the last, biggest bolt blows the button in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, lerp } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "lightning";
const REWARD = 4;
// bolts, each JOINTS kinks from SKY of the screen's width either side of its
// middle down to the button, kinked up to JAG of its width sideways
const BOLTS = 4;
const JOINTS = 8;
const SKY = 0.35;
const JAG = 0.12;
const FIRST_MS = 160;
// the wisp, as a share of the screen's width; the last bolt BIG times it
const WISP = 0.05;
const BIG = 1.8;
// each strike: a burst, a crack, a big jolt and coins sprayed up off the
// button; a little flicker where it leaves the sky
const STRIKE_BURST: [number, number] = [0.6, 1.1];
const SKY_BURST = 0.25;
const STRIKE_SHAKE: [number, number] = [1.2, 2];
const STRIKE_COINS: [number, number] = [4, 7];
const SPRAY: [number, number] = [80, 260];
const SPRAY_SPAN = 2.4;

interface Bolt {
  at: number;
  joints: Point[];
  path: (ms: number) => Point | null;
}

export const forceLightningEvent = registerWispEvent(
  KEY,
  "Lightning",
  () => CONFIG.lightningEvent.chance,
  (floor, context, area) => {
    const { strikeMs, gapMs, holdMs, mergeMs } = CONFIG.lightningEvent;
    const width = area.right - area.left;
    const middleX = (area.left + area.right) / 2;
    const size = Math.max(WISP_SIZE, width * WISP);
    const button = getButtonCenter(context.isGroundFloor);

    const bolts: Bolt[] = [];
    let at = FIRST_MS;
    for (let b = 0; b < BOLTS; b++) {
      const sky = {
        x: middleX + between([-SKY, SKY]) * width,
        y: area.top - size,
      };
      const joints: Point[] = Array.from({ length: JOINTS + 1 }, (_, k) => {
        const f = k / JOINTS;
        // kinked hardest in the middle, pinned at both ends
        const jag =
          k === 0 || k === JOINTS
            ? 0
            : between([-JAG, JAG]) * width * Math.sin(Math.PI * f);
        return {
          x: sky.x + (button.x - sky.x) * f + jag,
          y: sky.y + (button.y - sky.y) * f,
        };
      });
      const start = at;
      const point = { x: 0, y: 0 };
      bolts.push({
        at: start,
        joints,
        path: (ms) => {
          if (ms < start || ms >= start + strikeMs) return null;
          const f = ((ms - start) / strikeMs) * JOINTS;
          const k = Math.floor(f);
          const u = f - k;
          point.x = joints[k].x + (joints[k + 1].x - joints[k].x) * u;
          point.y = joints[k].y + (joints[k + 1].y - joints[k].y) * u;
          return point;
        },
      });
      if (b < BOLTS - 1) at += strikeMs + lerp(gapMs, b / (BOLTS - 2));
    }
    const blastAt = at + strikeMs;

    const strikes = createBeats(
      bolts,
      (b) => b.at + strikeMs,
      (_, k) => struck(k),
    );
    const flickers = createBeats(
      bolts,
      (b) => b.at,
      (b) => cover!.burst(b.joints[1], SKY_BURST),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flickers.tick(ms, now);
          strikes.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          bolts.forEach((b, k) =>
            drawWispBetween(
              ctx,
              b.path,
              ms,
              now,
              size * (k === BOLTS - 1 ? BIG : 1),
              1,
              b.at,
              b.at + strikeMs,
            ),
          ),
      },
    );
    if (!cover) return;

    function struck(k: number): void {
      if (k === BOLTS - 1) {
        cover!.blast(button);
        return;
      }
      const t = k / (BOLTS - 2);
      cover!.burst(button, lerp(STRIKE_BURST, t));
      cover!.launchFrom(
        button,
        sprayTargets(
          button,
          Math.round(lerp(STRIKE_COINS, t)),
          SPRAY,
          -Math.PI / 2,
          SPRAY_SPAN,
        ),
      );
      if (!cover!.isLive()) return;
      playExplosion();
      shakeScreen(lerp(STRIKE_SHAKE, t));
    }
  },
);
