// the dice every crit tier, proc and event claim rolls: Math.random, unless a
// test rig seeds it so repeated runs land the very same crits
let source: () => number = Math.random;

export function critRandom(): number {
  return source();
}

export function setCritRandom(next: () => number): void {
  source = next;
}
