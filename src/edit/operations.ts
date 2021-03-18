import * as Editor from "./editor-state";
import * as Source from "../core/source";
import * as Path from "../core/path";
import { EmulatedInputState } from "./emulated-input";

// TODO should not use throw
type Operation = (state: Editor.OnEditor) => Editor.State;

const emptyReference: Source.Term = { type: "reference", identifier: "" };

function isCursorAtEnd({ text, cursor }: EmulatedInputState) {
  return cursor === text.length;
}

function isCursorAtStart({ cursor }: EmulatedInputState) {
  return cursor === 0;
}

const turnIntoType: Operation = ({ state, source, cursor, do_, current: underCursor }) => {
  const term = underCursor;
  if (term.type !== "reference") throw new Error();
  if (!isCursorAtEnd({ text: term.identifier, cursor: cursor.cursor })) throw new Error();
  const match = term.identifier.match(/^(type)([0-9]+)?$/);
  if (!match) throw new Error();
  const universe = Number(match[2]) || 1;
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "type",
        universe,
      }),
      cursor,
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const resetCursor: Operation = ({ state, source, do_ }) => {
  return {
    history: do_({ source, cursor: Editor.rootCursor }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const turnIntoPiFromThenCursorToTo: Operation = ({ state, source, cursor, do_ }) => {
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "pi",
        head: "",
        from: Source.get(source, cursor.path),
        to: emptyReference,
      }),
      cursor: { cursor: 0, path: Path.child(cursor.path, "to") },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const turnIntoPiHeadThenCursorToFrom: Operation = ({ state, source, cursor, do_, current: underCursor }) => {
  const term = underCursor;
  if (term.type !== "reference") throw new Error();
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "pi",
        head: term.identifier,
        from: emptyReference,
        to: emptyReference,
      }),
      cursor: { cursor: 0, path: Path.child(cursor.path, "from") },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const turnIntoLambdaHeadThenCursorToFrom: Operation = ({ state, source, cursor, do_, current: underCursor }) => {
  const term = underCursor;
  if (term.type !== "reference") throw new Error();
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "lambda",
        head: term.identifier,
        from: emptyReference,
        body: emptyReference,
      }),
      cursor: { cursor: 0, path: Path.child(cursor.path, "from") },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const turnIntoLetHeadThenCursorToFrom: Operation = ({ state, source, cursor, do_, current: underCursor }) => {
  const term = underCursor;
  if (term.type !== "reference") throw new Error();
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "let",
        head: term.identifier,
        from: emptyReference,
        left: emptyReference,
        right: emptyReference,
      }),
      cursor: { cursor: 0, path: Path.child(cursor.path, "from") },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const turnIntoApplicationLeftThenCursorToRight: Operation = ({ state, source, cursor, do_, current }) => {
  const childPath = (leaf: string) => Path.child(cursor.path, leaf);
  if (current.type === "reference" && isCursorAtEnd({ text: current.identifier, cursor: cursor.cursor })) {
    return {
      history: do_({
        source: Source.set(source, cursor.path, {
          type: "application",
          left: current,
          right: emptyReference,
        }),
        cursor: { cursor: 0, path: childPath("right") },
      }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "application",
        left: current,
        right: emptyReference,
      }),
      cursor: { cursor: 0, path: childPath("right") },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const navigateUp: Operation = ({ state, source, do_, parentPath }) => {
  console.log(parentPath);
  if (parentPath) {
    return {
      history: do_({ source, cursor: { cursor: 0, path: parentPath } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  throw new Error();
};

const navigateDown: Operation = ({ state, source, cursor, do_, current }) => {
  const childPath = (leaf: string) => Path.child(cursor.path, leaf);
  if (current.type === "application") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: childPath("left") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (current.type === "pi") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: childPath("from") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (current.type === "lambda") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: childPath("from") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (current.type === "let") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: childPath("from") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  throw new Error();
};

const navigateLeft: Operation = ({ state, source, cursor, do_, current, currentPath, parent, parentPath }) => {
  if (!parent || !parentPath) throw new Error();
  if (current.type === "reference" && !isCursorAtStart({ text: current.identifier, cursor: cursor.cursor })) throw new Error();
  if (current.type === "pi" && !isCursorAtStart({ text: current.head, cursor: cursor.cursor })) throw new Error();
  if (parent.type === "application" && Path.last(currentPath) === "right") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "left") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (parent.type === "pi" && Path.last(currentPath) === "to") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "from") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  throw new Error();
};

const navigateRight: Operation = ({ state, source, cursor, do_, current, currentPath, parent, parentPath }) => {
  if (!parent || !parentPath) throw new Error();
  if (current.type === "reference" && !isCursorAtEnd({ text: current.identifier, cursor: cursor.cursor })) throw new Error();
  if (parent.type === "application" && Path.last(currentPath) === "left") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "right") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (parent.type === "pi" && Path.last(currentPath) === "from") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "to") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (parent.type === "lambda" && Path.last(currentPath) === "from") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "body") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (parent.type === "let" && Path.last(currentPath) === "from") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "left") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  if (parent.type === "let" && Path.last(currentPath) === "left") {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "right") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  throw new Error();
};

