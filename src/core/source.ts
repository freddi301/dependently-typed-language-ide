import * as Path from "./path";

export type Term =
  | { type: "type"; universe: number }
  | { type: "reference"; identifier: string }
  | { type: "application"; left: Term; right: Term }
  | { type: "pi"; head: string; from: Term; to: Term }
  | { type: "lambda"; head: string; from: Term; body: Term };

export type Scope = Record<string, { type: Term; value: Term }>;

function getByRelativePath(term: Term, path: Path.Relative): Term {
  const [head, ...tail] = path;
  if (head === undefined) {
    return term;
  }
  if (head in term) {
    return getByRelativePath((term as any)[head], tail);
  }
  throw new Error("invalid path");
}

function setByRelativePath(term: Term, path: Path.Relative, new_: Term): Term {
  const [head, ...tail] = path;
  if (head === undefined) {
    return new_;
  }
  if (head in term) {
    return { ...term, [head]: setByRelativePath((term as any)[head], tail, new_) };
  }
  throw new Error("invalid path");
}

function getByAbsolutePath(scope: Scope, { entry, level, relative: path }: Path.Absolute): Term {
  const term = scope[entry]?.[level];
  if (!term) throw new Error();
  return getByRelativePath(term, path);
}

function setByAbsolutePath(scope: Scope, { entry, level, relative: path }: Path.Absolute, new_: Term): Scope {
  const e = scope[entry];
  if (!e) throw new Error();
  if (path.length === 0) {
    return { ...scope, [entry]: { ...e, [level]: new_ } };
  }
  const term = e[level];
  return { ...scope, [entry]: { ...e, [level]: setByRelativePath(term, path, new_) } };
}

export function fluentTerm(term: Term) {
  return {
    term,
    get(path: Path.Relative) {
      return fluentTerm(getByRelativePath(term, path));
    },
    set(path: Path.Relative, new_: Term) {
      return fluentTerm(setByRelativePath(term, path, new_));
    },
  };
}

export function fluentScope(scope: Scope) {
  return {
    scope,
    get(path: Path.Absolute) {
      return fluentTerm(getByAbsolutePath(scope, path));
    },
    set(path: Path.Absolute, new_: Term) {
      return fluentScope(setByAbsolutePath(scope, path, new_));
    },
    add(entry: string) {
      return fluentScope({
        ...scope,
        [entry]: { type: { type: "reference", identifier: "" }, value: { type: "reference", identifier: "" } },
      });
    },
  };
}
