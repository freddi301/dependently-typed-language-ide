import { EditorState } from "./editor";
import { EmulatedInputState } from "./emulated-input";
import * as Source from "../core/source";
import * as Path from "../core/path";

type Operation = (state: EditorState) => EditorState;

const emptyReference: Source.Term = { type: "reference", identifier: "" };

const emptyInput: EmulatedInputState = { text: "", cursor: 0 };

function isCursorAtEnd({ text, cursor }: EmulatedInputState) {
  return cursor === text.length;
}

function isCursorAtStart({ cursor }: EmulatedInputState) {
  return cursor === 0;
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

const turnIntoApplicationLeftThenCursorToRight: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  if (currentFluent.term.type === "reference" && isCursorAtEnd({ text: currentFluent.term.identifier, cursor: state.cursor.cursor })) {
    return {
      ...state,
      source: Source.fluentScope(state.source).set(state.cursor.path, {
        type: "application",
        left: currentFluent.term,
        right: emptyReference,
      }).scope,
      cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("right").path },
    };
  }
  return {
    ...state,
    source: Source.fluentScope(state.source).set(state.cursor.path, {
      type: "application",
      left: currentFluent.term,
      right: emptyReference,
    }).scope,
    cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("right").path },
  };
};

const navigateUp: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const parentPathFluent = currentPathFluent.parent();
  if (parentPathFluent) {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.path } };
  }
  throw new Error();
};

const navigateDown: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  if (currentFluent.term.type === "application") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("left").path } };
  }
  if (currentFluent.term.type === "pi") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("from").path } };
  }
  throw new Error();
};

const navigateLeft: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  const parentPathFluent = currentPathFluent.parent();
  const parentFluent = parentPathFluent && sourceFluent.get(parentPathFluent.path);
  if (!parentFluent || !parentPathFluent) throw new Error();
  if (currentFluent.term.type === "reference" && !isCursorAtStart({ text: currentFluent.term.identifier, cursor: state.cursor.cursor }))
    throw new Error();
  if (currentFluent.term.type === "pi" && !isCursorAtStart({ text: currentFluent.term.head, cursor: state.cursor.cursor }))
    throw new Error();
  if (parentFluent.term.type === "application" && currentPathFluent.last() === "right") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("left").path } };
  }
  if (parentFluent.term.type === "pi" && currentPathFluent.last() === "to") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("from").path } };
  }
  throw new Error();
};

const navigateRight: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  const parentPathFluent = currentPathFluent.parent();
  const parentFluent = parentPathFluent && sourceFluent.get(parentPathFluent.path);
  if (!parentFluent || !parentPathFluent) throw new Error();
  if (currentFluent.term.type === "reference" && !isCursorAtEnd({ text: currentFluent.term.identifier, cursor: state.cursor.cursor }))
    throw new Error();
  if (parentFluent.term.type === "application" && currentPathFluent.last() === "left") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("right").path } };
  }
  if (parentFluent.term.type === "pi" && currentPathFluent.last() === "from") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("to").path } };
  }
  throw new Error();
};

const replaceWithEmptyReference: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  if (currentFluent.term.type === "reference") throw new Error();
  if (currentFluent.term.type === "pi" && !isCursorAtStart({ text: currentFluent.term.head, cursor: state.cursor.cursor }))
    throw new Error();
  return {
    ...state,
    source: Source.fluentScope(state.source).set(state.cursor.path, emptyReference).scope,
    cursor: { ...state.cursor, cursor: 0 },
  };
};

const navigateIntoRight: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(state.source);
  const currentPathFluent = Path.fluent(state.cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  const parentPathFluent = currentPathFluent.parent();
  const parentFluent = parentPathFluent && sourceFluent.get(parentPathFluent.path);
  if (
    currentFluent.term.type === "reference" &&
    isCursorAtEnd({ text: currentFluent.term.identifier, cursor: state.cursor.cursor }) &&
    parentPathFluent &&
    parentFluent?.term.type === "pi" &&
    currentPathFluent.last() === "from"
  ) {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("to").path } };
  }
  throw new Error();
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
  navigateIntoRight,
  turnIntoApplicationLeftThenCursorToRight,
  navigateLeft,
  navigateUp,
  navigateRight,
  navigateDown,
  replaceWithEmptyReference,
  // moveCursorToEntry,
  // insertHereType,
  // insertHereReference,
  // insertHereApplication,
  // insertHerePi,
};
