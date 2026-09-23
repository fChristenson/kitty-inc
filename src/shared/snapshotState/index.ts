const copiers: ((source: object, target: object) => void)[] = [];

export function snapshotMap<Key extends object, Value>(): WeakMap<Key, Value> {
  const values = new WeakMap<Key, Value>();
  copiers.push((source, target) => {
    if (values.has(source as Key))
      values.set(target as Key, structuredClone(values.get(source as Key)!));
  });
  return values;
}

export function snapshotSet<Key extends object>(): WeakSet<Key> {
  const values = new WeakSet<Key>();
  copiers.push((source, target) => {
    if (values.has(source as Key)) values.add(target as Key);
  });
  return values;
}

export function cloneWithSnapshotState<T extends object>(source: T): T {
  const target = structuredClone(source);
  for (const copy of copiers) copy(source, target);
  return target;
}
