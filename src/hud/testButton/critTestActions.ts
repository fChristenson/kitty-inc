import {
  CRIT_PROC_KINDS,
  CRIT_PROC_INFO,
  CRIT_TIER_ORDER,
  CRIT_TIER_CONFIG,
  type CritProcKind,
  type CritTier,
} from "../../shared/critTypes";

export const MAP_CRIT_TEST_KINDS: readonly CritProcKind[] = [
  "chain",
  "upgrade",
  "heavenly",
  "skip",
  "grandOpening",
  "luckyClover",
  "mystic",
  "pair",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "royalFlush",
];

export function createTestButtonMarkup(): string {
  const tiers = [...CRIT_TIER_ORDER]
    .reverse()
    .map(
      (tier) =>
        `<option value="${tier}">${CRIT_TIER_CONFIG[tier].label}</option>`,
    )
    .join("");
  const buttons = [...CRIT_PROC_KINDS]
    .sort((left, right) =>
      CRIT_PROC_INFO[left].label.localeCompare(CRIT_PROC_INFO[right].label),
    )
    .map(
      (kind) =>
        `<button class="game__button" data-crit-kind="${kind}">${CRIT_PROC_INFO[kind].label}</button>`,
    )
    .join("");
  return `
    <div class="test-actions-bar">
      <input type="search" id="test-actions-filter" class="test-actions-filter" placeholder="Filter actions" autocomplete="off" />
      <p class="test-actions-empty" id="test-actions-empty" hidden>No matches</p>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">New Events</summary>
        <div class="test-actions-dropdown__menu">
          <button id="test-archimedes-screw-event" class="game__button">Archimedes Screw</button>
          <button id="test-murmuration-event" class="game__button">Murmuration</button>
          <button id="test-spirit-bomb-event" class="game__button">Spirit Bomb</button>
          <button id="test-metronome-event" class="game__button">Metronome</button>
          <button id="test-power-grid-event" class="game__button">Power Grid</button>
          <button id="test-bomb-bowling-event" class="game__button">Bomb Bowling</button>
          <button id="test-showdown-event" class="game__button">Showdown</button>
          <button id="test-jump-rope-event" class="game__button">Jump Rope</button>
          <button id="test-strongbox-event" class="game__button">Strongbox</button>
          <button id="test-snow-cannon-event" class="game__button">Snow Cannon</button>
          <button id="test-hill-climb-event" class="game__button">Hill Climb</button>
          <button id="test-abacus-event" class="game__button">Abacus</button>
          <button id="test-coral-event" class="game__button">Coral</button>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Events</summary>
        <div class="test-actions-dropdown__menu">
          <button id="test-curves-event" class="game__button">Curves</button>
          <button id="test-breakthrough-event" class="game__button">Breakthrough</button>
          <button id="test-dune-event" class="game__button">Dune</button>
          <button id="test-string-of-pearls-event" class="game__button">String of Pearls</button>
          <button id="test-river-juggler-event" class="game__button">River Juggler</button>
          <button id="test-like-charges-event" class="game__button">Like Charges</button>
          <button id="test-collision-course-event" class="game__button">Collision Course</button>
          <button id="test-target-wheel-event" class="game__button">Target Wheel</button>
          <button id="test-spinning-hexagon-event" class="game__button">Spinning Hexagon</button>
          <button id="test-bead-drill-event" class="game__button">Bead Drill</button>
          <button id="test-hydroseeder-event" class="game__button">Hydroseeder</button>
          <button id="test-mancala-event" class="game__button">Mancala</button>
          <button id="test-tumbler-event" class="game__button">Tumbler</button>
          <button id="test-waggle-dance-event" class="game__button">Waggle Dance</button>
          <button id="test-water-cycle-event" class="game__button">Water Cycle</button>
          <button id="test-folding-rule-event" class="game__button">Folding Rule</button>
          <button id="test-arc-swarm-event" class="game__button">Arc Swarm</button>
          <button id="test-lockstep-event" class="game__button">Lockstep</button>
          <button id="test-hacky-sack-event" class="game__button">Hacky Sack</button>
          <button id="test-woodworm-event" class="game__button">Woodworm</button>
          <button id="test-graffiti-event" class="game__button">Graffiti</button>
          <button id="test-voronoi-event" class="game__button">Voronoi</button>
          <button id="test-percolation-event" class="game__button">Percolation</button>
          <button id="test-gloop-event" class="game__button">Gloop</button>
          <button id="test-escape-velocity-event" class="game__button">Escape Velocity</button>
          <button id="test-sungrazer-event" class="game__button">Sungrazer</button>
          <button id="test-fractal-tree-event" class="game__button">Fractal Tree</button>
          <button id="test-switchboard-event" class="game__button">Switchboard</button>
          <button id="test-interference-event" class="game__button">Interference</button>
          <button id="test-tower-defense-event" class="game__button">Tower Defense</button>
          <button id="test-bounce-wave-event" class="game__button">Bounce Wave</button>
          <button id="test-mole-event" class="game__button">Mole</button>
          <button id="test-car-wash-event" class="game__button">Car Wash</button>
          <button id="test-dragon-curve-event" class="game__button">Dragon Curve</button>
          <button id="test-lights-out-event" class="game__button">Lights Out</button>
          <button id="test-calving-event" class="game__button">Calving</button>
          <button id="test-phoenix-event" class="game__button">Phoenix</button>
          <button id="test-steam-train-event" class="game__button">Steam Train</button>
          <button id="test-light-sail-event" class="game__button">Light Sail</button>
          <button id="test-inchworm-event" class="game__button">Inchworm</button>
          <button id="test-critical-mass-event" class="game__button">Critical Mass</button>
          <button id="test-knife-thrower-event" class="game__button">Knife Thrower</button>
          <button id="test-compactor-event" class="game__button">Compactor</button>
          <button id="test-core-sample-event" class="game__button">Core Sample</button>
          <button id="test-foam-party-event" class="game__button">Foam Party</button>
          <button id="test-langtons-ant-event" class="game__button">Langton's Ant</button>
          <button id="test-othello-event" class="game__button">Othello</button>
          <button id="test-airbrush-event" class="game__button">Airbrush</button>
          <button id="test-capillary-event" class="game__button">Capillary</button>
          <button id="test-battle-tops-event" class="game__button">Battle Tops</button>
          <button id="test-pneumatic-tubes-event" class="game__button">Pneumatic Tubes</button>
          <button id="test-star-polygon-event" class="game__button">Star Polygon</button>
          <button id="test-volt-spider-event" class="game__button">Volt Spider</button>
          <button id="test-orbital-decay-event" class="game__button">Orbital Decay</button>
          <button id="test-spray-and-pray-event" class="game__button">Spray and Pray</button>
          <button id="test-shuttle-event" class="game__button">Shuttle</button>
          <button id="test-drill-duel-event" class="game__button">Drill Duel</button>
          <button id="test-rule-30-event" class="game__button">Rule 30</button>
          <button id="test-fountain-show-event" class="game__button">Fountain Show</button>
          <button id="test-spinning-plates-event" class="game__button">Spinning Plates</button>
          <button id="test-scoops-event" class="game__button">Scoops</button>
          <button id="test-solar-furnace-event" class="game__button">Solar Furnace</button>
          <button id="test-lightning-hands-event" class="game__button">Lightning Hands</button>
          <button id="test-ring-of-fire-event" class="game__button">Ring of Fire</button>
          <button id="test-bullet-clash-event" class="game__button">Bullet Clash</button>
          <button id="test-bounce-pass-event" class="game__button">Bounce Pass</button>
          <button id="test-oil-strike-event" class="game__button">Oil Strike</button>
          <button id="test-harmonograph-event" class="game__button">Harmonograph</button>
          <button id="test-quicksort-event" class="game__button">Quicksort</button>
          <button id="test-auger-event" class="game__button">Auger</button>
          <button id="test-tidal-bore-event" class="game__button">Tidal Bore</button>
          <button id="test-scrum-event" class="game__button">Scrum</button>
          <button id="test-gold-rush-event" class="game__button">Gold Rush</button>
          <button id="test-suspension-bridge-event" class="game__button">Suspension Bridge</button>
          <button id="test-redline-event" class="game__button">Redline</button>
          <button id="test-willow-event" class="game__button">Willow</button>
          <button id="test-quickdraw-event" class="game__button">Quickdraw</button>
          <button id="test-galilean-cannon-event" class="game__button">Galilean Cannon</button>
          <button id="test-chaos-game-event" class="game__button">Chaos Game</button>
          <button id="test-sandpile-event" class="game__button">Sandpile</button>
          <button id="test-cotton-candy-event" class="game__button">Cotton Candy</button>
          <button id="test-peloton-event" class="game__button">Peloton</button>
          <button id="test-drinking-bird-event" class="game__button">Drinking Bird</button>
          <button id="test-laser-drill-event" class="game__button">Laser Drill</button>
          <button id="test-hair-raiser-event" class="game__button">Hair Raiser</button>
          <button id="test-detonator-event" class="game__button">Detonator</button>
          <button id="test-bullet-rain-event" class="game__button">Bullet Rain</button>
          <button id="test-bouncy-castle-event" class="game__button">Bouncy Castle</button>
          <button id="test-game-of-life-event" class="game__button">Game of Life</button>
          <button id="test-labyrinth-event" class="game__button">Labyrinth</button>
          <button id="test-blowhole-event" class="game__button">Blowhole</button>
          <button id="test-lamplighter-event" class="game__button">Lamplighter</button>
          <button id="test-fire-brigade-event" class="game__button">Fire Brigade</button>
          <button id="test-spokes-event" class="game__button">Spokes</button>
          <button id="test-thunder-ring-event" class="game__button">Thunder Ring</button>
          <button id="test-bottle-rocket-event" class="game__button">Bottle Rocket</button>
          <button id="test-skeet-event" class="game__button">Skeet</button>
          <button id="test-tennis-event" class="game__button">Tennis</button>
          <button id="test-interlace-event" class="game__button">Interlace</button>
          <button id="test-mirror-mirror-event" class="game__button">Mirror Mirror</button>
          <button id="test-riptide-event" class="game__button">Riptide</button>
          <button id="test-fencing-event" class="game__button">Fencing</button>
          <button id="test-water-tower-event" class="game__button">Water Tower</button>
          <button id="test-barber-pole-event" class="game__button">Barber Pole</button>
          <button id="test-ion-cannon-event" class="game__button">Ion Cannon</button>
          <button id="test-claymore-event" class="game__button">Claymore</button>
          <button id="test-pepperbox-event" class="game__button">Pepperbox</button>
          <button id="test-squash-event" class="game__button">Squash</button>
          <button id="test-vertical-hold-event" class="game__button">Vertical Hold</button>
          <button id="test-halftone-event" class="game__button">Halftone</button>
          <button id="test-twin-whirlpools-event" class="game__button">Twin Whirlpools</button>
          <button id="test-hatchlings-event" class="game__button">Hatchlings</button>
          <button id="test-butterfingers-event" class="game__button">Butterfingers</button>
          <button id="test-lock-pick-event" class="game__button">Lock Pick</button>
          <button id="test-blacksmith-event" class="game__button">Blacksmith</button>
          <button id="test-seismic-charges-event" class="game__button">Seismic Charges</button>
          <button id="test-skip-shots-event" class="game__button">Skip Shots</button>
          <button id="test-jumping-beans-event" class="game__button">Jumping Beans</button>
          <button id="test-swiss-cheese-event" class="game__button">Swiss Cheese</button>
          <button id="test-exploded-view-event" class="game__button">Exploded View</button>
          <button id="test-dome-fountains-event" class="game__button">Dome Fountains</button>
          <button id="test-bell-ringers-event" class="game__button">Bell Ringers</button>
          <button id="test-wet-dog-event" class="game__button">Wet Dog</button>
          <button id="test-tower-crane-event" class="game__button">Tower Crane</button>
          <button id="test-bead-lightning-event" class="game__button">Bead Lightning</button>
          <button id="test-rockslide-event" class="game__button">Rockslide</button>
          <button id="test-tight-group-event" class="game__button">Tight Group</button>
          <button id="test-jacks-event" class="game__button">Jacks</button>
          <button id="test-reflecting-pool-event" class="game__button">Reflecting Pool</button>
          <button id="test-pin-art-event" class="game__button">Pin Art</button>
          <button id="test-eddies-event" class="game__button">Eddies</button>
          <button id="test-tube-man-event" class="game__button">Tube Man</button>
          <button id="test-deflate-event" class="game__button">Deflate</button>
          <button id="test-gear-train-event" class="game__button">Gear Train</button>
          <button id="test-upstrike-event" class="game__button">Upstrike</button>
          <button id="test-creeping-barrage-event" class="game__button">Creeping Barrage</button>
          <button id="test-ballistic-pendulum-event" class="game__button">Ballistic Pendulum</button>
          <button id="test-ring-taw-event" class="game__button">Ring Taw</button>
          <button id="test-rainy-window-event" class="game__button">Rainy Window</button>
          <button id="test-inflate-event" class="game__button">Inflate</button>
          <button id="test-jumping-jets-event" class="game__button">Jumping Jets</button>
          <button id="test-bubble-chamber-event" class="game__button">Bubble Chamber</button>
          <button id="test-cast-net-event" class="game__button">Cast Net</button>
          <button id="test-hoberman-event" class="game__button">Hoberman</button>
          <button id="test-excalibur-event" class="game__button">Excalibur</button>
          <button id="test-pistons-event" class="game__button">Pistons</button>
          <button id="test-william-tell-event" class="game__button">William Tell</button>
          <button id="test-foosball-event" class="game__button">Foosball</button>
          <button id="test-rubber-sheet-event" class="game__button">Rubber Sheet</button>
          <button id="test-rattle-event" class="game__button">Rattle</button>
          <button id="test-stunt-track-event" class="game__button">Stunt Track</button>
          <button id="test-fleas-event" class="game__button">Fleas</button>
          <button id="test-hand-pump-event" class="game__button">Hand Pump</button>
          <button id="test-pick-up-sticks-event" class="game__button">Pick-Up Sticks</button>
          <button id="test-thunder-shell-event" class="game__button">Thunder Shell</button>
          <button id="test-mid-air-event" class="game__button">Mid-Air</button>
          <button id="test-chain-fire-event" class="game__button">Chain Fire</button>
          <button id="test-rim-shot-event" class="game__button">Rim Shot</button>
          <button id="test-tin-roof-event" class="game__button">Tin Roof</button>
          <button id="test-crumple-event" class="game__button">Crumple</button>
          <button id="test-minimize-event" class="game__button">Minimize</button>
          <button id="test-head-on-event" class="game__button">Head-On</button>
          <button id="test-pyramid-event" class="game__button">Pyramid</button>
          <button id="test-pizza-toss-event" class="game__button">Pizza Toss</button>
          <button id="test-compass-event" class="game__button">Compass</button>
          <button id="test-skewer-event" class="game__button">Skewer</button>
          <button id="test-bomb-comet-event" class="game__button">Bomb Comet</button>
          <button id="test-kaboom-event" class="game__button">Kaboom</button>
          <button id="test-return-fire-event" class="game__button">Return Fire</button>
          <button id="test-frosted-glass-event" class="game__button">Frosted Glass</button>
          <button id="test-switch-off-event" class="game__button">Switch Off</button>
          <button id="test-chain-fountain-event" class="game__button">Chain Fountain</button>
          <button id="test-smoke-rings-event" class="game__button">Smoke Rings</button>
          <button id="test-water-salute-event" class="game__button">Water Salute</button>
          <button id="test-double-pendulum-event" class="game__button">Double Pendulum</button>
          <button id="test-trapeze-event" class="game__button">Trapeze</button>
          <button id="test-diabolo-event" class="game__button">Diabolo</button>
          <button id="test-zorb-event" class="game__button">Zorb</button>
          <button id="test-hoop-dive-event" class="game__button">Hoop Dive</button>
          <button id="test-spin-art-event" class="game__button">Spin Art</button>
          <button id="test-paper-cutter-event" class="game__button">Paper Cutter</button>
          <button id="test-flippers-event" class="game__button">Flippers</button>
          <button id="test-drawbridge-event" class="game__button">Drawbridge</button>
          <button id="test-flail-event" class="game__button">Flail</button>
          <button id="test-vine-swing-event" class="game__button">Vine Swing</button>
          <button id="test-bomb-snowball-event" class="game__button">Bomb Snowball</button>
          <button id="test-gerb-event" class="game__button">Gerb</button>
          <button id="test-recoil-event" class="game__button">Recoil</button>
          <button id="test-tumble-fire-event" class="game__button">Tumble Fire</button>
          <button id="test-roll-up-event" class="game__button">Roll Up</button>
          <button id="test-shredder-event" class="game__button">Shredder</button>
          <button id="test-whip-zoom-event" class="game__button">Whip Zoom</button>
          <button id="test-iris-out-event" class="game__button">Iris Out</button>
          <button id="test-screen-reels-event" class="game__button">Screen Reels</button>
          <button id="test-gold-leaf-event" class="game__button">Gold Leaf</button>
          <button id="test-pixel-storm-event" class="game__button">Pixel Storm</button>
          <button id="test-gravity-flip-event" class="game__button">Gravity Flip</button>
          <button id="test-echo-event" class="game__button">Echo</button>
          <button id="test-mirror-box-event" class="game__button">Mirror Box</button>
          <button id="test-pull-back-event" class="game__button">Pull Back</button>
          <button id="test-treadmill-event" class="game__button">Treadmill</button>
          <button id="test-blast-off-event" class="game__button">Blast Off</button>
          <button id="test-pop-up-event" class="game__button">Pop-Up</button>
          <button id="test-sticker-peel-event" class="game__button">Sticker Peel</button>
          <button id="test-glissando-event" class="game__button">Glissando</button>
          <button id="test-vault-doors-event" class="game__button">Vault Doors</button>
          <button id="test-champagne-tower-event" class="game__button">Champagne Tower</button>
          <button id="test-pinball-river-event" class="game__button">Pinball River</button>
          <button id="test-pressure-washer-event" class="game__button">Pressure Washer</button>
          <button id="test-irrigation-event" class="game__button">Irrigation</button>
          <button id="test-waterspout-event" class="game__button">Waterspout</button>
          <button id="test-sidewinder-event" class="game__button">Sidewinder</button>
          <button id="test-orbit-swap-event" class="game__button">Orbit Swap</button>
          <button id="test-cuckoo-event" class="game__button">Cuckoo</button>
          <button id="test-gyre-event" class="game__button">Gyre</button>
          <button id="test-bar-hop-event" class="game__button">Bar Hop</button>
          <button id="test-comet-plow-event" class="game__button">Comet Plow</button>
          <button id="test-hose-reel-event" class="game__button">Hose Reel</button>
          <button id="test-geyser-rider-event" class="game__button">Geyser Rider</button>
          <button id="test-bubble-blower-event" class="game__button">Bubble Blower</button>
          <button id="test-pool-dive-event" class="game__button">Pool Dive</button>
          <button id="test-rubber-band-event" class="game__button">Rubber Band</button>
          <button id="test-beam-vise-event" class="game__button">Beam Vise</button>
          <button id="test-laser-rake-event" class="game__button">Laser Rake</button>
          <button id="test-light-dominoes-event" class="game__button">Light Dominoes</button>
          <button id="test-pry-bar-event" class="game__button">Pry Bar</button>
          <button id="test-tesla-tennis-event" class="game__button">Tesla Tennis</button>
          <button id="test-tuning-fork-event" class="game__button">Tuning Fork</button>
          <button id="test-bolt-spiral-event" class="game__button">Bolt Spiral</button>
          <button id="test-ground-current-event" class="game__button">Ground Current</button>
          <button id="test-overcharge-event" class="game__button">Overcharge</button>
          <button id="test-bomb-tornado-event" class="game__button">Bomb Tornado</button>
          <button id="test-bomb-boomerang-event" class="game__button">Bomb Boomerang</button>
          <button id="test-multistage-event" class="game__button">Multistage</button>
          <button id="test-bomb-pile-event" class="game__button">Bomb Pile</button>
          <button id="test-bomb-garland-event" class="game__button">Bomb Garland</button>
          <button id="test-homing-rounds-event" class="game__button">Homing Rounds</button>
          <button id="test-wave-cannon-event" class="game__button">Wave Cannon</button>
          <button id="test-snapback-event" class="game__button">Snapback</button>
          <button id="test-bullet-funnel-event" class="game__button">Bullet Funnel</button>
          <button id="test-crisscross-event" class="game__button">Crisscross</button>
          <button id="test-spillway-event" class="game__button">Spillway</button>
          <button id="test-crosscurrents-event" class="game__button">Crosscurrents</button>
          <button id="test-oxbow-event" class="game__button">Oxbow</button>
          <button id="test-breakers-event" class="game__button">Breakers</button>
          <button id="test-rivulets-event" class="game__button">Rivulets</button>
          <button id="test-torrent-event" class="game__button">Torrent</button>
          <button id="test-lissajous-event" class="game__button">Lissajous</button>
          <button id="test-moon-hop-event" class="game__button">Moon Hop</button>
          <button id="test-peekaboo-event" class="game__button">Peekaboo</button>
          <button id="test-tilt-a-whirl-event" class="game__button">Tilt-a-Whirl</button>
          <button id="test-water-strider-event" class="game__button">Water Strider</button>
          <button id="test-rope-climb-event" class="game__button">Rope Climb</button>
          <button id="test-paddle-steamer-event" class="game__button">Paddle Steamer</button>
          <button id="test-jet-wash-event" class="game__button">Jet Wash</button>
          <button id="test-bellows-event" class="game__button">Bellows</button>
          <button id="test-rain-dance-event" class="game__button">Rain Dance</button>
          <button id="test-ski-tow-event" class="game__button">Ski Tow</button>
          <button id="test-ribbon-dancer-event" class="game__button">Ribbon Dancer</button>
          <button id="test-laser-turnstile-event" class="game__button">Laser Turnstile</button>
          <button id="test-light-bridge-event" class="game__button">Light Bridge</button>
          <button id="test-laser-web-event" class="game__button">Laser Web</button>
          <button id="test-footlights-event" class="game__button">Footlights</button>
          <button id="test-fusion-beam-event" class="game__button">Fusion Beam</button>
          <button id="test-pinpoint-event" class="game__button">Pinpoint</button>
          <button id="test-galvanize-event" class="game__button">Galvanize</button>
          <button id="test-spark-jump-event" class="game__button">Spark Jump</button>
          <button id="test-static-cling-event" class="game__button">Static Cling</button>
          <button id="test-capacitor-event" class="game__button">Capacitor</button>
          <button id="test-spark-train-event" class="game__button">Spark Train</button>
          <button id="test-arc-bridge-event" class="game__button">Arc Bridge</button>
          <button id="test-daisy-cutter-event" class="game__button">Daisy Cutter</button>
          <button id="test-ripple-mines-event" class="game__button">Ripple Mines</button>
          <button id="test-bomb-yo-yo-event" class="game__button">Bomb Yo-Yo</button>
          <button id="test-bomb-hail-event" class="game__button">Bomb Hail</button>
          <button id="test-ground-pound-event" class="game__button">Ground Pound</button>
          <button id="test-cherry-bomb-event" class="game__button">Cherry Bomb</button>
          <button id="test-bomb-crown-event" class="game__button">Bomb Crown</button>
          <button id="test-bullet-comb-event" class="game__button">Bullet Comb</button>
          <button id="test-bullet-braid-event" class="game__button">Bullet Braid</button>
          <button id="test-bullet-cage-event" class="game__button">Bullet Cage</button>
          <button id="test-gunslinger-event" class="game__button">Gunslinger</button>
          <button id="test-bullet-wheel-event" class="game__button">Bullet Wheel</button>
          <button id="test-bullet-ladder-event" class="game__button">Bullet Ladder</button>
          <button id="test-canal-locks-event" class="game__button">Canal Locks</button>
          <button id="test-bobsled-event" class="game__button">Bobsled</button>
          <button id="test-spring-loaded-event" class="game__button">Spring Loaded</button>
          <button id="test-influx-event" class="game__button">Influx</button>
          <button id="test-uneven-bars-event" class="game__button">Uneven Bars</button>
          <button id="test-bumblebee-event" class="game__button">Bumblebee</button>
          <button id="test-shot-put-event" class="game__button">Shot Put</button>
          <button id="test-human-cannonball-event" class="game__button">Human Cannonball</button>
          <button id="test-fox-and-hounds-event" class="game__button">Fox and Hounds</button>
          <button id="test-kingfisher-event" class="game__button">Kingfisher</button>
          <button id="test-joust-event" class="game__button">Joust</button>
          <button id="test-pelican-event" class="game__button">Pelican</button>
          <button id="test-dragster-event" class="game__button">Dragster</button>
          <button id="test-fire-breather-event" class="game__button">Fire Breather</button>
          <button id="test-bucket-swing-event" class="game__button">Bucket Swing</button>
          <button id="test-puppeteer-event" class="game__button">Puppeteer</button>
          <button id="test-corona-event" class="game__button">Corona</button>
          <button id="test-pillars-event" class="game__button">Pillars</button>
          <button id="test-laser-ladder-event" class="game__button">Laser Ladder</button>
          <button id="test-beam-splitter-event" class="game__button">Beam Splitter</button>
          <button id="test-teleporter-event" class="game__button">Teleporter</button>
          <button id="test-ring-light-event" class="game__button">Ring Light</button>
          <button id="test-taser-event" class="game__button">Taser</button>
          <button id="test-arc-furnace-event" class="game__button">Arc Furnace</button>
          <button id="test-five-fingers-event" class="game__button">Five Fingers</button>
          <button id="test-cattle-prod-event" class="game__button">Cattle Prod</button>
          <button id="test-bolt-sling-event" class="game__button">Bolt Sling</button>
          <button id="test-colliding-storms-event" class="game__button">Colliding Storms</button>
          <button id="test-bomb-juggler-event" class="game__button">Bomb Juggler</button>
          <button id="test-bomb-squad-event" class="game__button">Bomb Squad</button>
          <button id="test-splitter-event" class="game__button">Splitter</button>
          <button id="test-bomb-pendulum-event" class="game__button">Bomb Pendulum</button>
          <button id="test-paradrop-event" class="game__button">Paradrop</button>
          <button id="test-bomb-pachinko-event" class="game__button">Bomb Pachinko</button>
          <button id="test-fuse-clock-event" class="game__button">Fuse Clock</button>
          <button id="test-hedgehog-event" class="game__button">Hedgehog</button>
          <button id="test-split-shot-event" class="game__button">Split Shot</button>
          <button id="test-bullet-lasso-event" class="game__button">Bullet Lasso</button>
          <button id="test-bullet-weave-event" class="game__button">Bullet Weave</button>
          <button id="test-bullet-fountain-event" class="game__button">Bullet Fountain</button>
          <button id="test-covering-fire-event" class="game__button">Covering Fire</button>
          <button id="test-checkers-event" class="game__button">Checkers</button>
          <button id="test-minesweeper-event" class="game__button">Minesweeper</button>
          <button id="test-jack-in-the-box-event" class="game__button">Jack-in-the-Box</button>
          <button id="test-half-pipe-event" class="game__button">Half-Pipe</button>
          <button id="test-knot-event" class="game__button">Knot</button>
          <button id="test-ticker-tape-event" class="game__button">Ticker Tape</button>
          <button id="test-cash-bridge-event" class="game__button">Cash Bridge</button>
          <button id="test-skipping-stone-event" class="game__button">Skipping Stone</button>
          <button id="test-woodpecker-event" class="game__button">Woodpecker</button>
          <button id="test-frisbee-event" class="game__button">Frisbee</button>
          <button id="test-kangaroo-event" class="game__button">Kangaroo</button>
          <button id="test-badminton-event" class="game__button">Badminton</button>
          <button id="test-tumbleweed-event" class="game__button">Tumbleweed</button>
          <button id="test-shuttle-run-event" class="game__button">Shuttle Run</button>
          <button id="test-echolocation-event" class="game__button">Echolocation</button>
          <button id="test-lacrosse-event" class="game__button">Lacrosse</button>
          <button id="test-jet-ski-event" class="game__button">Jet Ski</button>
          <button id="test-drinking-straw-event" class="game__button">Drinking Straw</button>
          <button id="test-sea-serpent-event" class="game__button">Sea Serpent</button>
          <button id="test-magic-trick-event" class="game__button">Magic Trick</button>
          <button id="test-fountain-pen-event" class="game__button">Fountain Pen</button>
          <button id="test-spool-event" class="game__button">Spool</button>
          <button id="test-laser-rain-event" class="game__button">Laser Rain</button>
          <button id="test-cross-cut-event" class="game__button">Cross-Cut</button>
          <button id="test-heliograph-event" class="game__button">Heliograph</button>
          <button id="test-starburst-event" class="game__button">Starburst</button>
          <button id="test-thunder-drum-event" class="game__button">Thunder Drum</button>
          <button id="test-bolt-barrage-event" class="game__button">Bolt Barrage</button>
          <button id="test-coilgun-event" class="game__button">Coilgun</button>
          <button id="test-snowflake-event" class="game__button">Snowflake</button>
          <button id="test-bomb-snake-event" class="game__button">Bomb Snake</button>
          <button id="test-spider-mines-event" class="game__button">Spider Mines</button>
          <button id="test-crossette-event" class="game__button">Crossette</button>
          <button id="test-spiral-charge-event" class="game__button">Spiral Charge</button>
          <button id="test-bomb-bubbles-event" class="game__button">Bomb Bubbles</button>
          <button id="test-rocket-sled-event" class="game__button">Rocket Sled</button>
          <button id="test-dynamite-fishing-event" class="game__button">Dynamite Fishing</button>
          <button id="test-charge-shot-event" class="game__button">Charge Shot</button>
          <button id="test-corkscrew-rounds-event" class="game__button">Corkscrew Rounds</button>
          <button id="test-orbital-guns-event" class="game__button">Orbital Guns</button>
          <button id="test-tracer-rounds-event" class="game__button">Tracer Rounds</button>
          <button id="test-pellet-storm-event" class="game__button">Pellet Storm</button>
          <button id="test-bullet-snake-event" class="game__button">Bullet Snake</button>
          <button id="test-rock-paper-scissors-event" class="game__button">Rock Paper Scissors</button>
          <button id="test-limbo-event" class="game__button">Limbo</button>
          <button id="test-quiz-show-event" class="game__button">Quiz Show</button>
          <button id="test-sumo-event" class="game__button">Sumo</button>
          <button id="test-paper-toss-event" class="game__button">Paper Toss</button>
          <button id="test-arm-wrestling-event" class="game__button">Arm Wrestling</button>
          <button id="test-keepy-uppy-event" class="game__button">Keepy Uppy</button>
          <button id="test-pin-the-tail-event" class="game__button">Pin the Tail</button>
          <button id="test-trust-fall-event" class="game__button">Trust Fall</button>
          <button id="test-bubble-gum-event" class="game__button">Bubble Gum</button>
          <button id="test-bolt-of-cash-event" class="game__button">Bolt of Cash</button>
          <button id="test-pendulum-pour-event" class="game__button">Pendulum Pour</button>
          <button id="test-pop-the-cork-event" class="game__button">Pop the Cork</button>
          <button id="test-wall-jump-event" class="game__button">Wall Jump</button>
          <button id="test-superball-event" class="game__button">Superball</button>
          <button id="test-spin-dash-event" class="game__button">Spin Dash</button>
          <button id="test-cupid-event" class="game__button">Cupid</button>
          <button id="test-stork-event" class="game__button">Stork</button>
          <button id="test-paper-plane-event" class="game__button">Paper Plane</button>
          <button id="test-spike-event" class="game__button">Spike</button>
          <button id="test-toaster-event" class="game__button">Toaster</button>
          <button id="test-xylophone-event" class="game__button">Xylophone</button>
          <button id="test-birthday-candles-event" class="game__button">Birthday Candles</button>
          <button id="test-drop-tower-event" class="game__button">Drop Tower</button>
          <button id="test-arrow-volley-event" class="game__button">Arrow Volley</button>
          <button id="test-make-a-wish-event" class="game__button">Make a Wish</button>
          <button id="test-blunderbuss-event" class="game__button">Blunderbuss</button>
          <button id="test-genie-event" class="game__button">Genie</button>
          <button id="test-solar-flare-event" class="game__button">Solar Flare</button>
          <button id="test-heat-vision-event" class="game__button">Heat Vision</button>
          <button id="test-print-head-event" class="game__button">Print Head</button>
          <button id="test-aurora-event" class="game__button">Aurora</button>
          <button id="test-thunder-rings-event" class="game__button">Thunder Rings</button>
          <button id="test-arc-weld-event" class="game__button">Arc Weld</button>
          <button id="test-storm-kite-event" class="game__button">Storm Kite</button>
          <button id="test-volcanic-lightning-event" class="game__button">Volcanic Lightning</button>
          <button id="test-sculptor-event" class="game__button">Sculptor</button>
          <button id="test-grand-finale-event" class="game__button">Grand Finale</button>
          <button id="test-bomb-bouquet-event" class="game__button">Bomb Bouquet</button>
          <button id="test-cascade-event" class="game__button">Cascade</button>
          <button id="test-pinball-bomb-event" class="game__button">Pinball Bomb</button>
          <button id="test-bomb-train-event" class="game__button">Bomb Train</button>
          <button id="test-breaching-charge-event" class="game__button">Breaching Charge</button>
          <button id="test-confetti-cannon-event" class="game__button">Confetti Cannon</button>
          <button id="test-ammo-belt-event" class="game__button">Ammo Belt</button>
          <button id="test-gauntlet-event" class="game__button">Gauntlet</button>
          <button id="test-turret-tower-event" class="game__button">Turret Tower</button>
          <button id="test-shell-casings-event" class="game__button">Shell Casings</button>
          <button id="test-darts-event" class="game__button">Darts</button>
          <button id="test-battleship-event" class="game__button">Battleship</button>
          <button id="test-interceptors-event" class="game__button">Interceptors</button>
          <button id="test-land-grab-event" class="game__button">Land Grab</button>
          <button id="test-duck-duck-goose-event" class="game__button">Duck Duck Goose</button>
          <button id="test-ringer-event" class="game__button">Ringer</button>
          <button id="test-hurdles-event" class="game__button">Hurdles</button>
          <button id="test-lucky-roll-event" class="game__button">Lucky Roll</button>
          <button id="test-cash-register-event" class="game__button">Cash Register</button>
          <button id="test-horse-race-event" class="game__button">Horse Race</button>
          <button id="test-dunk-tank-event" class="game__button">Dunk Tank</button>
          <button id="test-bungee-event" class="game__button">Bungee</button>
          <button id="test-funnel-cake-event" class="game__button">Funnel Cake</button>
          <button id="test-chrysanthemum-event" class="game__button">Chrysanthemum</button>
          <button id="test-crossroads-event" class="game__button">Crossroads</button>
          <button id="test-waterslide-event" class="game__button">Waterslide</button>
          <button id="test-banner-event" class="game__button">Banner</button>
          <button id="test-haunt-event" class="game__button">Haunt</button>
          <button id="test-maple-seeds-event" class="game__button">Maple Seeds</button>
          <button id="test-donuts-event" class="game__button">Donuts</button>
          <button id="test-hamster-wheel-event" class="game__button">Hamster Wheel</button>
          <button id="test-lunar-lander-event" class="game__button">Lunar Lander</button>
          <button id="test-dowsing-event" class="game__button">Dowsing</button>
          <button id="test-matador-event" class="game__button">Matador</button>
          <button id="test-flash-flood-event" class="game__button">Flash Flood</button>
          <button id="test-dolphin-event" class="game__button">Dolphin</button>
          <button id="test-puffer-event" class="game__button">Puffer</button>
          <button id="test-hockey-stop-event" class="game__button">Hockey Stop</button>
          <button id="test-twirl-event" class="game__button">Twirl</button>
          <button id="test-whale-event" class="game__button">Whale</button>
          <button id="test-light-painting-event" class="game__button">Light Painting</button>
          <button id="test-saber-throw-event" class="game__button">Saber Throw</button>
          <button id="test-laser-maze-event" class="game__button">Laser Maze</button>
          <button id="test-tape-measure-event" class="game__button">Tape Measure</button>
          <button id="test-pulsar-event" class="game__button">Pulsar</button>
          <button id="test-short-circuit-event" class="game__button">Short Circuit</button>
          <button id="test-conductor-event" class="game__button">Conductor</button>
          <button id="test-double-strike-event" class="game__button">Double Strike</button>
          <button id="test-lightning-fence-event" class="game__button">Lightning Fence</button>
          <button id="test-heat-lightning-event" class="game__button">Heat Lightning</button>
          <button id="test-powder-kegs-event" class="game__button">Powder Kegs</button>
          <button id="test-bomb-fountain-event" class="game__button">Bomb Fountain</button>
          <button id="test-frag-out-event" class="game__button">Frag Out</button>
          <button id="test-fault-line-event" class="game__button">Fault Line</button>
          <button id="test-willow-shells-event" class="game__button">Willow Shells</button>
          <button id="test-swarm-strike-event" class="game__button">Swarm Strike</button>
          <button id="test-concentric-event" class="game__button">Concentric</button>
          <button id="test-graze-event" class="game__button">Graze</button>
          <button id="test-hotfoot-event" class="game__button">Hotfoot</button>
          <button id="test-dogfight-event" class="game__button">Dogfight</button>
          <button id="test-bullet-rose-event" class="game__button">Bullet Rose</button>
          <button id="test-armor-piercer-event" class="game__button">Armor Piercer</button>
          <button id="test-spotter-event" class="game__button">Spotter</button>
          <button id="test-peg-solitaire-event" class="game__button">Peg Solitaire</button>
          <button id="test-marble-drop-event" class="game__button">Marble Drop</button>
          <button id="test-statues-event" class="game__button">Statues</button>
          <button id="test-flappy-wisp-event" class="game__button">Flappy Wisp</button>
          <button id="test-buried-treasure-event" class="game__button">Buried Treasure</button>
          <button id="test-air-hockey-event" class="game__button">Air Hockey</button>
          <button id="test-delta-event" class="game__button">Delta</button>
          <button id="test-hydrant-event" class="game__button">Hydrant</button>
          <button id="test-cloverleaf-event" class="game__button">Cloverleaf</button>
          <button id="test-pinstripe-event" class="game__button">Pinstripe</button>
          <button id="test-faucet-event" class="game__button">Faucet</button>
          <button id="test-showerhead-event" class="game__button">Showerhead</button>
          <button id="test-binary-star-event" class="game__button">Binary Star</button>
          <button id="test-hopscotch-event" class="game__button">Hopscotch</button>
          <button id="test-tadpoles-event" class="game__button">Tadpoles</button>
          <button id="test-blink-event" class="game__button">Blink</button>
          <button id="test-bumper-cars-event" class="game__button">Bumper Cars</button>
          <button id="test-pigeons-event" class="game__button">Pigeons</button>
          <button id="test-squid-event" class="game__button">Squid</button>
          <button id="test-water-pistol-event" class="game__button">Water Pistol</button>
          <button id="test-poi-event" class="game__button">Poi</button>
          <button id="test-bartender-event" class="game__button">Bartender</button>
          <button id="test-pole-vault-event" class="game__button">Pole Vault</button>
          <button id="test-paint-roller-event" class="game__button">Paint Roller</button>
          <button id="test-buzzsaw-event" class="game__button">Buzzsaw</button>
          <button id="test-light-cycles-event" class="game__button">Light Cycles</button>
          <button id="test-fiber-optic-event" class="game__button">Fiber Optic</button>
          <button id="test-daddy-longlegs-event" class="game__button">Daddy Longlegs</button>
          <button id="test-knighthood-event" class="game__button">Knighthood</button>
          <button id="test-cutting-torch-event" class="game__button">Cutting Torch</button>
          <button id="test-st-elmos-fire-event" class="game__button">St. Elmo's Fire</button>
          <button id="test-stepped-leader-event" class="game__button">Stepped Leader</button>
          <button id="test-trolley-event" class="game__button">Trolley</button>
          <button id="test-bolt-bounce-event" class="game__button">Bolt Bounce</button>
          <button id="test-storm-crown-event" class="game__button">Storm Crown</button>
          <button id="test-van-de-graaff-event" class="game__button">Van de Graaff</button>
          <button id="test-barrel-roll-event" class="game__button">Barrel Roll</button>
          <button id="test-bomb-stack-event" class="game__button">Bomb Stack</button>
          <button id="test-roman-candle-event" class="game__button">Roman Candle</button>
          <button id="test-whistlers-event" class="game__button">Whistlers</button>
          <button id="test-trebuchet-event" class="game__button">Trebuchet</button>
          <button id="test-drop-pods-event" class="game__button">Drop Pods</button>
          <button id="test-bomb-carousel-event" class="game__button">Bomb Carousel</button>
          <button id="test-last-stand-event" class="game__button">Last Stand</button>
          <button id="test-tin-can-event" class="game__button">Tin Can</button>
          <button id="test-point-defense-event" class="game__button">Point Defense</button>
          <button id="test-target-practice-event" class="game__button">Target Practice</button>
          <button id="test-flare-gun-event" class="game__button">Flare Gun</button>
          <button id="test-rappel-event" class="game__button">Rappel</button>
          <button id="test-stacker-event" class="game__button">Stacker</button>
          <button id="test-coin-pusher-event" class="game__button">Coin Pusher</button>
          <button id="test-high-striker-event" class="game__button">High Striker</button>
          <button id="test-note-highway-event" class="game__button">Note Highway</button>
          <button id="test-safecracker-event" class="game__button">Safecracker</button>
          <button id="test-gumball-machine-event" class="game__button">Gumball Machine</button>
          <button id="test-ninja-event" class="game__button">Ninja</button>
          <button id="test-sluice-event" class="game__button">Sluice</button>
          <button id="test-foundry-event" class="game__button">Foundry</button>
          <button id="test-jet-stream-event" class="game__button">Jet Stream</button>
          <button id="test-moat-event" class="game__button">Moat</button>
          <button id="test-seep-event" class="game__button">Seep</button>
          <button id="test-meander-event" class="game__button">Meander</button>
          <button id="test-waltz-event" class="game__button">Waltz</button>
          <button id="test-gyroscope-event" class="game__button">Gyroscope</button>
          <button id="test-dragonfly-event" class="game__button">Dragonfly</button>
          <button id="test-ring-toss-event" class="game__button">Ring Toss</button>
          <button id="test-slipstream-event" class="game__button">Slipstream</button>
          <button id="test-sheet-music-event" class="game__button">Sheet Music</button>
          <button id="test-leaf-blower-event" class="game__button">Leaf Blower</button>
          <button id="test-loom-event" class="game__button">Loom</button>
          <button id="test-high-dive-event" class="game__button">High Dive</button>
          <button id="test-sower-event" class="game__button">Sower</button>
          <button id="test-courier-event" class="game__button">Courier</button>
          <button id="test-rodeo-event" class="game__button">Rodeo</button>
          <button id="test-crosshair-event" class="game__button">Crosshair</button>
          <button id="test-iris-event" class="game__button">Iris</button>
          <button id="test-bank-shot-event" class="game__button">Bank Shot</button>
          <button id="test-sunbeams-event" class="game__button">Sunbeams</button>
          <button id="test-stargate-event" class="game__button">Stargate</button>
          <button id="test-cats-cradle-event" class="game__button">Cat's Cradle</button>
          <button id="test-thunderhead-event" class="game__button">Thunderhead</button>
          <button id="test-pitchfork-event" class="game__button">Pitchfork</button>
          <button id="test-jumper-cables-event" class="game__button">Jumper Cables</button>
          <button id="test-lash-event" class="game__button">Lash</button>
          <button id="test-spark-plug-event" class="game__button">Spark Plug</button>
          <button id="test-live-wire-event" class="game__button">Live Wire</button>
          <button id="test-fuse-race-event" class="game__button">Fuse Race</button>
          <button id="test-bouncing-betty-event" class="game__button">Bouncing Betty</button>
          <button id="test-pressure-cooker-event" class="game__button">Pressure Cooker</button>
          <button id="test-hot-potato-event" class="game__button">Hot Potato</button>
          <button id="test-daisy-chain-event" class="game__button">Daisy Chain</button>
          <button id="test-shaped-charge-event" class="game__button">Shaped Charge</button>
          <button id="test-detcord-event" class="game__button">Detcord</button>
          <button id="test-bullet-bloom-event" class="game__button">Bullet Bloom</button>
          <button id="test-high-noon-event" class="game__button">High Noon</button>
          <button id="test-hailfire-event" class="game__button">Hailfire</button>
          <button id="test-dervish-event" class="game__button">Dervish</button>
          <button id="test-invaders-event" class="game__button">Invaders</button>
          <button id="test-gun-kata-event" class="game__button">Gun Kata</button>
          <button id="test-lockbuster-event" class="game__button">Lockbuster</button>
          <button id="test-connect-four-event" class="game__button">Connect Four</button>
          <button id="test-combo-event" class="game__button">Combo</button>
          <button id="test-skee-ball-event" class="game__button">Skee Ball</button>
          <button id="test-bubble-shooter-event" class="game__button">Bubble Shooter</button>
          <button id="test-mandala-event" class="game__button">Mandala</button>
          <button id="test-zen-garden-event" class="game__button">Zen Garden</button>
          <button id="test-accordion-event" class="game__button">Accordion</button>
          <button id="test-fizz-event" class="game__button">Fizz</button>
          <button id="test-soundwave-event" class="game__button">Soundwave</button>
          <button id="test-taffy-event" class="game__button">Taffy</button>
          <button id="test-drip-painting-event" class="game__button">Drip Painting</button>
          <button id="test-moths-event" class="game__button">Moths</button>
          <button id="test-curling-event" class="game__button">Curling</button>
          <button id="test-clothesline-event" class="game__button">Clothesline</button>
          <button id="test-balloon-pop-event" class="game__button">Balloon Pop</button>
          <button id="test-spin-bottle-event" class="game__button">Spin the Bottle</button>
          <button id="test-sky-writer-event" class="game__button">Sky Writer</button>
          <button id="test-gold-pan-event" class="game__button">Gold Pan</button>
          <button id="test-bulldozer-event" class="game__button">Bulldozer</button>
          <button id="test-koi-pond-event" class="game__button">Koi Pond</button>
          <button id="test-pipe-organ-event" class="game__button">Pipe Organ</button>
          <button id="test-ant-trail-event" class="game__button">Ant Trail</button>
          <button id="test-hot-air-balloon-event" class="game__button">Hot Air Balloon</button>
          <button id="test-lens-flare-event" class="game__button">Lens Flare</button>
          <button id="test-tightrope-event" class="game__button">Tightrope</button>
          <button id="test-neon-sign-event" class="game__button">Neon Sign</button>
          <button id="test-light-cage-event" class="game__button">Light Cage</button>
          <button id="test-stairway-event" class="game__button">Stairway</button>
          <button id="test-beacons-event" class="game__button">Beacons</button>
          <button id="test-anvil-crawler-event" class="game__button">Anvil Crawler</button>
          <button id="test-neurons-event" class="game__button">Neurons</button>
          <button id="test-bottled-bolt-event" class="game__button">Bottled Bolt</button>
          <button id="test-thunderbird-event" class="game__button">Thunderbird</button>
          <button id="test-spark-gap-event" class="game__button">Spark Gap</button>
          <button id="test-static-shock-event" class="game__button">Static Shock</button>
          <button id="test-rocket-jump-event" class="game__button">Rocket Jump</button>
          <button id="test-torpedoes-event" class="game__button">Torpedoes</button>
          <button id="test-airstrike-event" class="game__button">Airstrike</button>
          <button id="test-dambuster-event" class="game__button">Dambuster</button>
          <button id="test-airburst-event" class="game__button">Airburst</button>
          <button id="test-bomb-pinwheel-event" class="game__button">Bomb Pinwheel</button>
          <button id="test-bullet-curtain-event" class="game__button">Bullet Curtain</button>
          <button id="test-trick-shot-event" class="game__button">Trick Shot</button>
          <button id="test-rail-shooter-event" class="game__button">Rail Shooter</button>
          <button id="test-skeet-shoot-event" class="game__button">Skeet Shoot</button>
          <button id="test-triple-tap-event" class="game__button">Triple Tap</button>
          <button id="test-tommy-gun-event" class="game__button">Tommy Gun</button>
          <button id="test-sweeper-event" class="game__button">Sweeper</button>
          <button id="test-claw-machine-event" class="game__button">Claw Machine</button>
          <button id="test-lottery-event" class="game__button">Lottery</button>
          <button id="test-word-guess-event" class="game__button">Word Guess</button>
          <button id="test-memory-match-event" class="game__button">Memory Match</button>
          <button id="test-tic-tac-toe-event" class="game__button">Tic-Tac-Toe</button>
          <button id="test-rev-counter-event" class="game__button">Rev Counter</button>
          <button id="test-lava-lamp-event" class="game__button">Lava Lamp</button>
          <button id="test-dominoes-event" class="game__button">Dominoes</button>
          <button id="test-inkblot-event" class="game__button">Inkblot</button>
          <button id="test-soft-serve-event" class="game__button">Soft Serve</button>
          <button id="test-dollar-sign-event" class="game__button">Dollar Sign</button>
          <button id="test-mobius-event" class="game__button">Mobius</button>
          <button id="test-swiss-roll-event" class="game__button">Swiss Roll</button>
          <button id="test-dodgeball-event" class="game__button">Dodgeball</button>
          <button id="test-conga-line-event" class="game__button">Conga Line</button>
          <button id="test-spinning-top-event" class="game__button">Spinning Top</button>
          <button id="test-gobbler-event" class="game__button">Gobbler</button>
          <button id="test-majorette-event" class="game__button">Majorette</button>
          <button id="test-hula-hoop-event" class="game__button">Hula Hoop</button>
          <button id="test-calligraphy-event" class="game__button">Calligraphy</button>
          <button id="test-snake-charmer-event" class="game__button">Snake Charmer</button>
          <button id="test-plate-spinner-event" class="game__button">Plate Spinner</button>
          <button id="test-ferris-wheel-event" class="game__button">Ferris Wheel</button>
          <button id="test-bucket-brigade-event" class="game__button">Bucket Brigade</button>
          <button id="test-sky-lanterns-event" class="game__button">Sky Lanterns</button>
          <button id="test-engraver-event" class="game__button">Engraver</button>
          <button id="test-x-ray-event" class="game__button">X-Ray</button>
          <button id="test-laser-lasso-event" class="game__button">Laser Lasso</button>
          <button id="test-hex-ring-event" class="game__button">Hex Ring</button>
          <button id="test-portcullis-event" class="game__button">Portcullis</button>
          <button id="test-keyhole-event" class="game__button">Keyhole</button>
          <button id="test-defibrillator-event" class="game__button">Defibrillator</button>
          <button id="test-circuit-board-event" class="game__button">Circuit Board</button>
          <button id="test-mjolnir-event" class="game__button">Mjolnir</button>
          <button id="test-arc-flash-event" class="game__button">Arc Flash</button>
          <button id="test-four-corners-event" class="game__button">Four Corners</button>
          <button id="test-bolt-wheel-event" class="game__button">Bolt Wheel</button>
          <button id="test-minefield-event" class="game__button">Minefield</button>
          <button id="test-cannonade-event" class="game__button">Cannonade</button>
          <button id="test-sticky-bombs-event" class="game__button">Sticky Bombs</button>
          <button id="test-crossblast-event" class="game__button">Crossblast</button>
          <button id="test-mortar-event" class="game__button">Mortar</button>
          <button id="test-flashbang-event" class="game__button">Flashbang</button>
          <button id="test-sentry-turret-event" class="game__button">Sentry Turret</button>
          <button id="test-shotgun-event" class="game__button">Shotgun</button>
          <button id="test-boss-fight-event" class="game__button">Boss Fight</button>
          <button id="test-gunship-event" class="game__button">Gunship</button>
          <button id="test-bullet-time-event" class="game__button">Bullet Time</button>
          <button id="test-flechettes-event" class="game__button">Flechettes</button>
          <button id="test-radar-event" class="game__button">Radar</button>
          <button id="test-bingo-event" class="game__button">Bingo</button>
          <button id="test-lane-hopper-event" class="game__button">Lane Hopper</button>
          <button id="test-simon-says-event" class="game__button">Simon Says</button>
          <button id="test-equalizer-event" class="game__button">Equalizer</button>
          <button id="test-loading-bar-event" class="game__button">Loading Bar</button>
          <button id="test-dice-roll-event" class="game__button">Dice Roll</button>
          <button id="test-boost-event" class="game__button">Boost</button>
          <button id="test-union-event" class="game__button">Union</button>
          <button id="test-kickback-event" class="game__button">Kickback</button>
          <button id="test-burst-event" class="game__button">Burst</button>
          <button id="test-spray-event" class="game__button">Spray</button>
          <button id="test-fountain-event" class="game__button">Fountain</button>
          <button id="test-ripple-event" class="game__button">Ripple</button>
          <button id="test-wrecking-ball-event" class="game__button">Wrecking Ball</button>
          <button id="test-piledriver-event" class="game__button">Piledriver</button>
          <button id="test-orbital-strike-event" class="game__button">Orbital Strike</button>
          <button id="test-fuse-event" class="game__button">Fuse</button>
          <button id="test-supernova-event" class="game__button">Supernova</button>
          <button id="test-bowling-event" class="game__button">Bowling</button>
          <button id="test-thunderclap-event" class="game__button">Thunderclap</button>
          <button id="test-chain-reaction-event" class="game__button">Chain Reaction</button>
          <button id="test-bullseye-event" class="game__button">Bullseye</button>
          <button id="test-popcorn-event" class="game__button">Popcorn</button>
          <button id="test-newtons-cradle-event" class="game__button">Newton's Cradle</button>
          <button id="test-juggle-event" class="game__button">Juggle</button>
          <button id="test-boomerang-event" class="game__button">Boomerang</button>
          <button id="test-heartbeat-event" class="game__button">Heartbeat</button>
          <button id="test-clash-event" class="game__button">Clash</button>
          <button id="test-asteroids-event" class="game__button">Asteroids</button>
          <button id="test-whack-a-mole-event" class="game__button">Whack-a-Mole</button>
          <button id="test-drumroll-event" class="game__button">Drumroll</button>
          <button id="test-shell-game-event" class="game__button">Shell Game</button>
          <button id="test-seesaw-event" class="game__button">Seesaw</button>
          <button id="test-scratch-event" class="game__button">Scratch</button>
          <button id="test-tag-event" class="game__button">Tag</button>
          <button id="test-bumpers-event" class="game__button">Bumpers</button>
          <button id="test-catcher-event" class="game__button">Catcher</button>
          <button id="test-implosion-event" class="game__button">Implosion</button>
          <button id="test-atom-event" class="game__button">Atom</button>
          <button id="test-spiral-event" class="game__button">Spiral</button>
          <button id="test-loop-event" class="game__button">Loop</button>
          <button id="test-eternity-event" class="game__button">Eternity</button>
          <button id="test-helix-event" class="game__button">Helix</button>
          <button id="test-yo-yo-event" class="game__button">Yo-Yo</button>
          <button id="test-racetrack-event" class="game__button">Racetrack</button>
          <button id="test-swing-event" class="game__button">Swing</button>
          <button id="test-kaleidoscope-event" class="game__button">Kaleidoscope</button>
          <button id="test-zipper-event" class="game__button">Zipper</button>
          <button id="test-screensaver-event" class="game__button">Screensaver</button>
          <button id="test-sprinkler-event" class="game__button">Sprinkler</button>
          <button id="test-clockwork-event" class="game__button">Clockwork</button>
          <button id="test-hole-in-one-event" class="game__button">Hole in One</button>
          <button id="test-leapfrog-event" class="game__button">Leapfrog</button>
          <button id="test-lineup-event" class="game__button">Lineup</button>
          <button id="test-stampede-event" class="game__button">Stampede</button>
          <button id="test-wormhole-event" class="game__button">Wormhole</button>
          <button id="test-splat-event" class="game__button">Splat</button>
          <button id="test-roulette-event" class="game__button">Roulette</button>
          <button id="test-free-kick-event" class="game__button">Free Kick</button>
          <button id="test-slalom-event" class="game__button">Slalom</button>
          <button id="test-lightning-event" class="game__button">Lightning</button>
          <button id="test-fire-hose-event" class="game__button">Fire Hose</button>
          <button id="test-confluence-event" class="game__button">Confluence</button>
          <button id="test-slosh-event" class="game__button">Slosh</button>
          <button id="test-siphon-event" class="game__button">Siphon</button>
          <button id="test-crossfire-event" class="game__button">Crossfire</button>
          <button id="test-gravity-well-event" class="game__button">Gravity Well</button>
          <button id="test-splashdown-event" class="game__button">Splashdown</button>
          <button id="test-geysers-event" class="game__button">Geysers</button>
          <button id="test-cash-cannon-event" class="game__button">Cash Cannon</button>
          <button id="test-hoover-event" class="game__button">Hoover</button>
          <button id="test-air-show-event" class="game__button">Air Show</button>
          <button id="test-leak-event" class="game__button">Leak</button>
          <button id="test-climb-event" class="game__button">Climb</button>
          <button id="test-kite-event" class="game__button">Kite</button>
          <button id="test-rainbow-event" class="game__button">Rainbow</button>
          <button id="test-branches-event" class="game__button">Branches</button>
          <button id="test-tug-of-war-event" class="game__button">Tug of War</button>
          <button id="test-waterwheel-event" class="game__button">Waterwheel</button>
          <button id="test-braid-event" class="game__button">Braid</button>
          <button id="test-skim-event" class="game__button">Skim</button>
          <button id="test-lattice-event" class="game__button">Lattice</button>
          <button id="test-fireworks-event" class="game__button">Fireworks</button>
          <button id="test-slingshot-event" class="game__button">Slingshot</button>
          <button id="test-marquee-event" class="game__button">Marquee</button>
          <button id="test-crop-duster-event" class="game__button">Crop Duster</button>
          <button id="test-bolas-event" class="game__button">Bolas</button>
          <button id="test-countdown-event" class="game__button">Countdown</button>
          <button id="test-sparkler-event" class="game__button">Sparkler</button>
          <button id="test-slinky-event" class="game__button">Slinky</button>
          <button id="test-pipeline-event" class="game__button">Pipeline</button>
          <button id="test-prism-event" class="game__button">Prism</button>
          <button id="test-trampoline-event" class="game__button">Trampoline</button>
          <button id="test-hummingbird-event" class="game__button">Hummingbird</button>
          <button id="test-dive-bomb-event" class="game__button">Dive Bomb</button>
          <button id="test-ski-jump-event" class="game__button">Ski Jump</button>
          <button id="test-jetpack-event" class="game__button">Jetpack</button>
          <button id="test-bass-drop-event" class="game__button">Bass Drop</button>
          <button id="test-scanner-event" class="game__button">Scanner</button>
          <button id="test-laser-grid-event" class="game__button">Laser Grid</button>
          <button id="test-etch-event" class="game__button">Etch</button>
          <button id="test-searchlights-event" class="game__button">Searchlights</button>
          <button id="test-tractor-beam-event" class="game__button">Tractor Beam</button>
          <button id="test-beam-clash-event" class="game__button">Beam Clash</button>
          <button id="test-butterfly-event" class="game__button">Butterfly</button>
          <button id="test-kelp-event" class="game__button">Kelp</button>
          <button id="test-pendulum-wave-event" class="game__button">Pendulum Wave</button>
          <button id="test-formation-event" class="game__button">Formation</button>
          <button id="test-ouroboros-event" class="game__button">Ouroboros</button>
          <button id="test-bowstring-event" class="game__button">Bowstring</button>
          <button id="test-superlaser-event" class="game__button">Superlaser</button>
          <button id="test-ion-storm-event" class="game__button">Ion Storm</button>
          <button id="test-glitch-event" class="game__button">Glitch</button>
          <button id="test-magnifier-event" class="game__button">Magnifier</button>
          <button id="test-water-show-event" class="game__button">Water Show</button>
          <button id="test-mercury-event" class="game__button">Mercury</button>
          <button id="test-alignment-event" class="game__button">Alignment</button>
          <button id="test-dandelion-event" class="game__button">Dandelion</button>
          <button id="test-bobber-event" class="game__button">Bobber</button>
          <button id="test-fishing-event" class="game__button">Fishing</button>
          <button id="test-scissors-event" class="game__button">Scissors</button>
          <button id="test-pulse-rifle-event" class="game__button">Pulse Rifle</button>
          <button id="test-split-event" class="game__button">Split</button>
          <button id="test-pixelate-event" class="game__button">Pixelate</button>
          <button id="test-dam-burst-event" class="game__button">Dam Burst</button>
          <button id="test-spiderweb-event" class="game__button">Spiderweb</button>
          <button id="test-curtain-event" class="game__button">Curtain</button>
          <button id="test-jellyfish-event" class="game__button">Jellyfish</button>
          <button id="test-polarity-event" class="game__button">Polarity</button>
          <button id="test-collider-event" class="game__button">Collider</button>
          <button id="test-sheepdog-event" class="game__button">Sheepdog</button>
          <button id="test-dragon-event" class="game__button">Dragon</button>
          <button id="test-reflector-event" class="game__button">Reflector</button>
          <button id="test-cookie-cutter-event" class="game__button">Cookie Cutter</button>
          <button id="test-cinematic-event" class="game__button">Cinematic</button>
          <button id="test-negative-event" class="game__button">Negative</button>
          <button id="test-chain-lightning-event" class="game__button">Chain Lightning</button>
          <button id="test-lock-on-event" class="game__button">Lock-On</button>
          <button id="test-stitch-event" class="game__button">Stitch</button>
          <button id="test-stockpile-event" class="game__button">Stockpile</button>
          <button id="test-spot-weld-event" class="game__button">Spot Weld</button>
          <button id="test-reels-event" class="game__button">Reels</button>
          <button id="test-cash-shower-event" class="game__button">Cash Shower</button>
          <button id="test-catherine-wheel-event" class="game__button">Catherine Wheel</button>
          <button id="test-multiball-event" class="game__button">Multiball</button>
          <button id="test-whip-event" class="game__button">Whip</button>
          <button id="test-battery-event" class="game__button">Battery</button>
          <button id="test-tesla-coil-event" class="game__button">Tesla Coil</button>
          <button id="test-jacobs-ladder-event" class="game__button">Jacob's Ladder</button>
          <button id="test-comic-book-event" class="game__button">Comic Book</button>
          <button id="test-avalanche-event" class="game__button">Avalanche</button>
          <button id="test-beehive-event" class="game__button">Beehive</button>
          <button id="test-pogo-event" class="game__button">Pogo</button>
          <button id="test-laser-harp-event" class="game__button">Laser Harp</button>
          <button id="test-lichtenberg-event" class="game__button">Lichtenberg</button>
          <button id="test-shatter-event" class="game__button">Shatter</button>
          <button id="test-funnel-event" class="game__button">Funnel</button>
          <button id="test-grapple-event" class="game__button">Grapple</button>
          <button id="test-surf-event" class="game__button">Surf</button>
          <button id="test-laser-tag-event" class="game__button">Laser Tag</button>
          <button id="test-ball-lightning-event" class="game__button">Ball Lightning</button>
          <button id="test-event-horizon-event" class="game__button">Event Horizon</button>
          <button id="test-tile-flip-event" class="game__button">Tile Flip</button>
          <button id="test-gusher-event" class="game__button">Gusher</button>
          <button id="test-pinata-event" class="game__button">Pinata</button>
          <button id="test-gift-wrap-event" class="game__button">Gift Wrap</button>
          <button id="test-triangulate-event" class="game__button">Triangulate</button>
          <button id="test-spark-of-life-event" class="game__button">Spark of Life</button>
          <button id="test-glass-rain-event" class="game__button">Glass Rain</button>
          <button id="test-fold-event" class="game__button">Fold</button>
          <button id="test-cocoon-event" class="game__button">Cocoon</button>
          <button id="test-gravity-assist-event" class="game__button">Gravity Assist</button>
          <button id="test-zip-line-event" class="game__button">Zip Line</button>
          <button id="test-breach-event" class="game__button">Breach</button>
          <button id="test-storm-surge-event" class="game__button">Storm Surge</button>
          <button id="test-smash-and-grab-event" class="game__button">Smash and Grab</button>
          <button id="test-shrink-ray-event" class="game__button">Shrink Ray</button>
          <button id="test-sandstorm-event" class="game__button">Sandstorm</button>
          <button id="test-juggernaut-event" class="game__button">Juggernaut</button>
          <button id="test-fuel-line-event" class="game__button">Fuel Line</button>
          <button id="test-checkout-event" class="game__button">Checkout</button>
          <button id="test-lightning-rod-event" class="game__button">Lightning Rod</button>
          <button id="test-flag-event" class="game__button">Flag</button>
          <button id="test-terraces-event" class="game__button">Terraces</button>
          <button id="test-battering-ram-event" class="game__button">Battering Ram</button>
          <button id="test-tetherball-event" class="game__button">Tetherball</button>
          <button id="test-projector-event" class="game__button">Projector</button>
          <button id="test-clear-event" class="game__button">Clear!</button>
          <button id="test-infinity-mirror-event" class="game__button">Infinity Mirror</button>
          <button id="test-elevator-event" class="game__button">Elevator</button>
          <button id="test-migration-event" class="game__button">Migration</button>
          <button id="test-corkscrew-event" class="game__button">Corkscrew</button>
          <button id="test-mirror-ball-event" class="game__button">Mirror Ball</button>
          <button id="test-plasma-globe-event" class="game__button">Plasma Globe</button>
          <button id="test-jelly-event" class="game__button">Jelly</button>
          <button id="test-shockwave-event" class="game__button">Shockwave</button>
          <button id="test-pass-the-parcel-event" class="game__button">Pass the Parcel</button>
          <button id="test-garden-hose-event" class="game__button">Garden Hose</button>
          <button id="test-burning-glass-event" class="game__button">Burning Glass</button>
          <button id="test-storm-front-event" class="game__button">Storm Front</button>
          <button id="test-slide-puzzle-event" class="game__button">Slide Puzzle</button>
          <button id="test-whirlpool-event" class="game__button">Whirlpool</button>
          <button id="test-satellites-event" class="game__button">Satellites</button>
          <button id="test-typewriter-event" class="game__button">Typewriter</button>
          <button id="test-railgun-event" class="game__button">Railgun</button>
          <button id="test-thunderdome-event" class="game__button">Thunderdome</button>
          <button id="test-melt-event" class="game__button">Melt</button>
          <button id="test-flood-event" class="game__button">Flood</button>
          <button id="test-pied-piper-event" class="game__button">Pied Piper</button>
          <button id="test-tentacles-event" class="game__button">Tentacles</button>
          <button id="test-laser-pendulum-event" class="game__button">Laser Pendulum</button>
          <button id="test-electric-eel-event" class="game__button">Electric Eel</button>
          <button id="test-double-vision-event" class="game__button">Double Vision</button>
          <button id="test-honey-event" class="game__button">Honey</button>
          <button id="test-musical-chairs-event" class="game__button">Musical Chairs</button>
          <button id="test-bubble-wand-event" class="game__button">Bubble Wand</button>
          <button id="test-hyperspace-event" class="game__button">Hyperspace</button>
          <button id="test-javelin-event" class="game__button">Javelin</button>
          <button id="test-shuffle-event" class="game__button">Shuffle</button>
          <button id="test-mushroom-cloud-event" class="game__button">Mushroom Cloud</button>
          <button id="test-relay-event" class="game__button">Relay</button>
          <button id="test-laser-pointer-event" class="game__button">Laser Pointer</button>
          <button id="test-storm-chaser-event" class="game__button">Storm Chaser</button>
          <button id="test-bait-ball-event" class="game__button">Bait Ball</button>
          <button id="test-video-wall-event" class="game__button">Video Wall</button>
          <button id="test-ferrofluid-event" class="game__button">Ferrofluid</button>
          <button id="test-hide-and-seek-event" class="game__button">Hide and Seek</button>
          <button id="test-magic-carpet-event" class="game__button">Magic Carpet</button>
          <button id="test-spirograph-event" class="game__button">Spirograph</button>
          <button id="test-electric-net-event" class="game__button">Electric Net</button>
          <button id="test-demolition-event" class="game__button">Demolition</button>
          <button id="test-shooting-gallery-event" class="game__button">Shooting Gallery</button>
          <button id="test-collapse-event" class="game__button">Collapse</button>
          <button id="test-volcano-event" class="game__button">Volcano</button>
          <button id="test-skydivers-event" class="game__button">Skydivers</button>
          <button id="test-speedboat-event" class="game__button">Speedboat</button>
          <button id="test-peacock-event" class="game__button">Peacock</button>
          <button id="test-storm-wings-event" class="game__button">Storm Wings</button>
          <button id="test-cluster-bomb-event" class="game__button">Cluster Bomb</button>
          <button id="test-strafing-run-event" class="game__button">Strafing Run</button>
          <button id="test-stained-glass-event" class="game__button">Stained Glass</button>
          <button id="test-uprising-event" class="game__button">Uprising</button>
          <button id="test-swing-ride-event" class="game__button">Swing Ride</button>
          <button id="test-lawnmower-event" class="game__button">Lawnmower</button>
          <button id="test-light-show-event" class="game__button">Light Show</button>
          <button id="test-bug-zapper-event" class="game__button">Bug Zapper</button>
          <button id="test-firecrackers-event" class="game__button">Firecrackers</button>
          <button id="test-six-shooter-event" class="game__button">Six-Shooter</button>
          <button id="test-thermal-event" class="game__button">Thermal</button>
          <button id="test-slash-event" class="game__button">Slash</button>
          <button id="test-jackhammer-event" class="game__button">Jackhammer</button>
          <button id="test-pummel-event" class="game__button">Pummel</button>
          <button id="test-overload-event" class="game__button">Overload</button>
          <button id="test-gatling-event" class="game__button">Gatling</button>
          <button id="test-press-event" class="game__button">Press</button>
          <button id="test-drill-event" class="game__button">Drill</button>
          <button id="test-burrow-event" class="game__button">Burrow</button>
          <button id="test-ping-pong-event" class="game__button">Ping Pong</button>
          <button id="test-slam-dunk-event" class="game__button">Slam Dunk</button>
          <button id="test-uppercut-event" class="game__button">Uppercut</button>
          <button id="test-head-hop-event" class="game__button">Head Hop</button>
          <button id="test-paparazzi-event" class="game__button">Paparazzi</button>
          <button id="test-missile-barrage-event" class="game__button">Missile Barrage</button>
          <button id="test-sonic-boom-event" class="game__button">Sonic Boom</button>
          <button id="test-mitosis-event" class="game__button">Mitosis</button>
          <button id="test-plinko-event" class="game__button">Plinko</button>
          <button id="test-hammer-throw-event" class="game__button">Hammer Throw</button>
          <button id="test-snake-event" class="game__button">Snake</button>
          <button id="test-breakout-event" class="game__button">Breakout</button>
          <button id="test-line-clear-event" class="game__button">Line Clear</button>
          <button id="test-break-shot-event" class="game__button">Break Shot</button>
          <button id="test-bullet-hell-event" class="game__button">Bullet Hell</button>
          <button id="test-vortex-event" class="game__button">Vortex</button>
          <button id="test-ricochet-event" class="game__button">Ricochet</button>
          <button id="test-waterfall-event" class="game__button">Waterfall</button>
          <button id="test-conveyor-event" class="game__button">Conveyor</button>
          <button id="test-fireflies-event" class="game__button">Fireflies</button>
          <button id="test-payday-event" class="game__button">Payday</button>
          <button id="test-piggy-bank-event" class="game__button">Piggy Bank</button>
          <button id="test-coin-toss-event" class="game__button">Coin Toss</button>
          <button id="test-hourglass-event" class="game__button">Hourglass</button>
          <button id="test-rocket-event" class="game__button">Rocket</button>
          <button id="test-reveal-event" class="game__button">Reveal</button>
          <button id="test-jackpot-reels-event" class="game__button">Jackpot</button>
          <button id="test-chain-pay-event" class="game__button">Chain Pay</button>
          <button id="test-twister-event" class="game__button">Twister</button>
          <button id="test-downpour-event" class="game__button">Downpour</button>
          <button id="test-trickle-event" class="game__button">Trickle</button>
          <button id="test-magnet-event" class="game__button">Magnet</button>
          <button id="test-spillover-event" class="game__button">Spillover</button>
          <button id="test-constellation-event" class="game__button">Constellation</button>
          <button id="test-ascend-event" class="game__button">Ascend</button>
          <button id="test-rising-tide-event" class="game__button">Rising Tide</button>
          <button id="test-tidal-wave-event" class="game__button">Tidal Wave</button>
          <button id="test-beanstalk-event" class="game__button">Beanstalk</button>
          <button id="test-blessing-event" class="game__button">Blessing</button>
          <button id="test-halo-event" class="game__button">Halo</button>
          <button id="test-comet-event" class="game__button">Comet</button>
          <button id="test-meteor-shower-event" class="game__button">Meteor Shower</button>
          <button id="test-mentor-event" class="game__button">Mentor</button>
          <button id="test-spark-chain-event" class="game__button">Spark Chain</button>
          <button id="test-polish-event" class="game__button">Polish</button>
          <button id="test-lighthouse-event" class="game__button">Lighthouse</button>
          <button id="test-recruit-event" class="game__button">Recruit</button>
          <button id="test-promotion-day-event" class="game__button">Promotion Day</button>
          <button id="test-alchemy-event" class="game__button">Alchemy</button>
          <button id="test-investment-event" class="game__button">Investment</button>
          <button id="test-dividends-event" class="game__button">Dividends</button>
          <button id="test-wisp-event" class="game__button">Wisp</button>
          <button id="test-stream-event" class="game__button">Stream</button>
          <button id="test-trails-event" class="game__button">Trails</button>
          <button id="test-draw-event" class="game__button">Draw</button>
          <label>Draw number <select id="test-draw-event-tier"><option value="random">Random</option>${tiers}</select></label>
          <button id="test-night-sky-event" class="game__button">Night Sky</button>
          <label>Night Sky number <select id="test-night-sky-event-tier"><option value="random">Random</option>${tiers}</select></label>
          <button id="test-pitcher-event" class="game__button">Pitcher</button>
          <label>Pitcher number <select id="test-pitcher-event-tier"><option value="random">Random</option>${tiers}</select></label>
          <button id="test-glimmer-event" class="game__button">Glimmer</button>
          <button id="test-hunt-event" class="game__button">Hunt</button>
          <button id="test-swarm-event" class="game__button">Swarm</button>
          <button id="test-renovate-event" class="game__button">Renovate</button>
          <button id="test-upgrade-event" class="game__button">Upgrade</button>
          <button id="test-unlock-event" class="game__button">Unlock</button>
          <label>Unlock crit <select id="test-unlock-event-crit"><option value="random">Random</option><option value="none">No crit</option>${tiers}</select></label>
          <button id="test-stalactites-event" class="game__button">Stalactites</button>
          <button id="test-kintsugi-event" class="game__button">Kintsugi</button>
          <button id="test-galaxy-event" class="game__button">Galaxy</button>
          <button id="test-snowdrift-event" class="game__button">Snowdrift</button>
          <button id="test-snowball-event" class="game__button">Snowball</button>
          <button id="test-cartwheel-event" class="game__button">Cartwheel</button>
          <button id="test-matryoshka-event" class="game__button">Matryoshka</button>
          <button id="test-salmon-run-event" class="game__button">Salmon Run</button>
          <button id="test-moon-tide-event" class="game__button">Moon Tide</button>
          <button id="test-candy-floss-event" class="game__button">Candy Floss</button>
          <button id="test-figure-skater-event" class="game__button">Figure Skater</button>
          <button id="test-tripwire-event" class="game__button">Tripwire</button>
          <button id="test-sunrise-event" class="game__button">Sunrise</button>
          <button id="test-rally-event" class="game__button">Rally</button>
          <button id="test-ignition-event" class="game__button">Ignition</button>
          <button id="test-trident-event" class="game__button">Trident</button>
          <button id="test-crawl-event" class="game__button">Crawl</button>
          <button id="test-carpet-bombing-event" class="game__button">Carpet Bombing</button>
          <button id="test-time-bomb-event" class="game__button">Time Bomb</button>
          <button id="test-bunker-buster-event" class="game__button">Bunker Buster</button>
          <button id="test-grenade-toss-event" class="game__button">Grenade Toss</button>
          <button id="test-depth-charges-event" class="game__button">Depth Charges</button>
          <button id="test-firing-squad-event" class="game__button">Firing Squad</button>
          <button id="test-akimbo-event" class="game__button">Akimbo</button>
          <button id="test-flak-barrage-event" class="game__button">Flak Barrage</button>
          <button id="test-sniper-nest-event" class="game__button">Sniper Nest</button>
          <button id="test-rewind-event" class="game__button">Rewind</button>
          <button id="test-morse-code-event" class="game__button">Morse Code</button>
          <button id="test-stadium-wave-event" class="game__button">Stadium Wave</button>
          <button id="test-knights-tour-event" class="game__button">Knight's Tour</button>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Test Actions</summary>
        <div class="test-actions-dropdown__menu">
          <button id="add-money" class="game__button">Add Money</button>
          <button id="spawn-mouse" class="game__button">Spawn Mouse</button>
          <button id="test-idle-overlay" class="game__button">Idle Overlay</button>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Crits</summary>
        <div class="test-actions-dropdown__menu">
          <label>Event <select id="test-crit-event"><option value="upgrade">Upgrade click</option><option value="unlock">Floor unlock</option><option value="map">Map unlock</option></select></label>
          <label>Tier <select id="test-crit-tier">${tiers}</select></label>
          <label>Bonus tier <select id="test-crit-bonus"><option value="">None</option>${tiers}</select></label>
          <button class="game__button" data-crit-kind="">Regular Crit</button>
          ${buttons}
        </div>
      </details>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>`;
}

