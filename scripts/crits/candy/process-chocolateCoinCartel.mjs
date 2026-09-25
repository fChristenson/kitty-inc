import { processCritIcon } from "../../lib/process-crit-icon.mjs";

// the net bag's mesh holes show the background through it
await processCritIcon("chocolateCoinCartel", {
  backgroundSeeds: [
    [572, 250],
    [643, 246],
    [881, 430],
    [521, 267],
    [453, 306],
    [810, 353],
    [457, 359],
    [688, 709],
    [608, 301],
    [694, 265],
    [583, 247],
    [546, 238],
    [393, 419],
    [479, 709],
    [892, 566],
    [522, 305],
    [532, 231],
    [359, 551],
    [750, 263],
    [898, 632],
  ],
  copyToAssetDirectories: true,
});
