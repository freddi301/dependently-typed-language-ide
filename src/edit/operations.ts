import { SourceState, State } from "./editor-state";
import { EmulatedInputState } from "./emulated-input";
import * as Source from "../core/source";
import * as Path from "../core/path";
import * as History from "./history-state";
import { getSuggestions } from "./suggestions";

// TODO should not use throw
type Operation = (state: State) => State;

const emptyReference: Source.Term = { type: "reference", identifier: "" };

const emptyInput: EmulatedInputState = { text: "", cursor: 0 };

function isCursorAtEnd({ text, cursor }: EmulatedInputState) {
  return cursor === text.length;
}

function isCursorAtStart({ cursor }: EmulatedInputState) {
  return cursor === 0;
}

const addEntry: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "top-empty") throw new Error();
  const entry = cursor.input.text;
  if (!entry) throw new Error();
  if (source[entry]) throw new Error();
  if (!isCursorAtEnd(cursor.input)) throw new Error();
  return {
    history: do_({ source: Source.fluentScope(source).add(entry).scope, cursor: { type: "top-empty", input: emptyInput } }),
    suggestionIndex: null,
  };
};

const turnIntoType: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const term = Source.fluentScope(source).get(cursor.path).term;
  if (term.type !== "reference") throw new Error();
  if (!isCursorAtEnd({ text: term.identifier, cursor: cursor.cursor })) throw new Error();
  const match = term.identifier.match(/^(type)([0-9]+)?$/);
  if (!match) throw new Error();
  const universe = Number(match[2]) || 1;
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "type",
        universe,
      }).scope,
      cursor,
    }),
    suggestionIndex: null,
  };
};

const resetCursor: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type === "top-empty") throw new Error();
  return {
    history: do_({ source, cursor: { type: "top-empty", input: emptyInput } }),
    suggestionIndex: null,
  };
};

function makeAddEntryThenCursorTo(level: "type" | "value"): Operation {
  return (state) => {
    const { source, cursor } = History.getCurrent(state.history);
    const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
    if (cursor.type !== "top-empty") throw new Error();
    const entry = cursor.input.text;
    if (!entry) throw new Error();
    if (source[entry]) throw new Error();
    if (!isCursorAtEnd(cursor.input)) throw new Error();
    return {
      history: do_({
        source: Source.fluentScope(source).add(entry).scope,
        cursor: { type: "entry", path: { entry, level, relative: [] }, cursor: 0 },
      }),
      suggestionIndex: null,
    };
  };
}

const addEntryThenCursorToType = makeAddEntryThenCursorTo("type");
const addEntryThenCursorToValue = makeAddEntryThenCursorTo("value");

function makeMoveCursorTo(level: "type" | "value"): Operation {
  return (state) => {
    const { source, cursor } = History.getCurrent(state.history);
    const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
    if (cursor.type !== "top-empty") throw new Error();
    const entry = cursor.input.text;
    if (!entry) throw new Error();
    if (!source[entry]?.[level]) throw new Error();
    if (!isCursorAtEnd(cursor.input)) throw new Error();
    return {
      history: do_({ source, cursor: { type: "entry", path: { entry, level, relative: [] }, cursor: 0 } }),
      suggestionIndex: null,
    };
  };
}

const moveCursorToType = makeMoveCursorTo("type");
const moveCursorToValue = makeMoveCursorTo("value");

const turnIntoPiFromThenCursorToTo: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "pi",
        head: "",
        from: Source.fluentScope(source).get(cursor.path).term,
        to: emptyReference,
      }).scope,
      cursor: { type: "entry", cursor: 0, path: Path.fluent(cursor.path).child("to").path },
    }),
    suggestionIndex: null,
  };
};

const turnIntoPiHeadThenCursorToFrom: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const term = Source.fluentScope(source).get(cursor.path).term;
  if (term.type !== "reference") throw new Error();
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "pi",
        head: term.identifier,
        from: emptyReference,
        to: emptyReference,
      }).scope,
      cursor: { type: "entry", cursor: 0, path: Path.fluent(cursor.path).child("from").path },
    }),
    suggestionIndex: null,
  };
};

