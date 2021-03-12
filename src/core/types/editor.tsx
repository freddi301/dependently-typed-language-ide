import { useLayoutEffect, useReducer } from "react";
import { colors } from "../../App";
import { EmulatedInput, emulatedInputReducer, EmulatedInputState } from "./emulated-input";
import { getKeyCombinationComponentsFromEvent, KeyCombinationComponents } from "./key-combinations";
import { getOperationForKeyCombination } from "./keyboard-operations";
import * as Path from "./path";
import * as Source from "./source";

export function Editor() {
  const [state, dispatch] = useReducer(editorReducer, emptyState);
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      dispatch({ type: "keydown", payload: getKeyCombinationComponentsFromEvent(event) });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  const viewTerm = makeViewTerm(state);
  return (
    <div>
      <div>
        {Object.entries(state.source).map(([entry, { type }]) => {
          return (
            <div key={entry}>
              {entry} : {viewTerm(type, false, { entry, level: "type", relative: [] })}
            </div>
          );
        })}
      </div>
      {state.cursor.type === "top-empty" && <EmulatedInput state={state.cursor.input} />}
    </div>
  );
}

export type EditorState = {
  source: Source.Scope;
  cursor: { type: "top-empty"; input: EmulatedInputState } | { type: "entry"; path: Path.Absolute; cursor: number };
};
type EditorAction = { type: "keydown"; payload: KeyCombinationComponents };

const emptyState: EditorState = { source: {}, cursor: { type: "top-empty", input: { text: "", cursor: 0 } } };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const newState = getOperationForKeyCombination(action.payload, state);
  if (newState) return newState;
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
  }
  return state;
}

function makeViewTerm(state: EditorState) {
  function viewTerm(term: Source.Term, showParens: boolean, path: Path.Absolute) {
    const hasCursor = state.cursor.type === "entry" ? Path.fluent(path).isEqual(state.cursor.path) : false;
    const borderBottom = hasCursor ? `2px solid ${colors.blue}` : "none";
    const cursorHere = () => {};
    const childPath = (leaf: string) => Path.fluent(path).child(leaf).path;
    const parens = (symbol: string) =>
      showParens && (
        <span style={{ color: colors.purple }} onClick={cursorHere}>
          (
        </span>
      );
    const punctuation = (symbol: string) => (
      <span style={{ color: colors.purple }} onClick={cursorHere}>
        {symbol}
      </span>
    );
    switch (term.type) {
      case "type": {
        return (
          <span style={{ color: colors.purple, borderBottom }} onClick={cursorHere} onFocus={cursorHere}>
            type<sub>{term.universe}</sub>
          </span>
        );
      }
      case "reference": {
        if (hasCursor && state.cursor.type === "entry") {
          return <EmulatedInput state={{ text: term.identifier, cursor: state.cursor.cursor }} />;
        }
        return (
          <span
            onClick={cursorHere}
            onFocus={cursorHere}
            style={{
              color: term.identifier === "" ? colors.gray : colors.white,
              borderBottom,
            }}
          >
            {term.identifier || "_"}
          </span>
        );
      }
      case "application": {
        return (
          <span style={{ borderBottom }}>
            {parens("(")}
            {viewTerm(term.left, term.left.type !== "application", childPath("left"))}
            {punctuation(" ")}
            {viewTerm(term.right, true, childPath("right"))}
            {parens(")")}
          </span>
        );
      }
      case "pi": {
        return (
          <span style={{ borderBottom }}>
            {parens("(")}
            {term.head || hasCursor ? (
              <>
                {punctuation("(")}
                <>{term.head}</>
                {punctuation(" : ")}
                {viewTerm(term.from, false, childPath("from"))}
                {punctuation(")")}
              </>
            ) : (
              viewTerm(term.from, false, childPath("from"))
            )}
            {punctuation(" -> ")}
            {viewTerm(term.to, false, childPath("to"))}
            {parens(")")}
          </span>
        );
      }
    }
  }
  return viewTerm;
}
