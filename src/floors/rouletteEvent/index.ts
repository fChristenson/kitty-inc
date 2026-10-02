// the "Roulette" event: it covers its crit, whose click freezes the screen
// while coins drop into a ring of pockets round its middle like a roulette
// wheel and the wisp, as the ball, whips round the rim outside them; it drops
// in and clatters from pocket to pocket, every bounce a flash, a click, a
// jolt and a coin, until it settles in one and that pocket hits the jackpot
// in a huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playBloop, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, easeOutCubic, lerp } from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";

const KEY = "roulette";
const REWARD = 4;
const POCKETS = 12;
// the pockets POCKET of the screen's width (or height, if less) round, the
// rim RIM of it; the ball whips TURNS times round the rim, slowing, then
// clatters HOPS pockets on, bouncing HOP of the pocket ring out
const POCKET = 0.27;
const RIM = 0.4;
const TURNS = 3;
const HOPS = 6;
const HOP = 0.12;
const POP_MS = 160;
// the ball, as a share of the screen's width
const BALL = 0.045;
// each bounce: a burst, a click, a jolt and a coin
const HOP_BURST: [number, number] = [0.2, 0.4];
const HOP_SHAKE: [number, number] = [0.4, 1.1];
const HOP_RING: [number, number] = [20, 60];
const JACKPOT_COINS = 30;

export const forceRouletteEvent = registerWispEvent(
  KEY,
  "Roulette",
  () => CONFIG.rouletteEvent.chance,
  (floor, context, area) => {
    const { spinMs, dropMs, hopMs, holdMs, mergeMs } = CONFIG.rouletteEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const span = Math.min(width, height);
    const pocketR = span * POCKET;
    const rimR = span * RIM;
    const size = Math.max(WISP_SIZE, width * BALL);
    const way = Math.random() < 0.5 ? 1 : -1;
    const start = Math.random() * Math.PI * 2;
    const step = (Math.PI * 2) / POCKETS;
    const dropFrom = spinMs;
    const clatterFrom = dropFrom + dropMs;
    const blastAt = clatterFrom + hopMs * HOPS;
    // it drops in a quarter pocket on from where the spin leaves it, onto a
    // pocket, so the pockets are laid out round that spot
    const spinEnd = start + way * TURNS * Math.PI * 2;
    const firstPocket = spinEnd + way * step * 0.25;
    const pockets: Point[] = Array.from({ length: POCKETS }, (_, i) => ({
      x: middle.x + Math.cos(firstPocket + i * step) * pocketR,
      y: middle.y + Math.sin(firstPocket + i * step) * pocketR,
    }));
    const landingOf = (hop: number) =>
      pockets[(((way * (hop + 1)) % POCKETS) + POCKETS) % POCKETS];

    const point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      let angle: number;
      let r: number;
      if (ms < dropFrom) {
        angle = start + way * TURNS * Math.PI * 2 * easeOutCubic(ms / spinMs);
        r = rimR;
      } else if (ms < clatterFrom) {
        const u = (ms - dropFrom) / dropMs;
        angle = spinEnd + way * step * 0.25 * u;
        r = rimR + (pocketR - rimR) * u * u;
      } else {
        const hop = Math.floor((ms - clatterFrom) / hopMs);
        const u = (ms - clatterFrom) / hopMs - hop;
        angle = firstPocket + way * step * (hop + u);
        r = pocketR * (1 + HOP * Math.sin(Math.PI * u) * (1 - hop / HOPS));
      }
      point.x = middle.x + Math.cos(angle) * r;
      point.y = middle.y + Math.sin(angle) * r;
      return point;
    };

    const beats = createBeats(
      [
        dropFrom,
        ...Array.from(
          { length: HOPS },
          (_, k) => clatterFrom + hopMs * (k + 1),
        ),
      ],
      (ms) => ms,
      (_, k) => (k === 0 ? cover!.isLive() && playSwoosh() : bounced(k - 1)),
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
          drawWispBetween(
            ctx,
            ballAt,
            ms,
            now,
            size * easeOutBack(clamp01(ms / POP_MS)),
            heat,
            0,
            blastAt,
          );
        },
      },
    );
    if (!cover) return;
    // the wheel: a coin dropped into every pocket
    for (const p of pockets) cover.launchFrom(middle, [p]);

    function bounced(hop: number): void {
      const p = landingOf(hop);
      if (hop === HOPS - 1) {
        cover!.blast(p, JACKPOT_COINS);
        return;
      }
      const t = hop / (HOPS - 2);
      cover!.burst(p, lerp(HOP_BURST, t));
      cover!.launchFrom(p, ringTargets(p, 1, HOP_RING));
      if (!cover!.isLive()) return;
      playBloop();
      shakeScreen(lerp(HOP_SHAKE, t));
    }
  },
);