const turnIntoLambdaHeadThenCursorToFrom: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const term = Source.fluentScope(source).get(cursor.path).term;
  if (term.type !== "reference") throw new Error();
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "lambda",
        head: term.identifier,
        from: emptyReference,
        body: emptyReference,
      }).scope,
      cursor: { type: "entry", cursor: 0, path: Path.fluent(cursor.path).child("from").path },
    }),
    suggestionIndex: null,
  };
};

const turnIntoApplicationLeftThenCursorToRight: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(source);
  const currentPathFluent = Path.fluent(cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  if (currentFluent.term.type === "reference" && isCursorAtEnd({ text: currentFluent.term.identifier, cursor: cursor.cursor })) {
    return {
      history: do_({
        source: Source.fluentScope(source).set(cursor.path, {
          type: "application",
          left: currentFluent.term,
          right: emptyReference,
        }).scope,
        cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("right").path },
      }),
      suggestionIndex: null,
    };
  }
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "application",
        left: currentFluent.term,
        right: emptyReference,
      }).scope,
      cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("right").path },
    }),
    suggestionIndex: null,
  };
};

const navigateUp: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const currentPathFluent = Path.fluent(cursor.path);
  const parentPathFluent = currentPathFluent.parent();
  if (parentPathFluent) {
    return { history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.path } }), suggestionIndex: null };
  }
  throw new Error();
};

const navigateDown: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(source);
  const currentPathFluent = Path.fluent(cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  if (currentFluent.term.type === "application") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("left").path } }),
      suggestionIndex: null,
    };
  }
  if (currentFluent.term.type === "pi") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("from").path } }),
      suggestionIndex: null,
    };
  }
  if (currentFluent.term.type === "lambda") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: currentPathFluent.child("from").path } }),
      suggestionIndex: null,
    };
  }
  throw new Error();
};

const navigateLeft: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(source);
  const currentPathFluent = Path.fluent(cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  const parentPathFluent = currentPathFluent.parent();
  const parentFluent = parentPathFluent && sourceFluent.get(parentPathFluent.path);
  if (!parentFluent || !parentPathFluent) throw new Error();
  if (currentFluent.term.type === "reference" && !isCursorAtStart({ text: currentFluent.term.identifier, cursor: cursor.cursor }))
    throw new Error();
  if (currentFluent.term.type === "pi" && !isCursorAtStart({ text: currentFluent.term.head, cursor: cursor.cursor })) throw new Error();
  if (parentFluent.term.type === "application" && currentPathFluent.last() === "right") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("left").path } }),
      suggestionIndex: null,
    };
  }
  if (parentFluent.term.type === "pi" && currentPathFluent.last() === "to") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("from").path } }),
      suggestionIndex: null,
    };
  }
  throw new Error();
};

const navigateRight: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(source);
  const currentPathFluent = Path.fluent(cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  const parentPathFluent = currentPathFluent.parent();
  const parentFluent = parentPathFluent && sourceFluent.get(parentPathFluent.path);
  if (!parentFluent || !parentPathFluent) throw new Error();
  if (currentFluent.term.type === "reference" && !isCursorAtEnd({ text: currentFluent.term.identifier, cursor: cursor.cursor }))
    throw new Error();
  if (parentFluent.term.type === "application" && currentPathFluent.last() === "left") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("right").path } }),
      suggestionIndex: null,
    };
  }
  if (parentFluent.term.type === "pi" && currentPathFluent.last() === "from") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("to").path } }),
      suggestionIndex: null,
    };
  }
  if (parentFluent.term.type === "lambda" && currentPathFluent.last() === "from") {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("body").path } }),
      suggestionIndex: null,
    };
  }
  throw new Error();
};

const replaceWithEmptyReference: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(source);
  const currentPathFluent = Path.fluent(cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  if (currentFluent.term.type === "reference") throw new Error();
  if (currentFluent.term.type === "pi" && !isCursorAtStart({ text: currentFluent.term.head, cursor: cursor.cursor })) throw new Error();
  return {
    history: do_({ source: Source.fluentScope(source).set(cursor.path, emptyReference).scope, cursor: { ...cursor, cursor: 0 } }),
    suggestionIndex: null,
  };
};

