import * as Editor from "./editor-state";
import * as Compute from "../core/compute";
import * as Source from "../core/source";
import * as Path from "../core/path";
import * as History from "./history-state";
import Fuse from "fuse.js";

export type Suggestion = { identifier: string; type: Compute.Term; matchesExpectedType: "yes" | "no" | "unknown" };

export function getSuggestions(state: Editor.State): Array<Suggestion> {
  const { source, cursor } = History.getCurrent(state.history);
  const underCursor = Source.get(source, cursor.path);
  const textUnderCursor = (underCursor && underCursor.type === "reference" && underCursor.identifier) || null;
  const prepared = Compute.prepare(source, {}, []);
  const preparedUnderCursor: Compute.Term = Source.get(prepared as any, cursor.path) as any;
  const inScope = Object.entries(preparedUnderCursor.scope).map(
    ([identifier, type]): Suggestion => {
      return { identifier, type: Compute.getNormalValue(type), matchesExpectedType: "unknown" };
    }
  );
  const all = inScope;
  const byFuzzyText = textUnderCursor ? new Fuse(all, { keys: ["identifier"] }).search(textUnderCursor).map(({ item }) => item) : [];
  const other = all.filter((suggestion) => !byFuzzyText.includes(suggestion));
  const byFuzzyTextThenOthers = [...byFuzzyText, ...other];
  const leafPath = Path.last(cursor.path);
  const parentPath = Path.parent(cursor.path);
  const parentTerm: Compute.Term | null = parentPath && (Source.get(prepared as any, parentPath) as any);
  // TODO for let
  if (parentTerm?.type === "application" && leafPath === "right") {
    const parentLeftType = Compute.getNormalType(parentTerm.left);
    if (parentLeftType?.type === "pi") {
      const expectedType = parentLeftType.from;
      const byExpectedType: Array<Suggestion> = byFuzzyTextThenOthers
        .filter(({ type }) => Compute.equals(type, expectedType))
        .map((suggestion) => ({ ...suggestion, matchesExpectedType: "yes" }));
      const other: Array<Suggestion> = byFuzzyTextThenOthers
        .filter((suggestion) => !byExpectedType.includes(suggestion))
        .map((suggestion) => ({ ...suggestion, matchesExpectedType: "no" }));
      return [...byExpectedType, ...other];
    }
  }
  return byFuzzyTextThenOthers;
}
