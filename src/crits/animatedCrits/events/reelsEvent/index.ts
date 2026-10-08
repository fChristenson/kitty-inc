// the "Reels" event (an experiment beyond the four templates: the frozen
// screen spins like a slot machine; a surprise reward): it covers its crit,
// whose click freezes the screen while it splits into three reels that spin
// in a blur and slam to a stop one after another, each a bang and a jolt;
// when the third lands the payline blazes "JACKPOT!" and it pays out one of
// cash, free upgrade levels on every bar in view, a crit tier on the clicked
// floor's bar or a perma tier for every worker in view, picked at random.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawPoppingCritText } from "../../../critFlash/critText";
import { CRIT_TIER_ORDER } from "../../../critTypes";
import {
  findRewardBars,
  findRewardWorkers,
  levelsFor,
  type RewardBar,
  type RewardWorker,
} from "../../eventRewards";

const KEY = "reels";
const CASH_REWARD = 6;
const REELS = 3;
// each reel spins at least SPEED screens a second, bouncing BOUNCE px as it
// stops over SETTLE_MS
const SPEED = 3;
const BOUNCE = 26;
const SETTLE_MS = 220;
const DIVIDER = 6;
const PAYLINE_MS = 500;
const LABEL_FONT = 90;
const STOP_SHAKE = [1.2, 1.6, 2.2];
const CASH_COINS = 320;
const CASH_REACH: [number, number] = [0.08, 0.6];

type Prize = "cash" | "levels" | "tier" | "workers";

export const forceReelsEvent = registerWispEvent(
  KEY,
  "Reels",
  () => CONFIG.reelsEvent.chance,
  (floor, context, area) => {
    const { stopsMs, levelShare, holdMs, mergeMs } = CONFIG.reelsEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const mid = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    // what it can pay here, one picked at random
    const allBars = context.upgradeFloorFree
      ? findRewardBars(floor, context)
      : [];
    const ownBar = allBars.find(
      (b) =>
        b.floor === floor && floor.critMultiplierTier !== CRIT_TIER_ORDER[0],
    );
    const climbers = findRewardWorkers(floor, context).slice(0, 8);
    const prizes: Prize[] = ["cash"];
    if (allBars.length > 0) prizes.push("levels");
    if (ownBar) prizes.push("tier");
    if (climbers.length > 0) prizes.push("workers");
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    const bars: RewardBar[] =
      prize === "levels" ? allBars : prize === "tier" && ownBar ? [ownBar] : [];
    const workers: RewardWorker[] = prize === "workers" ? climbers : [];

    const stops = stopsMs.slice(0, REELS);
    const settled = stops[REELS - 1] + SETTLE_MS;
    const payAt = settled;
    const travel = stops.map(
      (stop) => height * (Math.ceil((SPEED * stop) / 1000) + 1),
    );
    const offset = (k: number, ms: number) => {
      if (ms < stops[k]) return travel[k] * easeOut(ms / stops[k]);
      const t = ms - stops[k];
      return travel[k] + BOUNCE * Math.exp(-t / 70) * Math.sin(t / 22);
    };
    let snap: HTMLCanvasElement | null = null;

    const stopping = createBeats(
      stops,
      (ms) => ms,
      (_, k) => {
        cover!.burst(
          { x: area.left + (width * (k + 0.5)) / REELS, y: mid.y },
          0.8,
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(STOP_SHAKE[k]);
      },
    );
    const paying = createBeats(
      [payAt],
      (ms) => ms,
      () => {
        if (prize === "cash") {
          cover!.blast(mid);
          cover!.launchFrom(
            mid,
            clampTargetsY(
              sprayTargets(mid, CASH_COINS, [
                span * CASH_REACH[0],
                span * CASH_REACH[1],
              ]),
              area.top + 40,
              area.bottom - 20,
            ),
          );
          return;
        }
        for (const bar of bars) {
          if (prize === "tier") cover!.tierUp(bar, mid);
          else cover!.levels(bar, levelsFor(bar.floor, levelShare), mid);
          cover!.slam(bar);
        }
        for (const w of workers) {
          cover!.promote(w);
          cover!.burst(w.at, 0.6);
        }
        cover!.blast(mid);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: payAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: prize === "cash" ? CASH_REWARD : 0,
        bars,
        workers,
        tick: (ms, now) => {
          stopping.tick(ms, now);
          paying.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= settled) return;
          const m = ctx.getTransform();
          if (!snap) {
            snap = document.createElement("canvas");
            snap.width = Math.max(1, Math.round(m.a * width));
            snap.height = Math.max(1, Math.round(m.d * height));
            snap
              .getContext("2d")!
              .drawImage(
                ctx.canvas,
                m.a * area.left + m.e,
                m.d * area.top + m.f,
                snap.width,
                snap.height,
                0,
                0,
                snap.width,
                snap.height,
              );
          }
          const reelW = width / REELS;
          const srcW = snap.width / REELS;
          for (let k = 0; k < REELS; k++) {
            const off = ((offset(k, ms) % height) + height) % height;
            const x = area.left + reelW * k;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, area.top, reelW, height);
            ctx.clip();
            for (const y of [area.top + off - height, area.top + off])
              ctx.drawImage(
                snap,
                srcW * k,
                0,
                srcW,
                snap.height,
                x,
                y,
                reelW,
                height,
              );
            ctx.restore();
          }
          ctx.save();
          ctx.fillStyle = COLOR.heavenlyGold;
          for (let k = 1; k < REELS; k++)
            ctx.fillRect(
              area.left + reelW * k - DIVIDER / 2,
              area.top,
              DIVIDER,
              height,
            );
          ctx.restore();
        },
        drawOver: (ctx, ms, now) => {
          if (ms < payAt || ms >= payAt + PAYLINE_MS * 3) return;
          const flash = 1 - clamp01((ms - payAt) / PAYLINE_MS);
          if (flash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.6 * flash;
            ctx.fillStyle = COLOR.white;
            ctx.fillRect(area.left, mid.y - 40, width, 80);
            ctx.restore();
          }
          drawPoppingCritText(
            ctx,
            "JACKPOT!",
            mid.x,
            mid.y,
            COLOR.heavenlyGold,
            now - (ms - payAt),
            now,
            { fontSize: LABEL_FONT, strokeWidth: 10 },
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
