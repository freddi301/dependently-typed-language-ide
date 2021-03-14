import { EditorState } from "./editor-state";
import { EmulatedInputState } from "./emulated-input";
import * as Source from "../core/source";
import * as Path from "../core/path";

// TODO should not use throw
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
    source: Source.fluentScope(state.source).add(entry).scope,
    cursor: { type: "top-empty", input: emptyInput },
  };
};

const turnIntoType: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const term = Source.fluentScope(state.source).get(state.cursor.path).term;
  if (term.type !== "reference") throw new Error();
  if (!isCursorAtEnd({ text: term.identifier, cursor: state.cursor.cursor })) throw new Error();
  const match = term.identifier.match(/^(type)([0-9]+)?$/);
  if (!match) throw new Error();
  const universe = Number(match[2]) || 1;
  return {
    ...state,
    source: Source.fluentScope(state.source).set(state.cursor.path, {
      type: "type",
      universe,
    }).scope,
  };
};

const resetCursor: Operation = (state) => {
  if (state.cursor.type === "top-empty") throw new Error();
  return {
    ...state,
    cursor: { type: "top-empty", input: emptyInput },
  };
};

function makeAddEntryThenCursorTo(level: "type" | "value"): Operation {
  return (state) => {
    if (state.cursor.type !== "top-empty") throw new Error();
    const entry = state.cursor.input.text;
    if (!entry) throw new Error();
    if (state.source[entry]) throw new Error();
    if (!isCursorAtEnd(state.cursor.input)) throw new Error();
    return {
      ...state,
      source: Source.fluentScope(state.source).add(entry).scope,
      cursor: { type: "entry", path: { entry, level, relative: [] }, cursor: 0 },
    };
  };
}

const addEntryThenCursorToType = makeAddEntryThenCursorTo("type");
const addEntryThenCursorToValue = makeAddEntryThenCursorTo("value");

function makeMoveCursorTo(level: "type" | "value"): Operation {
  return (state) => {
    if (state.cursor.type !== "top-empty") throw new Error();
    const entry = state.cursor.input.text;
    if (!entry) throw new Error();
    if (!state.source[entry]?.[level]) throw new Error();
    if (!isCursorAtEnd(state.cursor.input)) throw new Error();
    return {
      ...state,
      cursor: { type: "entry", path: { entry, level, relative: [] }, cursor: 0 },
    };
  };
}

const moveCursorToType = makeMoveCursorTo("type");
const moveCursorToValue = makeMoveCursorTo("value");

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

const turnIntoLambdaHeadThenCursorToFrom: Operation = (state) => {
  if (state.cursor.type !== "entry") throw new Error();
  const term = Source.fluentScope(state.source).get(state.cursor.path).term;
  if (term.type !== "reference") throw new Error();
  return {
    ...state,
    source: Source.fluentScope(state.source).set(state.cursor.path, {
      type: "lambda",
      head: term.identifier,
      from: emptyReference,
      body: emptyReference,
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
  if (currentFluent.term.type === "lambda") {
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
  if (parentFluent.term.type === "lambda" && currentPathFluent.last() === "from") {
    return { ...state, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("body").path } };
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

export const operations = {
  addEntry,
  addEntryThenCursorToType,
  addEntryThenCursorToValue,
  moveCursorToType,
  moveCursorToValue,
  resetCursor,
  turnIntoPiFromThenCursorToTo,
  turnIntoPiHeadThenCursorToFrom,
  turnIntoLambdaHeadThenCursorToFrom,
  navigateIntoRight,
  turnIntoApplicationLeftThenCursorToRight,
  navigateLeft,
  navigateUp,
  navigateRight,
  navigateDown,
  replaceWithEmptyReference,
  turnIntoType,
};
