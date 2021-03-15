import { State } from "./editor-state";
import {
  KeyCombination,
  getKeyCombinationFromKeyCombinationComponents,
  KeyCombinationComponents,
  getKeyCombinationComponentsFromKeyCombination,
} from "./key-combinations";
import { operations } from "./operations";

export const keyboardOperations: {
  [K in KeyCombination]?: { [K in keyof typeof operations]?: null };
} = {
  // operation name order is important
  Enter: { suggestionChoose: null, turnIntoType: null, suggestionQuickChooseFirst: null, addEntry: null },
  Escape: { suggestionStop: null, resetCursor: null },
  ":": { moveCursorToType: null, addEntryThenCursorToType: null, turnIntoPiHeadThenCursorToFrom: null },
  "=": { moveCursorToValue: null, addEntryThenCursorToValue: null, turnIntoLambdaHeadThenCursorToFrom: null },
  "-": { turnIntoPiFromThenCursorToTo: null },
  " ": { turnIntoApplicationLeftThenCursorToRight: null },
  ArrowLeft: { navigateLeft: null },
  ArrowUp: { suggestionUp: null, navigateUp: null },
  ArrowDown: { suggestionDown: null, navigateDown: null },
  ArrowRight: { navigateRight: null },
  Tab: { navigateIntoRight: null },
  Backspace: { replaceWithEmptyReference: null },
  "ctrl-z": { undo: null },
  "ctrl-shift-z": { redo: null },
  "ctrl- ": { suggestionStart: null },
  "ctrl-v": { paste: null },
  "ctrl-c": { copy: null },
};

export function getOperationForKeyCombination(
  keyCombinationComponents: KeyCombinationComponents,
  state: State
): keyof typeof operations | undefined {
  const { key } = keyCombinationComponents;
  const keyCombination = getKeyCombinationFromKeyCombinationComponents(keyCombinationComponents);
  const lowerCaseKeyCombination = getKeyCombinationFromKeyCombinationComponents({
    ...keyCombinationComponents,
    key: key.toLocaleLowerCase() as any,
  });
  const list = keyboardOperations[keyCombination] ?? keyboardOperations[lowerCaseKeyCombination] ?? keyboardOperations[key];
  if (!list) return;
  for (const description in list) {
    try {
      operations[description as keyof typeof list](state);
      return description as keyof typeof list;
    } catch (error) {}
  }
  return;
}

export function getPossibleKeyboardOperations(state: State) {
  return Object.entries(keyboardOperations).flatMap(([keyCombination]) => {
    const keyCombinationComponents = getKeyCombinationComponentsFromKeyCombination(keyCombination as KeyCombination);
    const operation = getOperationForKeyCombination(keyCombinationComponents, state);
    if (!operation) return [];
    return { keyCombination: keyCombination as KeyCombination, operation };
  });
}
