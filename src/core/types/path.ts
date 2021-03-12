import { SourceTerm, SourceTermScope } from "./term";

export type SourceTermPath = Array<string>;
export type SourceTermEntryPath = {
  entry: string;
  level: "type";
  path: SourceTermPath;
};

export function isEqualPath(a: SourceTermPath, b: SourceTermPath): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function getByPath(term: SourceTerm, path: SourceTermPath): SourceTerm {
  const [head, ...tail] = path;
  if (head === undefined) {
    return term;
  }
  if (head in term) {
    return getByPath((term as any)[head], tail);
  }
  throw new Error("invalid path");
}

export function setByPath(term: SourceTerm, path: SourceTermPath, new_: SourceTerm): SourceTerm {
  const [head, ...tail] = path;
  if (head === undefined) {
    return new_;
  }
  if (head in term) {
    return { ...term, [head]: setByPath((term as any)[head], tail, new_) };
  }
  throw new Error("invalid path");
}

export function getByEntryPath(scope: SourceTermScope, { entry, level, path }: SourceTermEntryPath): SourceTerm {
  const term = scope[entry]?.[level];
  if (!term) throw new Error();
  return getByPath(term, path);
}

export function setByEntryPath(scope: SourceTermScope, { entry, level, path }: SourceTermEntryPath, new_: SourceTerm): SourceTermScope {
  if (path.length === 0) {
    return { ...scope, [entry]: { [level]: new_ } };
  }
  const term = scope[entry]?.[level];
  if (!term) throw new Error();
  return { ...scope, [entry]: { [level]: setByPath(term, path, new_) } };
}

export function isEqualEntryPath(a: SourceTermEntryPath, b: SourceTermEntryPath): boolean {
  return a.entry === b.entry && isEqualPath(a.path, b.path);
}
