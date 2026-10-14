// the random spawns. Each is one folder, src/spawn/<key>/, and nothing
// outside it names the spawn:
//   meta.ts   its card (label; shared/spawnGames' SpawnMeta), read at startup
//   index.ts  default-exports its SpawnGame, loaded when the game is idle
//             (or when its test button forces it)
import {
  registerSpawnGame,
  type SpawnGame,
  type SpawnMeta,
} from "../shared/spawnGames";

export interface SpawnCard extends SpawnMeta {
  key: string;
}

const METAS = import.meta.glob<SpawnMeta>("./*/meta.ts", {
  eager: true,
  import: "default",
});
const MODULES = import.meta.glob<SpawnGame>("./*/index.ts", {
  import: "default",
});

const keyOf = (path: string) => path.slice(2, path.indexOf("/", 2));

export const SPAWN_CARDS: readonly SpawnCard[] = Object.entries(METAS)
  .map(([path, meta]) => ({ ...meta, key: keyOf(path) }))
  .sort((a, b) => a.label.localeCompare(b.label));

const loaded = new Map<string, Promise<SpawnGame>>();

// loads key's spawn and registers it, once
function loadSpawn(key: string): Promise<SpawnGame> {
  let game = loaded.get(key);
  if (!game) {
    const load = MODULES[`./${key}/index.ts`];
    if (!load) throw new Error(`${key}: a meta.ts with no index.ts`);
    game = load().then((spawn) => {
      registerSpawnGame(spawn);
      return spawn;
    });
    loaded.set(key, game);
  }
  return game;
}

// every spawn, so they roll
export function loadSpawns(): Promise<unknown> {
  return Promise.all(SPAWN_CARDS.map((card) => loadSpawn(card.key)));
}

// dev/test: puts key's spawn out now
export async function forceSpawn(key: string): Promise<void> {
  await (await loadSpawn(key)).force();
}
