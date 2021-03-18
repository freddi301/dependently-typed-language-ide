export type Path = Array<string>;

export function equals(a: Path, b: Path): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function last(path: Path): string | undefined {
  return path[path.length - 1];
}

export function child(path: Path, leaf: string): Path {
  return [...path, leaf];
}

export function parent(path: Path): Path | undefined {
  if (path.length === 0) return undefined;
  return path.slice(0, -1);
}
