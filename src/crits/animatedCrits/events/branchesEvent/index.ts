// the "Branches" event: it covers its crit, whose click freezes the screen
// while a wisp shoots up out of the clicked floor's button leading a thick
// trunk of flowing cash; it splits in two with a flash and a jolt, the trunk
// forking after the pair, and each splits again, four wisps fanning out
// across the screen at the heads of four branches of cash, which bend back in
// and converge on the total-income readout, each diving in with a flash and
// the last in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "branches";
const REWARD = 4;
// the forks: how far up from the button to the total (as a share) and out
// from the middle (as a share of the screen's width) each level spreads
const FORK_1 = 0.28;
const FORK_2: [number, number] = [0.52, 0.2];
const TIPS: [number, number] = [0.76, 0.4];
const SAMPLES = 30;
// the wisps, as shares of the screen's width, smaller each fork
const WISPS = [0.08, 0.065, 0.05];
const POP_MS = 180;
// each fork: a burst, a bloop and a jolt; each wisp diving in: a burst, a
// bang and a jolt
const FORK_BURST = 0.8;
const FORK_SHAKE = 1.5;
const DIVE_BURST = 0.6;
const DIVE_SHAKE = 1.2;

export const forceBranchesEvent = registerWispEvent(
  KEY,
  "Branches",
  () => CONFIG.branchesEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.branchesEvent;
    const width = area.right - area.left;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const mid = (area.left + area.right) / 2;
    const up = (share: number) => button.y + (total.y - button.y) * share;
    const fork1 = { x: (button.x + mid) / 2, y: up(FORK_1) };
    const forks2 = [-1, 1].map((s) => ({
      x: mid + s * width * FORK_2[1],
      y: up(FORK_2[0]),
    }));
    const tips = [-1, -0.35, 0.35, 1].map((s) => ({
      x: mid + s * width * TIPS[1],
      y: up(TIPS[0]),
    }));
    const routes = tips.map((tip, k) => [
      button,
      fork1,
      forks2[k >> 1],
      tip,
      total,
    ]);
    const lines = routes.map((route) =>
      sampleLine(
        (u) => alongRoute(route, u, { x: 0, y: 0 }),
        SAMPLES * (route.length - 1),
      ),
    );
    // every branch's coins run at one speed, so the heads stay together
    // up the trunk and forks they share
    const lengths = lines.map((line) => measure(line));
    const longest = Math.max(...lengths.map((a) => a[a.length - 1]));
    const pours: Pour[] = lengths.map((a) => ({
      coinsAlong: 420,
      width: 44,
      streamMs,
      travelMs: (travelMs * a[a.length - 1]) / longest,
    }));
    const timeTo = (k: number, corner: number) =>
      (travelMs * lengths[k][SAMPLES * corner]) / longest;
    const heads = lines.map((line, k) => riverHead(line, pours[k].travelMs));
    const forkAt = [timeTo(0, 1), timeTo(0, 2), timeTo(2, 2)];
    const arrivals = pours.map((p) => p.travelMs);
    const lastIn = arrivals.indexOf(Math.max(...arrivals));
    const durationMs = Math.max(
      pourDurationMs(0, pours[lastIn]),
      arrivals[lastIn] + holdMs + mergeMs,
    );
    // who's drawn: one wisp up the trunk, two after the first fork, four
    // after the second
    const spans = [
      { line: 0, from: 0, to: forkAt[0], size: WISPS[0] },
      { line: 0, from: forkAt[0], to: forkAt[1], size: WISPS[1] },
      { line: 2, from: forkAt[0], to: forkAt[2], size: WISPS[1] },
      ...arrivals.map((to, k) => ({
        line: k,
        from: forkAt[k < 2 ? 1 : 2],
        to,
        size: WISPS[2],
      })),
    ];

    const forks = createBeats(
      forkAt,
      (ms) => ms,
      (_, k) => {
        cover!.burst(k === 0 ? fork1 : forks2[k - 1], FORK_BURST);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(FORK_SHAKE);
      },
    );
    const dives = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? total;
        if (k === lastIn) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, DIVE_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(DIVE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          forks.tick(ms, now);
          dives.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const pop = easeOutBack(clamp01(ms / POP_MS));
          for (const s of spans)
            drawWispBetween(
              ctx,
              heads[s.line],
              ms,
              now,
              Math.max(WISP_SIZE, width * s.size) * pop,
              0.7,
              s.from,
              s.to,
            );
        },
      },
    );
    if (!cover) return;
    lines.forEach((line, k) => pourLine(cover, line, pours[k]));
    playBoostEventStream();
  },
);
