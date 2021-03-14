import { emulatedInputReducer, EmulatedInputState } from "./emulated-input";
import { KeyCombinationComponents } from "./key-combinations";
import { getOperationForKeyCombination } from "./keyboard-operations";
import { operations } from "./operations";
import * as Path from "../core/path";
import * as Source from "../core/source";
import * as History from "./history-state";

export type State = {
  history: History.State<SourceState>;
  suggestionIndex: number | null;
};

export type Action = { type: "keydown"; payload: KeyCombinationComponents } | { type: "cursor"; payload: Path.Absolute };

export type SourceState = {
  source: Source.Scope;
  cursor: { type: "top-empty"; input: EmulatedInputState } | { type: "entry"; path: Path.Absolute; cursor: number };
};

export const emptyState: State = {
  history: {
    index: 0,
    stack: [
      {
        source: {},
        cursor: { type: "top-empty", input: { text: "", cursor: 0 } },
      },
    ],
  },
  suggestionIndex: null,
};

export function reducer(state: State, action: Action): State {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (action.type === "cursor") {
    return {
      history: do_({ source, cursor: { type: "entry", path: action.payload, cursor: 0 } }),
      suggestionIndex: null,
    };
  }
  if (action.type === "keydown") {
    const operation = getOperationForKeyCombination(action.payload, state);
    if (operation) {
      return operations[operation](state);
    }
  }
  if (action.type === "keydown" && cursor.type === "top-empty") {
    const input = emulatedInputReducer(cursor.input, action.payload);
    if (!input) return state;
    return {
      history: do_({
        source,
        cursor: { type: "top-empty", input },
      }),
      suggestionIndex: null,
    };
  }
  if (action.type === "keydown" && cursor.type === "entry") {
    const term = Source.fluentScope(source).get(cursor.path).term;
    const traceInput = <A extends string, T extends Source.Term & { [K in A]: string }>(term: T, attribute: A): State => {
      const input = emulatedInputReducer({ text: term[attribute], cursor: cursor.cursor }, action.payload);
      if (!input) return state;
      return {
        history: do_({
          source: Source.fluentScope(source).set(cursor.path, { ...term, [attribute]: input.text }).scope,
          cursor: { ...cursor, cursor: input.cursor },
        }),
        suggestionIndex: null,
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
