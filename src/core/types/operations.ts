import { EditorState } from "./editor";
import { EmulatedInputState } from "./emulated-input";
import * as Source from "./source";
import * as Path from "./path";

type Operation = (state: EditorState) => EditorState;

const emptyReference: Source.Term = { type: "reference", identifier: "" };

const emptyInput: EmulatedInputState = { text: "", cursor: 0 };

function isCursorAtEnd({ text, cursor }: EmulatedInputState) {
  return cursor === text.length;
}

const addEntry: Operation = (state) => {
  if (state.cursor.type !== "top-empty") throw new Error();
  const entry = state.cursor.input.text;
  if (!entry) throw new Error();
  if (state.source[entry]) throw new Error();
  if (!isCursorAtEnd(state.cursor.input)) throw new Error();
  return {
    ...state,
    source: Source.fluentScope(state.source).set({ entry, level: "type", relative: [] }, emptyReference).scope,
    cursor: { type: "top-empty", input: emptyInput },
  };
};

const resetCursor: Operation = (state) => {
  if (state.cursor.type === "top-empty") throw new Error();
  return {
    ...state,
    cursor: { type: "top-empty", input: emptyInput },
  };
};

const addEntryThenCursorToType: Operation = (state) => {
  if (state.cursor.type !== "top-empty") throw new Error();
  const entry = state.cursor.input.text;
  if (!entry) throw new Error();
  if (state.source[entry]) throw new Error();
  if (!isCursorAtEnd(state.cursor.input)) throw new Error();
  return {
    ...state,
    source: Source.fluentScope(state.source).set({ entry, level: "type", relative: [] }, emptyReference).scope,
    cursor: { type: "entry", path: { entry, level: "type", relative: [] }, cursor: 0 },
  };
};

const turnIntoPiFromThenCursorToTo: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  return {
    ...state,
    source: Source.fluentScope(state.source).set(state.cursor.path, {
      type: "pi",
      head: "",
      from: Source.fluentScope(state.source).get(state.cursor.path).term,
      to: emptyReference,
    }).scope,
    cursor: { type: "entry", cursor: 0, path: Path.fluent(state.cursor.path).child("to").path },
  };
};

const turnIntoPiHeadThenCursorToFrom: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const term = Source.fluentScope(state.source).get(state.cursor.path).term;
  if (term.type !== "reference") throw new Error();
  return {
    ...state,
    source: Source.fluentScope(state.source).set(state.cursor.path, {
      type: "pi",
      head: term.identifier,
      from: emptyReference,
      to: emptyReference,
    }).scope,
    cursor: { type: "entry", cursor: 0, path: Path.fluent(state.cursor.path).child("from").path },
  };
};

// const moveCursorToEntry: Operation = (state) => {
//   const entry = state.text;
//   if (!(state.cursor === null && state.source[entry])) return null;
//   return () => {
//     return { ...state, text: "", cursor: { entry, level: "type", path: [] } };
//   };
// };

// function makeInsertHere(term: SourceTerm): Operation {
//   return (state) => {
//     const { cursor } = state;
//     if (!cursor) return null;
//     return () => {
//       return { ...state, source: setByEntryPath(state.source, cursor, term) };
//     };
//   };
// }

// const insertHereType = makeInsertHere({ type: "type", universe: 1 });
// const insertHereReference = makeInsertHere(emptyReference);
// const insertHereApplication = makeInsertHere({ type: "application", left: emptyReference, right: emptyReference });
// const insertHerePi = makeInsertHere({ type: "pi", head: "", from: emptyReference, to: emptyReference });

export const operations = {
  addEntry,
  addEntryThenCursorToType,
  resetCursor,
  turnIntoPiFromThenCursorToTo,
  turnIntoPiHeadThenCursorToFrom,
  // moveCursorToEntry,
  // insertHereType,
  // insertHereReference,
  // insertHereApplication,
  // insertHerePi,
};
