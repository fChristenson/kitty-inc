// the "Sonic Boom" event: it covers its crit, whose click freezes the screen
// while the wisp glides in from off the screen's left edge and pulls up just
// short of the middle, revving up: trembling, swelling and heating as the
// screen rumbles ever harder. Then it bursts forward in a blinding flash and
// a huge boom, off the screen's right edge almost at once, leaving a big ball
// of money where it set off and a trail of it all along its path, which
// merges into the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSlamExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "sonicBoom";
const REWARD = 3;
// it glides in from this far off the screen's left edge, at FLIGHT_HEIGHT of
// the way down the screen, pulling up REV_AT of the way across, then bursts
// off this far past the right edge
const OUT = 80;
const FLIGHT_HEIGHT = 0.45;
const REV_AT = 0.42;
// revving: trembling up to TREMBLE px, swelling by SWELL, the screen
// rumbling RUMBLES times ever harder
const TREMBLE = 5;
const SWELL = 0.5;
const RUMBLES = 5;
const RUMBLE_SHAKE: [number, number] = [0.2, 0.8];
// the burst: a flash over the screen
const BURST_SHAKE = 2.6;
const FLASH_MS = 220;
const FLASH_ALPHA = 0.8;
// a ball of money left where it set off, BALL_R px across
const BALL_COINS = 40;
const BALL_R = 120;
// and a trail of it along its path off the screen, up to SPRAY px off its
// line
const COINS = 44;
const SPRAY: [number, number] = [4, 40];

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.sonicBoomEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { glideMs, revMs, burstMs, holdMs, mergeMs } =
        CONFIG.sonicBoomEvent;
      const width = area.right - area.left;
      const y = area.top + (area.bottom - area.top) * FLIGHT_HEIGHT;
      const startX = area.left - OUT;
      const revX = area.left + width * REV_AT;
      const endX = area.right + OUT;
      const burstAt = glideMs + revMs;
      const goneAt = burstAt + burstMs;
      const rev = (ms: number) => clamp01((ms - glideMs) / revMs);
      // the wisp's x ms in: gliding in and pulling up, then all but instantly
      // off the screen
      const xAt = (ms: number) => {
        if (ms < glideMs)
          return startX + (revX - startX) * (1 - (1 - ms / glideMs) ** 2);
        if (ms < burstAt) return revX;
        return (
          revX + (endX - revX) * Math.sqrt(clamp01((ms - burstAt) / burstMs))
        );
      };
      const wispAt = (ms: number): Point | null => {
        if (ms < 0 || ms >= goneAt) return null;
        const shake = ms >= glideMs && ms < burstAt ? TREMBLE * rev(ms) : 0;
        return {
          x: xAt(ms) + Math.sin(ms / 7) * shake,
          y: y + Math.cos(ms / 5) * shake,
        };
      };
      // where along its path each coin's left behind
      const drops = Array.from({ length: COINS }, () =>
        lerp([revX, area.right], Math.random()),
      ).sort((a, b) => a - b);
      let dropped = 0;
      const startedAt = performance.now();
      let burstedAt: number | null = null;

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: goneAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            if (burstedAt === null && ms >= burstAt) burst(now);
            if (burstedAt !== null) {
              const passed = ms >= goneAt ? Infinity : xAt(ms);
              while (dropped < drops.length && drops[dropped] <= passed)
                drop(drops[dropped++]);
            }
            if (burstedAt === null) return;
            const since = now - burstedAt;
            const flash = 1 - since / FLASH_MS;
            if (flash > 0) {
              ctx.save();
              ctx.translate(rect.left, rect.top);
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = FLASH_ALPHA * flash;
              ctx.fillStyle = COLOR.white;
              ctx.fillRect(area.left, area.top, width, area.bottom - area.top);
              ctx.restore();
            }
          },
          // the wisp over the coins
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            drawWisp(
              ctx,
              wispAt,
              ms,
              now,
              WISP_SIZE * (1 + SWELL * (ms < burstAt ? rev(ms) : 1)),
              rev(ms),
            );
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      playSwoosh();

      // the rumble building as it revs
      for (let i = 0; i < RUMBLES; i++) {
        const u = i / (RUMBLES - 1);
        setTimeout(
          () => {
            if (cover.isLive()) shakeScreen(lerp(RUMBLE_SHAKE, u));
          },
          glideMs + revMs * (0.1 + 0.85 * u),
        );
      }

      // on the frame it bursts forward: a ball of money left where it was
      function burst(now: number): void {
        burstedAt = now;
        if (!cover?.isLive()) return;
        playSlamExplosion();
        shakeScreen(BURST_SHAKE);
        const from = { x: revX, y };
        cover.launchFrom(
          from,
          Array.from({ length: BALL_COINS }, () => {
            const angle = Math.random() * Math.PI * 2;
            const r = (BALL_R / 2) * Math.sqrt(Math.random());
            return {
              x: from.x + Math.cos(angle) * r,
              y: from.y + Math.sin(angle) * r,
            };
          }),
        );
      }
      // a coin of the trail, left on its line as it tears past x
      function drop(x: number): void {
        if (!cover?.isLive()) return;
        const side = Math.random() < 0.5 ? -1 : 1;
        cover.launchFrom({ x, y }, [
          { x, y: y + side * lerp(SPRAY, Math.random()) },
        ]);
      }
    },
  },
  { label: "Sonic Boom", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Sonic Boom
export function forceSonicBoomEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
