import { useLayoutEffect, useReducer } from "react";
import { colors } from "../../App";
import { EmulatedInput, emulatedInputReducer, EmulatedInputState } from "./emulated-input";
import { getKeyCombinationComponentsFromEvent, KeyCombinationComponents } from "./key-combinations";
import { getOperationForKeyCombination } from "./keyboard-operations";
import { getByEntryPath, isEqualEntryPath, setByEntryPath, SourceTermEntryPath } from "./path";
import { SourceTerm, SourceTermScope } from "./term";

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
              {entry} : {viewTerm(type, false, { entry, level: "type", path: [] })}
            </div>
          );
        })}
      </div>
      {state.cursor.type === "top-empty" && <EmulatedInput state={state.cursor.input} />}
    </div>
  );
}

export type EditorState = {
  source: SourceTermScope;
  cursor: { type: "top-empty"; input: EmulatedInputState } | { type: "entry"; entryPath: SourceTermEntryPath; cursor: number };
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
    const term = getByEntryPath(state.source, state.cursor.entryPath);
    if (term.type === "reference") {
      const { text, cursor } = emulatedInputReducer({ text: term.identifier, cursor: state.cursor.cursor }, action.payload);
      return {
        source: setByEntryPath(state.source, state.cursor.entryPath, { type: "reference", identifier: text }),
        cursor: { ...state.cursor, cursor },
      };
    }
  }
  return state;
}

function makeViewTerm(state: EditorState) {
  function viewTerm(term: SourceTerm, parens: boolean, entryPath: SourceTermEntryPath) {
    const hasCursor = state.cursor.type === "entry" ? isEqualEntryPath(entryPath, state.cursor.entryPath) : false;
    const borderBottom = hasCursor ? `2px solid ${colors.blue}` : "none";
    const cursorHere = () => {};
    const appendPath = (leaf: string): SourceTermEntryPath => ({
      entry: entryPath.entry,
      level: entryPath.level,
      path: [...entryPath.path, leaf],
    });
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
            {parens && (
              <span style={{ color: colors.purple }} onClick={cursorHere}>
                (
              </span>
            )}
            {viewTerm(term.left, term.left.type !== "application", appendPath("left"))}
            <span onClick={cursorHere}> </span>
            {viewTerm(term.right, true, appendPath("right"))}
            {parens && (
              <span style={{ color: colors.purple }} onClick={cursorHere}>
                )
              </span>
            )}
          </span>
        );
      }
      case "pi": {
        return (
          <span style={{ borderBottom }}>
            {parens && (
              <span style={{ color: colors.purple }} onClick={cursorHere}>
                (
              </span>
            )}
            {term.head || hasCursor ? (
              <>
                <span style={{ color: colors.purple }}>(</span>
                <span>{term.head}</span>
                {" : "}
                {viewTerm(term.from, false, appendPath("from"))}
                <span style={{ color: colors.purple }}>)</span>
              </>
            ) : (
              viewTerm(term.from, false, appendPath("from"))
            )}
            <span style={{ color: colors.purple }} onClick={cursorHere}>
              {" -> "}
            </span>
            {viewTerm(term.to, false, appendPath("to"))}
            {parens && (
              <span style={{ color: colors.purple }} onClick={cursorHere}>
                )
              </span>
            )}
          </span>
        );
      }
    }
  }
  return viewTerm;
}
