// the "Willow Shells" event (explosion; free hires): it covers its crit,
// whose click freezes the screen while the clicked floor's button fires lit
// shells high into the air, each bursting in a big white blast, a bang and
// a hard shake into a cluster of fizzing bomblets that droop down in long
// willow arcs; the bomblets go off in a crackling chain as they come down,
// each its own shake, and every one that lands on an empty spot on a floor
// in view forms a new worker there; the last lands in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "willowShells";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 30;
const HIGH = 220;
// each shell carries two spots' bomblets and EXTRA that burst in the air
const PER_SHELL = 2;
const EXTRA = 3;
const DROOP = 160;
const SHELL = 0.45;
const BOMBLET = 0.25;
const FUSE = 14;
const SHELL_BLAST = 220;
const BOMBLET_BLAST = 120;
const BANG_GAP_MS = 60;
const SHELL_SHAKE: [number, number] = [0.9, 1.4];
const BOMBLET_SHAKE = 0.6;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  hire: RewardHire | null;
}

export const forceWillowShellsEvent = registerWispEvent(
  KEY,
  "Willow Shells",
  () => CONFIG.willowShellsEvent.chance,
  (floor, context, area) => {
    const { gapsMs, riseMs, droopMs, holdMs, mergeMs } =
      CONFIG.willowShellsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const shellCount = Math.ceil(hires.length / PER_SHELL);
    const blasts: Blast[] = [];
    const bomblets: {
      at: (ms: number) => Point;
      leaves: number;
      blows: number;
    }[] = [];
    let clock = 0;
    const shells = Array.from({ length: shellCount }, (_, k) => {
      const mine = hires.slice(k * PER_SHELL, (k + 1) * PER_SHELL);
      const burst: Point = {
        x: mine.reduce((s, h) => s + h.x, 0) / mine.length,
        y: area.top + HIGH + (k % 2) * 60,
      };
      const leaves = clock;
      clock += lerp(gapsMs, k / Math.max(1, shellCount - 1));
      const bursts = leaves + riseMs;
      blasts.push({
        at: burst,
        ms: bursts,
        size: SHELL_BLAST,
        shake: lerp(SHELL_SHAKE, k / Math.max(1, shellCount - 1)),
        hire: null,
      });
      const targets: { to: Point; hire: RewardHire | null }[] = [
        ...mine.map((hire) => ({
          to: { x: hire.x, y: hire.y - LIFT } as Point,
          hire,
        })),
        ...Array.from({ length: EXTRA }, (_, i) => {
          const a = Math.PI * (0.15 + (0.7 * i) / (EXTRA - 1));
          return {
            to: {
              x: burst.x + Math.cos(a) * DROOP * 1.4,
              y: burst.y + Math.sin(a) * DROOP * 0.6 + 60,
            },
            hire: null,
          };
        }),
      ];
      targets.forEach((t, i) => {
        const ctrl: Point = {
          x: burst.x + (t.to.x - burst.x) * 1.3,
          y: burst.y - 80,
        };
        const blows = bursts + (t.hire ? droopMs : droopMs * 0.5 + i * 50);
        const at: Point = { x: 0, y: 0 };
        bomblets.push({
          leaves: bursts,
          blows,
          at: (ms: number): Point =>
            bezier(
              burst,
              ctrl,
              t.to,
              clamp01((ms - bursts) / (blows - bursts)),
              at,
            ),
        });
        blasts.push({
          at: t.to,
          ms: blows,
          size: BOMBLET_BLAST,
          shake: BOMBLET_SHAKE,
          hire: t.hire,
        });
      });
      const at: Point = { x: 0, y: 0 };
      return {
        leaves,
        bursts,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - leaves) / riseMs));
          at.x = lerp([button.x, burst.x], u);
          at.y = lerp([button.y, burst.y], u);
          return at;
        },
      };
    });
    const landings = blasts.filter((b) => b.hire);
    const lastLanding = landings.reduce((a, b) => (b.ms > a.ms ? b : a));
    const endAt = Math.max(...blasts.map((b) => b.ms));
    let lastBang = -Infinity;

    const launching = createBeats(
      shells,
      (s) => s.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b.hire) {
          giveHire(b.hire);
          if (b === lastLanding) {
            cover!.blast(b.at);
            return;
          }
        }
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          launching.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const s of shells) {
            if (ms < s.leaves || ms >= s.bursts) continue;
            drawLitFuse(
              ctx,
              s.at(ms),
              clamp01((ms - s.leaves) / riseMs),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.7,
              s.leaves,
              s.bursts,
            );
          }
          for (const b of bomblets)
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMBLET,
              0.9,
              b.leaves,
              b.blows,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
