import { EditorState } from "./editor-state";
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
  Enter: { addEntry: null, turnIntoType: null },
  Escape: { resetCursor: null },
  ":": { moveCursorToType: null, addEntryThenCursorToType: null, turnIntoPiHeadThenCursorToFrom: null },
  "=": { moveCursorToValue: null, addEntryThenCursorToValue: null, turnIntoLambdaHeadThenCursorToFrom: null },
  "-": { turnIntoPiFromThenCursorToTo: null },
  " ": { turnIntoApplicationLeftThenCursorToRight: null },
  ArrowLeft: { navigateLeft: null },
  ArrowUp: { navigateUp: null },
  ArrowDown: { navigateDown: null },
  ArrowRight: { navigateRight: null },
  Tab: { navigateIntoRight: null },
  Backspace: { replaceWithEmptyReference: null },
};

export function getOperationForKeyCombination(
  keyCombinationComponents: KeyCombinationComponents,
  state: EditorState
): keyof typeof operations | undefined {
  const { key } = keyCombinationComponents;
  const keyCombination = getKeyCombinationFromKeyCombinationComponents(keyCombinationComponents);
  const list = keyboardOperations[keyCombination] ?? keyboardOperations[key];
  if (!list) return;
  for (const description in list) {
    try {
      operations[description as keyof typeof list](state);
      return description as keyof typeof list;
    } catch (error) {}
  }
  return;
}

export function getPossibleKeyboardOperations(state: EditorState) {
  return Object.entries(keyboardOperations).flatMap(([keyCombination]) => {
    const keyCombinationComponents = getKeyCombinationComponentsFromKeyCombination(keyCombination as KeyCombination);
    const operation = getOperationForKeyCombination(keyCombinationComponents, state);
    if (!operation) return [];
    return { keyCombination: keyCombination as KeyCombination, operation };
  });
}
