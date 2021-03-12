import { EditorState } from "./editor";
import { setByEntryPath } from "./path";
import { SourceTerm } from "./term";

type Operation = (state: EditorState) => EditorState;

const emptyReference: SourceTerm = { type: "reference", identifier: "" };

const addEntry: Operation = (state) => {
  if (state.cursor.type !== "top-empty") throw new Error();
  if (!state.cursor.input.text) throw new Error();
  if (state.source[state.cursor.input.text]) throw new Error();
  if (state.cursor.input.cursor !== state.cursor.input.text.length) throw new Error();
  return {
    ...state,
    source: setByEntryPath(state.source, { entry: state.cursor.input.text, level: "type", path: [] }, emptyReference),
    cursor: { type: "top-empty", input: { text: "", cursor: 0 } },
  };
};

const resetCursor: Operation = (state) => {
  return {
    ...state,
    cursor: { type: "top-empty", input: { text: "", cursor: 0 } },
  };
};

const addEntryThenCursorToType: Operation = (state) => {
  if (state.cursor.type !== "top-empty") throw new Error();
  if (!state.cursor.input.text) throw new Error();
  if (state.source[state.cursor.input.text]) throw new Error();
  if (state.cursor.input.cursor !== state.cursor.input.text.length) throw new Error();
  return {
    ...state,
    source: setByEntryPath(state.source, { entry: state.cursor.input.text, level: "type", path: [] }, emptyReference),
    cursor: { type: "entry", entryPath: { entry: state.cursor.input.text, level: "type", path: [] }, cursor: 0 },
  };
};

// const turnReferenceIntoPiFromThenCursorToTo: Operation = (state) => {
//   if (state.cursor.type !== "entry") throw new Error()
//   return {
//     ...state,
//     source:
//     cursor:
//   }
// }

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
  // moveCursorToEntry,
  // insertHereType,
  // insertHereReference,
  // insertHereApplication,
  // insertHerePi,
};
