import { useLayoutEffect, useReducer } from "react";
import { colors } from "../App";
import { EmulatedInput, emulatedInputReducer, EmulatedInputState } from "./emulated-input";
import { getKeyCombinationComponentsFromEvent, KeyCombinationComponents, ViewKeyCombination } from "./key-combinations";
import { getOperationForKeyCombination, getPossibleKeyboardOperations } from "./keyboard-operations";
import { operations } from "./operations";
import * as Path from "../core/path";
import * as Source from "../core/source";

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
  const possibleKeyboardOperations = getPossibleKeyboardOperations(state);
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: colors.background, color: colors.white, whiteSpace: "pre" }}>
      <div>
        {Object.entries(state.source).map(([entry, { type, value }]) => {
          return (
            <div key={entry}>
              {entry}
              {type && <> : {viewTerm(type, false, { entry, level: "type", relative: [] })}</>}
              {value && <> = {viewTerm(value, false, { entry, level: "value", relative: [] })}</>}
            </div>
          );
        })}
      </div>
      {state.cursor.type === "top-empty" && <EmulatedInput state={state.cursor.input} />}
      <div style={{ backgroundColor: colors.backgroundDark }}>
        {possibleKeyboardOperations.map(({ keyCombination, operation }) => {
          return (
            <div key={keyCombination}>
              <ViewKeyCombination keyCombination={keyCombination} />
              {operation}
            </div>
          );
        })}
      </div>
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

function makeViewTerm(state: EditorState) {
  function viewTerm(term: Source.Term, showParens: boolean, path: Path.Absolute) {
    const hasCursor = state.cursor.type === "entry" ? Path.fluent(path).isEqual(state.cursor.path) : false;
    const borderBottom = hasCursor ? `2px solid ${colors.blue}` : "none";
    const cursorHere = () => {};
    const childPath = (leaf: string) => Path.fluent(path).child(leaf).path;
    const parens = (symbol: string) =>
      showParens && (
        <span style={{ color: colors.purple }} onClick={cursorHere}>
          {symbol}
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
          <span style={{ color: colors.purple, borderBottom }} onClick={cursorHere}>
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
                {hasCursor && state.cursor.type === "entry" ? (
                  <EmulatedInput state={{ text: term.head, cursor: state.cursor.cursor }} />
                ) : (
                  term.head
                )}
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
      case "lambda": {
        return (
          <span style={{ borderBottom }}>
            {parens("(")}
            {punctuation("(")}
            {hasCursor && state.cursor.type === "entry" ? (
              <EmulatedInput state={{ text: term.head, cursor: state.cursor.cursor }} />
            ) : (
              term.head
            )}
            {punctuation(" : ")}
            {viewTerm(term.from, false, childPath("from"))}
            {punctuation(")")}
            {punctuation(" => ")}
            {viewTerm(term.body, false, childPath("body"))}
            {parens(")")}
          </span>
        );
      }
    }
  }
  return viewTerm;
}