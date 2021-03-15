import * as Editor from "./editor-state";
import * as History from "./history-state";
import * as Compute from "../core/compute";
import * as Source from "../core/source";
import * as Path from "../core/path";
import Fuse from "fuse.js";

/*
filter by scope

order by
  expected type
  text
  by proximity
*/

export type Suggestion = { identifier: string; type: Compute.Term };

export function getSuggestions(state: Editor.State): Array<Suggestion> {
  const text = Editor.getTextUnderCursor(state);
  const { source, cursor } = History.getCurrent(state.history);
  const preparedScope = Compute.prepareScope(source);
  const preparedTermUnderCursor: Compute.Term | null =
    cursor.type === "entry" && (Source.fluentScope(preparedScope as any).get(cursor.path).term as any);
  if (!preparedTermUnderCursor) return [];
  const inScope = Object.entries(preparedTermUnderCursor.typeScope).map(
    ([identifier, type]): Suggestion => {
      return { identifier, type: Compute.getValue(type, preparedScope) };
    }
  );
  const entries = Object.entries(preparedScope).map(
    ([entry, { type }]): Suggestion => {
      return {
        identifier: entry,
        type: Compute.getValue(type, preparedScope),
      };
    }
  ); // TODO filter out shadowed in scope
  const all = [...inScope, ...entries];
  const byFuzzyText = text ? new Fuse(all, { keys: ["identifier"] }).search(text).map(({ item }) => item) : [];
  const other = all.filter((suggestion) => !byFuzzyText.includes(suggestion));
  const byFuzzyTextThenOthers = [...byFuzzyText, ...other];
  if (cursor.type === "entry") {
    const leafPath = Path.fluent(cursor.path).last();
    const parentPath = Path.fluent(cursor.path).parent()?.path;
    const parentTerm: Compute.Term | null = parentPath && (Source.fluentScope(preparedScope as any).get(parentPath).term as any);
    if (parentTerm?.type === "application" && leafPath === "right") {
      const parentLeftType = Compute.getType(parentTerm.left, preparedScope);
      if (parentLeftType.type === "pi") {
        const expectedType = parentLeftType.from;
        const byExpectedType = byFuzzyTextThenOthers.filter(({ type }) => Compute.isEqual(type, expectedType));
        const other = byFuzzyTextThenOthers.filter((suggestion) => !byExpectedType.includes(suggestion));
        return [...byExpectedType, ...other];
      }
    }
  }

  return byFuzzyTextThenOthers;
}
