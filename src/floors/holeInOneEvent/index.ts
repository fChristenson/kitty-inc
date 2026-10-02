// the "Hole in One" event: it covers its crit, whose click freezes the screen
// while the wisp is chipped in from off its side in a sky-high lob, lands on
// the clicked floor's button row and bounces twice toward the button, each
// landing a flash, a thud, a jolt and coins kicked up; it rolls onto the
// button's rim, whirls round its lip, ever tighter, and drops in: the button
// blows in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "holeInOne";
const REWARD = 4;
// where it lands, in shares of the screen's width short of the button, and
// how high each hop flies, in shares of its height
const LANDINGS = [0.44, 0.22];
const HOPS = [0.55, 0.2, 0.08];
// the rim: RIM of the screen's width round, whirled TURNS times
const RIM = 0.07;
const TURNS = 1.6;
const EDGE = 0.06;
// the wisp, as a share of the screen's width
const WISP = 0.055;
// each landing: a burst, a thud, a jolt and coins kicked on ahead
const LAND_BURST: [number, number] = [0.45, 0.65];
const LAND_SHAKE: [number, number] = [1, 1.6];
const LAND_COINS = 5;
const KICK: [number, number] = [70, 220];
const KICK_SPAN = 1.4;

export const forceHoleInOneEvent = registerWispEvent(
  KEY,
  "Hole in One",
  () => CONFIG.holeInOneEvent.chance,
  (floor, context, area) => {
    const { hopMs, rimMs, holdMs, mergeMs } = CONFIG.holeInOneEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = Math.max(WISP_SIZE, width * WISP);
    const button = getButtonCenter(context.isGroundFloor);
    // from the side with more room
    const dir = button.x - area.left > area.right - button.x ? 1 : -1;
    const clampX = (x: number) =>
      Math.min(area.right - width * EDGE, Math.max(area.left + width * EDGE, x));
    const rim = width * RIM;
    const spots: Point[] = [
      { x: dir === 1 ? area.left - width * 0.2 : area.right + width * 0.2, y: area.bottom },
      ...LANDINGS.map((s) => ({ x: clampX(button.x - dir * width * s), y: button.y })),
      { x: button.x - dir * rim, y: button.y },
    ];
    const landAt: number[] = [];
    let at = 0;
    for (const ms of hopMs) {
      at += ms;
      landAt.push(at);
    }
    const rimFrom = at;
    const blastAt = rimFrom + rimMs;
    // round the rim from its near side, the way it was rolling
    const rimStart = dir === 1 ? Math.PI : 0;
    const rimWay = dir === 1 ? 1 : -1;

    const point = { x: 0, y: 0 };
    const wispAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      let fromMs = 0;
      for (let k = 0; k < HOPS.length; k++) {
        if (ms < landAt[k]) {
          const u = (ms - fromMs) / (landAt[k] - fromMs);
          const a = spots[k];
          const b = spots[k + 1];
          point.x = a.x + (b.x - a.x) * u;
          point.y = a.y + (b.y - a.y) * u - height * HOPS[k] * 4 * u * (1 - u);
          return point;
        }
        fromMs = landAt[k];
      }
      const u = (ms - rimFrom) / rimMs;
      const r = rim * (1 - easeIn(u));
      const angle = rimStart + rimWay * TURNS * Math.PI * 2 * (u * (2 - u) * 0.6 + u * 0.4);
      point.x = button.x + Math.cos(angle) * r;
      point.y = button.y + Math.sin(angle) * r * 0.5;
      return point;
    };

    const beats = createBeats(
      [...landAt, blastAt],
      (ms) => ms,
      (_, k) => (k === HOPS.length ? cover!.blast(button) : landed(k)),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => beats.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          drawWispBetween(ctx, wispAt, ms, now, size, heat, 0, blastAt);
        },
      },
    );
    if (!cover) return;

    function landed(k: number): void {
      const spot = spots[k + 1];
      const t = k / (HOPS.length - 1);
      cover!.burst(spot, lerp(LAND_BURST, t));
      cover!.launchFrom(
        spot,
        sprayTargets(spot, LAND_COINS, KICK, dir === 1 ? -Math.PI / 4 : (-3 * Math.PI) / 4, KICK_SPAN),
      );
      if (!cover!.isLive()) return;
      playExplosion();
      if (k === HOPS.length - 1) playSwoosh();
      shakeScreen(lerp(LAND_SHAKE, t));
    }
  },
);
