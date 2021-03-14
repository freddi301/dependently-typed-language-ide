import { emulatedInputReducer, EmulatedInputState } from "./emulated-input";
import { KeyCombinationComponents } from "./key-combinations";
import { getOperationForKeyCombination } from "./keyboard-operations";
import { operations } from "./operations";
import * as Path from "../core/path";
import * as Source from "../core/source";
import * as History from "./history-state";

export type State = {
  source: Source.Scope;
  cursor: { type: "top-empty"; input: EmulatedInputState } | { type: "entry"; path: Path.Absolute; cursor: number };
  // history: History.State<Source.Scope>;
};

export type Action = { type: "keydown"; payload: KeyCombinationComponents } | { type: "cursor"; payload: Path.Absolute };

export const emptyState: State = {
  source: {},
  cursor: { type: "top-empty", input: { text: "", cursor: 0 } },
  // history: { history: [{}], index: 0 },
};

export function reducer(state: State, action: Action): State {
  const { source, cursor } = state;
  if (action.type === "cursor") {
    return { ...state, cursor: { type: "entry", path: action.payload, cursor: 0 } };
  }
  const operation = getOperationForKeyCombination(action.payload, state);
  if (operation) {
    return operations[operation](state);
  }
  if (cursor.type === "top-empty") {
    return {
      source: source,
      cursor: { type: "top-empty", input: emulatedInputReducer(cursor.input, action.payload) },
    };
  }
  if (cursor.type === "entry") {
    const term = Source.fluentScope(source).get(cursor.path).term;
    const traceInput = <A extends string, T extends Source.Term & { [K in A]: string }>(term: T, attribute: A) => {
      const input = emulatedInputReducer({ text: term[attribute], cursor: cursor.cursor }, action.payload);
      return {
        source: Source.fluentScope(source).set(cursor.path, { ...term, [attribute]: input.text }).scope,
        cursor: { ...cursor, cursor: input.cursor },
      };
    };
    switch (term.type) {
      case "reference":
        return traceInput(term, "identifier");
      case "pi":
        return traceInput(term, "head");
      case "lambda":
        return traceInput(term, "head");
    }
  }
  return state;
}
