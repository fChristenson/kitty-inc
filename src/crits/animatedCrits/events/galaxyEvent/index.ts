// the "Galaxy" event (money; cash): it covers its crit, whose click freezes
// the screen while the clicked floor's button flings out a great disc of
// cash that settles mid-screen into a spiral galaxy seen at a tilt, its two
// arms winding round a blazing core, the inside spinning faster than the
// rim and the whole thing whirling ever faster as the screen rumbles; every
// lap a whoosh and a jolt; then the core collapses and the galaxy swirls
// into the total in a huge blast and shake. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "galaxy";
const REWARD = 4;
const COINS = 1_300;
const COIN = 0.5;
// the disc reaches RADIUS of the screen's half-width, seen TILT tall; its
// arms wind WIND turns from core to rim, coins scattered SCATTER rad off them
const RADIUS = 0.85;
const TILT = 0.45;
const ARMS = 2;
const WIND = 1.1;
const SCATTER = 0.45;
// the core turns SPIN laps a second at first, SPIN_UP times that by the end;
// the rim lags RIM of the core's speed
const SPIN = 0.5;
const SPIN_UP = 3;
const RIM = 0.45;
const SWIRL_SPREAD = 300;
const LAP_SHAKE: [number, number] = [0.4, 1.2];

export const forceGalaxyEvent = registerWispEvent(
  KEY,
  "Galaxy",
  () => CONFIG.galaxyEvent.chance,
  (floor, context, area) => {
    const { formMs, spinMs, flightMs, holdMs, mergeMs } = CONFIG.galaxyEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const core: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.45),
    };
    const rim = ((area.right - area.left) / 2) * RADIUS;
    const collapseAt = formMs + spinMs;
    const endAt = collapseAt + SWIRL_SPREAD + flightMs;
    // laps turned by ms at the core, speeding up
    const laps = (ms: number) => {
      const s = Math.min(ms, collapseAt) / 1000;
      const span = collapseAt / 1000;
      return SPIN * (s + ((SPIN_UP - 1) * s * s) / (2 * span));
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const r = Math.sqrt(Math.random());
      const arm = Math.floor(Math.random() * ARMS);
      const angle0 =
        (arm / ARMS) * Math.PI * 2 +
        r * WIND * Math.PI * 2 +
        (Math.random() * 2 - 1) * SCATTER * (0.3 + r);
      const speed = 1 - (1 - RIM) * r;
      // the outside of the disc is swallowed last
      const leaves = collapseAt + r * SWIRL_SPREAD;
      const place = (ms: number, into: Point): Point => {
        const grow = easeOut(clamp01(ms / formMs));
        const a = angle0 + laps(ms) * Math.PI * 2 * speed;
        into.x = lerp([button.x, core.x + Math.cos(a) * r * rim], grow);
        into.y = lerp([button.y, core.y + Math.sin(a) * r * rim * TILT], grow);
        return into;
      };
      const start: Point = { x: 0, y: 0 };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) {
          place(ms, at);
          return { x: at.x, y: at.y, scale: COIN * (0.7 + 0.3 * (1 - r)) };
        }
        place(leaves, start);
        // spiralling in round the core on the way to the total
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - leaves) / flightMs));
        const swirl = (1 - u) * 0.6;
        const dx = start.x - core.x;
        const dy = start.y - core.y;
        const sx = core.x + dx * Math.cos(swirl) - dy * Math.sin(swirl);
        const sy = core.y + dx * Math.sin(swirl) + dy * Math.cos(swirl);
        return {
          x: lerp([sx, total.x], u),
          y: lerp([sy, total.y], u),
          scale: COIN,
        };
      };
    });

    const lapTimes: number[] = [];
    for (
      let ms = formMs, lap = Math.ceil(laps(formMs));
      ms < collapseAt;
      ms += 10
    )
      if (laps(ms) >= lap) {
        lapTimes.push(ms);
        lap++;
      }
    const lapping = createBeats(
      lapTimes,
      (ms) => ms,
      (_, k) => {
        cover!.burst(core, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(LAP_SHAKE, k / Math.max(1, lapTimes.length - 1)));
      },
    );
    const collapsing = createBeats(
      [collapseAt],
      (ms) => ms,
      () => {
        cover!.burst(core, 1);
        if (cover!.isLive()) shakeScreen(1.5);
      },
    );
    const swallowing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          lapping.tick(ms, now);
          collapsing.tick(ms, now);
          swallowing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
