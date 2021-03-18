import * as Path from "./path";

export type Term =
  | { type: "type"; universe: number }
  | { type: "reference"; identifier: string }
  | { type: "application"; left: Term; right: Term }
  | { type: "pi"; head: string; from: Term; to: Term }
  | { type: "lambda"; head: string; from: Term; body: Term }
  | { type: "let"; head: string; from: Term; left: Term; right: Term };

export const nullTerm: Term = { type: "reference", identifier: "" };

export function isNullTerm(term: Term): boolean {
  return term.type === "reference" && term.identifier === "";
}

export function get(term: Term, path: Path.Path): Term {
  const [head, ...tail] = path;
  if (head === undefined) {
    return term;
  }
  if (head in term) {
    return get((term as any)[head], tail);
  }
  throw new Error("invalid path");
}

export function set(term: Term, path: Path.Path, new_: Term): Term {
  const [head, ...tail] = path;
  if (head === undefined) {
    return new_;
  }
  if (head in term) {
    return { ...term, [head]: set((term as any)[head], tail, new_) };
  }
  throw new Error("invalid path");
}
