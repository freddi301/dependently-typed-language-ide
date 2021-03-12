export type Relative = Array<string>;
export type Absolute = {
  entry: string;
  level: "type";
  relative: Relative;
};

function isEqualRelativePath(a: Relative, b: Relative): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isEqualAbsolutePath(a: Absolute, b: Absolute): boolean {
  return a.entry === b.entry && isEqualRelativePath(a.relative, b.relative);
}

export function fluent(absolute: Absolute) {
  const { entry, level, relative } = absolute;
  return {
    path: absolute,
    last() {
      return relative[relative.length - 1];
    },
    isEqual(other: Absolute) {
      return isEqualAbsolutePath(absolute, other);
    },
    child(leaf: string) {
      return fluent({ entry, level, relative: [...relative, leaf] });
    },
    parent() {
      if (relative.length === 0) return null;
      return fluent({ entry, level, relative: relative.slice(0, -1) });
    },
  };
}