const navigateIntoRight: Operation = (state) => {
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  const sourceFluent = Source.fluentScope(source);
  const currentPathFluent = Path.fluent(cursor.path);
  const currentFluent = sourceFluent.get(currentPathFluent.path);
  const parentPathFluent = currentPathFluent.parent();
  const parentFluent = parentPathFluent && sourceFluent.get(parentPathFluent.path);
  if (
    currentFluent.term.type === "reference" &&
    isCursorAtEnd({ text: currentFluent.term.identifier, cursor: cursor.cursor }) &&
    parentPathFluent &&
    parentFluent?.term.type === "pi" &&
    currentPathFluent.last() === "from"
  ) {
    return {
      history: do_({ source, cursor: { type: "entry", cursor: 0, path: parentPathFluent.child("to").path } }),
      suggestionIndex: null,
    };
  }
  throw new Error();
};

const undo: Operation = (state) => {
  if (!History.canUndo(state.history)) return state;
  return {
    history: History.reducer(state.history, { type: "undo" }),
    suggestionIndex: null,
  };
};

const redo: Operation = (state) => {
  if (!History.canRedo(state.history)) return state;
  return {
    history: History.reducer(state.history, { type: "redo" }),
    suggestionIndex: null,
  };
};

const suggestionStart: Operation = (state) => {
  const { cursor } = History.getCurrent(state.history);
  if (cursor.type !== "entry") throw new Error();
  if (state.suggestionIndex !== null) return state;
  return {
    history: state.history,
    suggestionIndex: 0,
  };
};

const suggestionStop: Operation = (state) => {
  if (state.suggestionIndex === null) throw new Error();
  return {
    history: state.history,
    suggestionIndex: null,
  };
};

const suggestionUp: Operation = (state) => {
  if (state.suggestionIndex === null) throw new Error();
  if (state.suggestionIndex > 0) {
    return {
      history: state.history,
      suggestionIndex: state.suggestionIndex - 1,
    };
  }
  const suggestions = getSuggestions(state);
  return {
    history: state.history,
    suggestionIndex: suggestions.length - 1,
  };
};

const suggestionDown: Operation = (state) => {
  if (state.suggestionIndex === null) throw new Error();
  const suggestions = getSuggestions(state);
  if (state.suggestionIndex > suggestions.length - 2)
    return {
      history: state.history,
      suggestionIndex: 0,
    };
  return {
    history: state.history,
    suggestionIndex: state.suggestionIndex + 1,
  };
};

const suggestionChoose: Operation = (state) => {
  if (state.suggestionIndex === null) throw new Error();
  const suggestions = getSuggestions(state);
  const suggestion = suggestions[state.suggestionIndex];
  if (!suggestion) throw new Error();
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "reference",
        identifier: suggestion.identifier,
      }).scope,
      cursor: { type: "entry", path: cursor.path, cursor: suggestion.identifier.length },
    }),
    suggestionIndex: null,
  };
};

const suggestionQuickChooseFirst: Operation = (state) => {
  const suggestions = getSuggestions(state);
  const suggestion = suggestions[0];
  if (!suggestion) throw new Error();
  const { source, cursor } = History.getCurrent(state.history);
  const do_ = (payload: SourceState) => History.reducer(state.history, { type: "do", payload });
  if (cursor.type !== "entry") throw new Error();
  return {
    history: do_({
      source: Source.fluentScope(source).set(cursor.path, {
        type: "reference",
        identifier: suggestion.identifier,
      }).scope,
      cursor: { type: "entry", path: cursor.path, cursor: suggestion.identifier.length },
    }),
    suggestionIndex: null,
  };
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
  undo,
  redo,
  suggestionStart,
  suggestionStop,
  suggestionUp,
  suggestionDown,
  suggestionChoose,
  suggestionQuickChooseFirst,
};