const replaceWithEmptyReference: Operation = ({ state, source, cursor, do_, current }) => {
  if (current.type === "reference") throw new Error();
  if (current.type === "pi" && !isCursorAtStart({ text: current.head, cursor: cursor.cursor })) throw new Error();
  if (current.type === "lambda" && !isCursorAtStart({ text: current.head, cursor: cursor.cursor })) throw new Error();
  if (current.type === "let" && !isCursorAtStart({ text: current.head, cursor: cursor.cursor })) throw new Error();
  return {
    history: do_({ source: Source.set(source, cursor.path, emptyReference), cursor: { ...cursor, cursor: 0 } }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const navigateIntoRight: Operation = ({ state, source, cursor, do_, current, currentPath, parent, parentPath }) => {
  if (
    current.type === "reference" &&
    isCursorAtEnd({ text: current.identifier, cursor: cursor.cursor }) &&
    parentPath &&
    parent?.type === "pi" &&
    Path.last(currentPath) === "from"
  ) {
    return {
      history: do_({ source, cursor: { cursor: 0, path: Path.child(parentPath, "to") } }),
      suggestionIndex: null,
      clipboard: state.clipboard,
    };
  }
  throw new Error();
};

const undo: Operation = ({ state, canUndo, undo }) => {
  if (!canUndo) return state;
  return {
    history: undo(),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const redo: Operation = ({ state, canRedo, redo }) => {
  if (!canRedo) return state;
  return {
    history: redo(),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const suggestionStart: Operation = ({ state }) => {
  if (state.suggestionIndex !== null) return state;
  return {
    history: state.history,
    suggestionIndex: 0,
    clipboard: state.clipboard,
  };
};

const suggestionStop: Operation = ({ state }) => {
  if (state.suggestionIndex === null) throw new Error();
  return {
    history: state.history,
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const suggestionUp: Operation = ({ state, suggestions }) => {
  if (state.suggestionIndex === null) throw new Error();
  if (state.suggestionIndex > 0) {
    return {
      history: state.history,
      suggestionIndex: state.suggestionIndex - 1,
      clipboard: state.clipboard,
    };
  }
  return {
    history: state.history,
    suggestionIndex: suggestions.length - 1,
    clipboard: state.clipboard,
  };
};

const suggestionDown: Operation = ({ state, suggestions }) => {
  if (state.suggestionIndex === null) throw new Error();
  if (state.suggestionIndex > suggestions.length - 2)
    return {
      history: state.history,
      suggestionIndex: 0,
      clipboard: state.clipboard,
    };
  return {
    history: state.history,
    suggestionIndex: state.suggestionIndex + 1,
    clipboard: state.clipboard,
  };
};

const suggestionChoose: Operation = ({ state, do_, cursor, source, suggestions }) => {
  if (state.suggestionIndex === null) throw new Error();
  const suggestion = suggestions[state.suggestionIndex];
  if (!suggestion) throw new Error();
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "reference",
        identifier: suggestion.identifier,
      }),
      cursor: { path: cursor.path, cursor: suggestion.identifier.length },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const suggestionQuickChooseFirst: Operation = ({ state, source, cursor, do_, suggestions }) => {
  const suggestion = suggestions[0];
  if (!suggestion) throw new Error();
  return {
    history: do_({
      source: Source.set(source, cursor.path, {
        type: "reference",
        identifier: suggestion.identifier,
      }),
      cursor: { path: cursor.path, cursor: suggestion.identifier.length },
    }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

const copy: Operation = ({ state, current: underCursor }) => {
  return {
    history: state.history,
    suggestionIndex: null,
    clipboard: underCursor,
  };
};

const paste: Operation = ({ state, source, cursor, do_ }) => {
  if (!state.clipboard) return state;
  return {
    history: do_({ source: Source.set(source, cursor.path, state.clipboard), cursor: { ...cursor, cursor: 0 } }),
    suggestionIndex: null,
    clipboard: state.clipboard,
  };
};

export const operations = {
  resetCursor,
  turnIntoPiFromThenCursorToTo,
  turnIntoPiHeadThenCursorToFrom,
  turnIntoLambdaHeadThenCursorToFrom,
  turnIntoApplicationLeftThenCursorToRight,
  turnIntoLetHeadThenCursorToFrom,
  navigateIntoRight,
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
  paste,
  copy,
};
