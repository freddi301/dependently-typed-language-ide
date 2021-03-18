import { emulatedInputReducer } from "./emulated-input";
import { KeyCombinationComponents } from "./key-combinations";
import { getOperationForKeyCombination } from "./keyboard-operations";
import { operations } from "./operations";
import * as Path from "../core/path";
import * as Source from "../core/source";
import * as History from "./history-state";
import { getSuggestions } from "./suggestions";

export type State = {
  history: History.State<SourceState>;
  suggestionIndex: number | null;
  clipboard: Source.Term | null;
};

export type Action =
  | { type: "keydown"; payload: KeyCombinationComponents }
  | { type: "cursor"; payload: Path.Path }
  | { type: "load"; payload: Source.Term };

export type SourceState = {
  source: Source.Term;
  cursor: { path: Path.Path; cursor: number };
};

export const rootCursor = { path: [], cursor: 0 };

export const emptyState: State = {
  history: {
    index: 0,
    stack: [
      {
        source: Source.nullTerm,
        cursor: rootCursor,
      },
    ],
  },
  suggestionIndex: null,
  clipboard: null,
};

export function reducer(state: State, action: Action): State {
  const on = onEditor(state);
  const { source, cursor, do_, current: underCursor } = on;
  if (action.type === "load") {
    return {
      history: do_({ source: action.payload, cursor: rootCursor }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (action.type === "cursor") {
    return {
      history: do_({ source, cursor: { path: action.payload, cursor: 0 } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (action.type === "keydown") {
    const operation = getOperationForKeyCombination(action.payload, on);
    if (operation) {
      return operations[operation](on);
    }
  }
  if (action.type === "keydown") {
    const traceInput = <A extends string, T extends Source.Term & { [K in A]: string }>(term: T, attribute: A): State => {
      const input = emulatedInputReducer({ text: term[attribute], cursor: cursor.cursor }, action.payload);
      if (!input) return state;
      return {
        history: do_({
          source: Source.set(source, cursor.path, { ...term, [attribute]: input.text }),
          cursor: { ...cursor, cursor: input.cursor },
        }),
        suggestionIndex: null,
        clipboard: state.clipboard,
      };
    };
    switch (underCursor.type) {
      case "reference":
        return traceInput(underCursor, "identifier");
      case "pi":
        return traceInput(underCursor, "head");
      case "lambda":
        return traceInput(underCursor, "head");
      case "let":
        return traceInput(underCursor, "head");
    }
  }
  return state;
}

export function onEditor(state: State) {
  const { source, cursor } = History.getCurrent(state.history);
  const currentPath = cursor.path;
  const current = Source.get(source, cursor.path);
  const parentPath = Path.parent(cursor.path);
  const parent = parentPath && Source.get(source, parentPath);
  const suggestions = getSuggestions(state);
  const canUndo = History.canUndo(state.history);
  const undo = () => History.reducer(state.history, { type: "undo" });
  const canRedo = History.canRedo(state.history);
  const redo = () => History.reducer(state.history, { type: "redo" });
  return {
    state,
    source,
    cursor,
    do_(payload: SourceState) {
      return History.reducer(state.history, { type: "do", payload });
    },
    current,
    currentPath,
    parent,
    parentPath,
    suggestions,
    canUndo,
    undo,
    canRedo,
    redo,
  };
}

export type OnEditor = ReturnType<typeof onEditor>;
