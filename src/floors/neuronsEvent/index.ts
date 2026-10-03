// the "Neurons" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a web of neuron wisps lights up between the
// clicked floor's button and the total-income readout; the button fires,
// and sparks of lightning leap from neuron to neuron, layer by layer up the
// web like a thought racing through a brain, every neuron that fires a
// crack, a flash and a pop of coins, the firing ever faster; the last
// layer fires into the total in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, type Bolt } from "../../shared/lightning";
import { ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "neurons";
const REWARD = 4;
const LAYERS = 4;
const PER_LAYER = 4;
const LINKS = 2;
const SPREAD = 0.8;
const BOLT_MS = 180;
const NODE = 0.32;
const POP = 4;
const POP_REACH: [number, number] = [20, 70];
const FIRE_SHAKE: [number, number] = [0.4, 1.2];

export const forceNeuronsEvent = registerWispEvent(
  KEY,
  "Neurons",
  () => CONFIG.neuronsEvent.chance,
  (floor, context, area) => {
    const { growMs, layersMs, holdMs, mergeMs } = CONFIG.neuronsEvent;
    const total = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const w = (area.right - area.left) * SPREAD;
    const cx = (area.left + area.right) / 2;
    // the button, the layers of neurons, then the total
    const layers: { at: Point; fires: number }[][] = [
      [{ at: button, fires: growMs }],
    ];
    for (let l = 1; l <= LAYERS; l++) {
      const y = lerp([button.y, total.y], l / (LAYERS + 1));
      layers.push(
        Array.from({ length: PER_LAYER }, (_, i) => ({
          at: {
            x:
              cx -
              w / 2 +
              w * ((i + 0.5) / PER_LAYER) +
              (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
          },
          fires: Infinity,
        })),
      );
    }
    layers.push([{ at: total, fires: Infinity }]);
    // wire each neuron to a few in the next layer; every one gets a feed
    const links: {
      from: (typeof layers)[0][0];
      to: (typeof layers)[0][0];
      bolt: Bolt;
    }[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const next = layers[l + 1];
      const fed = new Set<number>();
      layers[l].forEach((from, i) => {
        const picks =
          next.length === 1
            ? [0]
            : [
                i % next.length,
                (i + 1 + Math.floor(Math.random() * (next.length - 1))) %
                  next.length,
              ];
        for (const j of picks.slice(0, LINKS)) {
          fed.add(j);
          links.push({
            from,
            to: next[j],
            bolt: createBolt(from.at, next[j].at, 1),
          });
        }
      });
      next.forEach((to, j) => {
        if (fed.has(j)) return;
        const from = layers[l][Math.floor(Math.random() * layers[l].length)];
        links.push({ from, to, bolt: createBolt(from.at, to.at, 1) });
      });
    }
    // fire times, layer by layer, ever quicker
    for (let l = 1; l < layers.length; l++) {
      const gap = lerp(layersMs, (l - 1) / (layers.length - 2));
      for (const link of links)
        if (layers[l].includes(link.to))
          link.to.fires = Math.min(link.to.fires, link.from.fires + gap);
    }
    const neurons = layers.slice(1, -1).flat();
    const endAt = layers[layers.length - 1][0].fires;
    const wisps = neurons.map((n) => () => n.at);

    const firing = createBeats(
      neurons,
      (n) => n.fires,
      (n, k) => {
        cover!.launchFrom(n.at, ringTargets(n.at, POP, POP_REACH));
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(lerp(FIRE_SHAKE, clamp01(k / neurons.length)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const link of links) {
            const t =
              (ms - link.from.fires) /
              (link.to.fires - link.from.fires + BOLT_MS);
            if (t < 0 || t >= 1 || link.to.fires === Infinity) continue;
            drawBolt(ctx, link.bolt, 1 - t * t, 0.4);
          }
          const grow = clamp01(ms / growMs);
          neurons.forEach((n, i) =>
            drawWispBetween(
              ctx,
              wisps[i],
              ms,
              now,
              WISP_SIZE * NODE * grow * (ms > n.fires ? 1.4 : 1),
              ms > n.fires ? 1 : 0.2,
              0,
              endAt,
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