export function wireCritTestActions(
  container: HTMLElement,
  onForce: (
    kind: CritProcKind | null,
    tier: CritTier,
    bonusTier: CritTier | null,
    event: "upgrade" | "unlock" | "map",
  ) => void,
): void {
  const event = container.querySelector<HTMLSelectElement>("#test-crit-event")!;
  const tier = container.querySelector<HTMLSelectElement>("#test-crit-tier")!;
  const bonus = container.querySelector<HTMLSelectElement>("#test-crit-bonus")!;
  const buttons =
    container.querySelectorAll<HTMLButtonElement>("[data-crit-kind]");
  const filter = container.querySelector<HTMLInputElement>(
    "#test-actions-filter",
  )!;
  function updateEvent(): void {
    const map = event.value === "map";
    for (const button of buttons) {
      const kind = button.dataset.critKind as CritProcKind | "";
      const unavailable =
        map && kind !== "" && !MAP_CRIT_TEST_KINDS.includes(kind);
      button.dataset.eventUnavailable = String(unavailable);
      button.hidden = unavailable;
      button.disabled = unavailable;
    }
    bonus.disabled = map;
    if (map) bonus.value = "";
    filter.dispatchEvent(new Event("input"));
  }
  event.addEventListener("change", updateEvent);
  updateEvent();
  for (const button of buttons) {
    button.addEventListener("click", () => {
      if (button.dataset.eventUnavailable === "true") return;
      const kind = button.dataset.critKind as CritProcKind | "";
      onForce(
        kind || null,
        tier.value as CritTier,
        kind && event.value !== "map"
          ? (bonus.value as CritTier) || null
          : null,
        event.value as "upgrade" | "unlock" | "map",
      );
    });
  }
}
