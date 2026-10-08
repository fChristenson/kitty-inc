// the "Hydraulic Jump" event (money; cash): it covers its crit, whose click
// freezes the screen while the button shoots a thin, fast sheet of cash
// skimming out along the floor; partway across the sheet slams into a
// hydraulic jump, rearing up into a churning roller of cash that tumbles
// back on itself and swells taller and taller as the sheet keeps feeding
// it, every surge a whoosh and a jolt; then the towering roller breaks and
// pours up into the total-income readout, the last of it in a huge blast.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";
import {
  BTN_H,
  BTN_W,
  getButtonCenter,
} from "../../../../floors/upgradeButton";

const KEY = "hydraulicJump";
const REWARD = 4;
const COINS = 1100;
// the sheet skims SPEED px/ms, DEPTH px deep
const SPEED = 2.6;
const DEPTH = 18;
// the jump stands this share of the way from the screen's left to the button
const JUMP = 0.35;
// the roller: R0 px round at first, swelling to at most WIDE of the screen's
// width, and to TALL of the way up to the total; it stretches upward as it
// swells, spinning SPIN rad/ms, its coins packed from CORE of the way out
const R0 = 60;
const WIDE = 0.22;
const TALL = 0.8;
const STRETCH: [number, number] = [1, 1.9];
const SPIN = 0.012;
const CORE = 0.3;
// a coin settles into its own ring of the roller over SETTLE_MS, and leaves
// it up to LAG ms after the roller breaks
const SETTLE_MS = 260;
const LAG = 260;
const SURGES = 4;
const LAUNCH_SHAKE = 0.4;
const JUMP_SHAKE = 0.8;
const SURGE_SHAKE: [number, number] = [0.3, 0.9];
const BREAK_SHAKE = 1.2;

export const forceHydraulicJumpEvent = registerWispEvent(
  KEY,
  "Hydraulic Jump",
  () => CONFIG.hydraulicJumpEvent.chance,
  (floor, context, area) => {
    const { streamMs, growMs, riseMs, holdMs, mergeMs } =
      CONFIG.hydraulicJumpEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const button = getButtonCenter(context.isGroundFloor);
    const base = button.y + BTN_H / 2;
    const startX = button.x - BTN_W / 2 - 10;
    const jumpX = lerp([area.left + 120, startX], JUMP);
    const jumpAt = (startX - jumpX) / SPEED;
    const breakAt = jumpAt + growMs;
    const inAt = breakAt + LAG + riseMs;
    const travelMs = inAt;
    const w = area.right - area.left;
    const R1 = Math.max(
      R0,
      Math.min(w * WIDE, ((base - fallback.y) * TALL) / (2 * STRETCH[1])),
    );
    // the roller's half width and half height, and centre, at ms
    const shape = (ms: number) => {
      const g = easeOut(clamp01((ms - jumpAt) / growMs));
      const rx = lerp([R0, R1], g);
      const ry = rx * lerp(STRETCH, g);
      return { rx, ry, cy: base - ry };
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const firesAt = (streamMs * i) / COINS;
      const depth = DEPTH * Math.random();
      const reaches = firesAt + (startX - jumpX) / SPEED;
      const ring = lerp([CORE, 1], Math.sqrt(Math.random()));
      const leaves = breakAt + Math.random() * LAG;
      const end: Point = { x: 0, y: 0 };
      const at = (ms: number, into: Point): Point => {
        if (ms < reaches) {
          into.x = startX - (ms - firesAt) * SPEED;
          into.y = base - depth;
          return into;
        }
        const { rx, ry, cy } = shape(ms);
        // in at the roller's foot, tumbling back over its top
        const angle = Math.PI / 2 + SPIN * (ms - reaches);
        const r = lerp([1, ring], easeOut(clamp01((ms - reaches) / SETTLE_MS)));
        into.x = jumpX + Math.cos(angle) * rx * r;
        into.y = cy + Math.sin(angle) * ry * r;
        return into;
      };
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < firesAt) return { x: startX, y: base - depth, scale: 0 };
        if (ms < leaves) return at(ms, { x: 0, y: 0 });
        at(leaves, end);
        const t = total();
        const p = bezier(
          end,
          { x: end.x, y: t.y },
          t,
          easeIn(clamp01((ms - leaves) / riseMs)),
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: ms >= leaves + riseMs ? 0 : 1 };
      };
    });
    const surges = Array.from(
      { length: SURGES },
      (_, k) => jumpAt + (growMs * (k + 1)) / (SURGES + 1),
    );

    const launching = createBeats(
      [0, jumpAt],
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(ms > 0 ? JUMP_SHAKE : LAUNCH_SHAKE);
      },
    );
    const surging = createBeats(
      surges,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SURGE_SHAKE, k / Math.max(1, SURGES - 1)));
      },
    );
    const breaking = createBeats(
      [breakAt, inAt],
      (ms) => ms,
      (ms) => {
        if (ms === inAt) {
          cover!.blast(total());
          return;
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BREAK_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launching.tick(ms, now);
          surging.tick(ms, now);
          breaking.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
