// the "Cash Register" event (experiment: ringing up a sale; cash): it
// covers its crit, whose click freezes the screen while a tapper wisp
// darts out of the clicked floor's button and punches keys round a keypad
// of light, each press a flash, a bloop and a jolt as the sale rings up on
// the screen ("$1", "$10", "$100" …), ever faster; then it slams the total
// key: "KA-CHING!", the drawer bursts open and a torrent of cash gushes out
// of the button and up into the total in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { COLOR } from "../../../../palette";

const KEY = "cashRegister";
const REWARD = 4;
const KEYS = 3;
const KEY_GAP = 70;
const KEY_SIZE = 26;
const PRESSES = ["$1", "$10", "$100", "$1,000", "$10,000"];
const STYLE = { fontSize: 48, strokeWidth: 8 };
const TOP = 230;
const PAD_MS = 200;
const FLASH_MS = 160;
const TAPPER = 0.4;
const PRESS_SHAKE: [number, number] = [0.3, 0.8];

export const forceCashRegisterEvent = registerWispEvent(
  KEY,
  "Cash Register",
  () => CONFIG.cashRegisterEvent.chance,
  (floor, context, area) => {
    const { pressesMs, gushMs, travelMs, holdMs, mergeMs } =
      CONFIG.cashRegisterEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const pad: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 60,
    };
    const readout: Point = { x: pad.x, y: area.top + TOP };
    // a 3 x 3 keypad of light squares
    const keys = Array.from(
      { length: KEYS * KEYS },
      (_, i): Point => ({
        x: pad.x + ((i % KEYS) - 1) * KEY_GAP,
        y: pad.y + (Math.floor(i / KEYS) - 1) * KEY_GAP,
      }),
    );
    const squares = keys.map((k) => {
      const h = KEY_SIZE / 2;
      return [
        { x: k.x - h, y: k.y - h },
        { x: k.x + h, y: k.y - h },
        { x: k.x + h, y: k.y + h },
        { x: k.x - h, y: k.y + h },
        { x: k.x - h, y: k.y - h },
      ];
    });
    const amounts = PRESSES.map((label) =>
      createCritTextSprite(label, COLOR.heavenlyGold, STYLE),
    );
    const kaching = createCritTextSprite("KA-CHING!", COLOR.heavenlyGold, {
      fontSize: 72,
      strokeWidth: 11,
    });
    let clock: number = PAD_MS;
    let last = -1;
    const presses = PRESSES.map((_, k) => {
      let key = Math.floor(Math.random() * keys.length);
      if (key === last) key = (key + 4) % keys.length;
      last = key;
      const ms = clock;
      clock += lerp(pressesMs, k / (PRESSES.length - 1));
      return { key, ms, k };
    });
    const opens = clock;
    const endAt = opens;
    const total = totalSpot(area);
    const into: Point = { x: 0, y: 0 };
    const ctrl: Point = {
      x: (button.x + total.x) / 2 + 160,
      y: (button.y + total.y) / 2,
    };
    const torrent = sampleLine(
      (u) => ({ ...bezier(button, ctrl, total, u, into) }),
      60,
    );
    const gush: Pour = {
      coinsAlong: 1100,
      width: 60,
      streamMs: gushMs,
      travelMs,
    };
    const durationMs = Math.max(
      pourDurationMs(opens, gush),
      opens + holdMs + mergeMs,
    );
    const tapperAt: Point = { x: 0, y: 0 };
    const tapper = (ms: number): Point => {
      let i = 0;
      while (i < presses.length && ms >= presses[i].ms) i++;
      const from = i === 0 ? button : keys[presses[i - 1].key];
      const to = i < presses.length ? keys[presses[i].key] : pad;
      const starts = i === 0 ? 0 : presses[i - 1].ms;
      const ends = i < presses.length ? presses[i].ms : opens;
      const u = easeOut(clamp01((ms - starts) / Math.max(1, ends - starts)));
      tapperAt.x = lerp([from.x, to.x], u);
      tapperAt.y = lerp([from.y, to.y], u) - Math.sin(u * Math.PI) * 20;
      return tapperAt;
    };

    const pressing = createBeats(
      presses,
      (p) => p.ms,
      (p) => {
        cover!.burst(keys[p.key], 0.25);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PRESS_SHAKE, p.k / (presses.length - 1)));
      },
    );
    const opening = createBeats(
      [opens],
      (ms) => ms,
      () => {
        pourLine(cover!, torrent, gush);
        cover!.burst(button, 1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.5);
      },
    );
    const finale = createBeats(
      [opens + travelMs],
      (ms) => ms,
      () => cover!.blast(total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pressing.tick(ms, now);
          opening.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 600) return;
          const show = clamp01(ms / PAD_MS) * (1 - clamp01((ms - opens) / 200));
          if (show > 0)
            for (let i = 0; i < squares.length; i++) {
              let lit = 0.35;
              for (const p of presses) {
                const t = (ms - p.ms) / FLASH_MS;
                if (p.key === i && t >= 0 && t < 1) lit = 1;
              }
              const sq = squares[i];
              for (let j = 1; j < sq.length; j++)
                drawBeam(ctx, sq[j - 1], sq[j], 6, show * lit);
            }
          // the sale ringing up, then KA-CHING!
          let shown = -1;
          for (const p of presses) if (ms >= p.ms) shown = p.k;
          if (shown >= 0 && ms < opens) {
            const t = (ms - presses[shown].ms) / FLASH_MS;
            drawCritTextSprite(
              ctx,
              amounts[shown],
              readout.x,
              readout.y,
              1 + 0.4 * (1 - clamp01(t)),
            );
          }
          const c = (ms - opens) / 600;
          if (c >= 0 && c < 1) {
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              kaching,
              readout.x,
              readout.y,
              1 + 0.6 * (1 - clamp01(c * 4)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              tapper,
              ms,
              now,
              WISP_SIZE * TAPPER,
              1,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
