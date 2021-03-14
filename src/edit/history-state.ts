export type State<Value> = {
  stack: Array<Value>;
  index: number;
};
export type Action<Value> = { type: "do"; payload: Value } | { type: "undo" } | { type: "redo" };

export function reducer<Value>(state: State<Value>, action: Action<Value>): State<Value> {
  switch (action.type) {
    case "do":
      return {
        stack: [...state.stack.slice(0, state.index + 1), action.payload],
        index: state.index + 1,
      };
    case "undo":
      if (!canUndo(state)) throw new Error();
      return {
        stack: state.stack,
        index: state.index - 1,
      };
    case "redo":
      if (!canRedo(state)) throw new Error();
      return {
        stack: state.stack,
        index: state.index + 1,
      };
  }
}

export function canUndo<Value>(state: State<Value>): boolean {
  return state.index > 0;
}

export function canRedo<Value>(state: State<Value>): boolean {
  return state.index < state.stack.length - 1;
}

export function getCurrent<Value>(state: State<Value>): Value {
  const value = state.stack[state.index];
  if (!value) throw new Error();
  return value;
}
