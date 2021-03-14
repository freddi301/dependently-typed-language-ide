import { emulatedInputReducer, EmulatedInputState } from "./emulated-input";
import { KeyCombinationComponents } from "./key-combinations";
import { getOperationForKeyCombination } from "./keyboard-operations";
import { operations } from "./operations";
import * as Path from "../core/path";
import * as Source from "../core/source";

export type EditorState = {
  source: Source.Scope;
  cursor: { type: "top-empty"; input: EmulatedInputState } | { type: "entry"; path: Path.Absolute; cursor: number };
};
export type EditorAction = { type: "keydown"; payload: KeyCombinationComponents } | { type: "cursor"; path: Path.Absolute };
export const emptyState: EditorState = { source: {}, cursor: { type: "top-empty", input: { text: "", cursor: 0 } } };
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "cursor") {
    return { ...state, cursor: { type: "entry", path: action.path, cursor: 0 } };
  }
  const operation = getOperationForKeyCombination(action.payload, state);
  if (operation) return operations[operation](state);
  if (state.cursor.type === "top-empty") {
    return {
      source: state.source,
      cursor: { type: "top-empty", input: emulatedInputReducer(state.cursor.input, action.payload) },
    };
  }
  if (state.cursor.type === "entry") {
    const term = Source.fluentScope(state.source).get(state.cursor.path).term;
    if (term.type === "reference") {
      const { text, cursor } = emulatedInputReducer({ text: term.identifier, cursor: state.cursor.cursor }, action.payload);
      return {
        source: Source.fluentScope(state.source).set(state.cursor.path, { type: "reference", identifier: text }).scope,
        cursor: { ...state.cursor, cursor },
      };
    }
    if (term.type === "pi") {
      const { text, cursor } = emulatedInputReducer({ text: term.head, cursor: state.cursor.cursor }, action.payload);
      return {
        source: Source.fluentScope(state.source).set(state.cursor.path, { ...term, head: text }).scope,
        cursor: { ...state.cursor, cursor },
      };
    }
    if (term.type === "lambda") {
      const { text, cursor } = emulatedInputReducer({ text: term.head, cursor: state.cursor.cursor }, action.payload);
      return {
        source: Source.fluentScope(state.source).set(state.cursor.path, { ...term, head: text }).scope,
        cursor: { ...state.cursor, cursor },
      };
    }
  }
  return state;
}
