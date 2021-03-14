export type State<Value> = {
  history: Array<Value>;
  index: number;
};
export type Action<Value> = { type: "do"; payload: Value } | { type: "undo" } | { type: "redo" };

export function reducer<Value>(state: State<Value>, action: Action<Value>): State<Value> {
  switch (action.type) {
    case "do":
      return {
        history: state.history.slice(0, state.index),
        index: state.index + 1,
      };
    case "undo":
      return {
        history: state.history,
        index: state.index - 1,
      };
    case "redo":
      return {
        history: state.history,
        index: state.index + 1,
      };
  }
}

export function canUndo<Value>(state: State<Value>): boolean {
  return state.index > 0;
}

export function canRedo<Value>(state: State<Value>): boolean {
  return state.index < state.history.length - 2;
}

export function getValue<Value>(state: State<Value>): Value {
  const value = state.history[state.index];
  if (!value) throw new Error();
  return value;
}
