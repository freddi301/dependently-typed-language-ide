import * as Editor from "./editor-state";
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
  Enter: { suggestionChoose: null, turnIntoType: null, suggestionQuickChooseFirst: null },
  Escape: { suggestionStop: null, resetCursor: null },
  ":": { turnIntoPiHeadThenCursorToFrom: null },
  "=": { turnIntoLambdaHeadThenCursorToFrom: null },
  "-": { turnIntoPiFromThenCursorToTo: null },
  " ": { turnIntoApplicationLeftThenCursorToRight: null },
  ";": { turnIntoLetHeadThenCursorToFrom: null },
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
  onEditor: Editor.OnEditor
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
      operations[description as keyof typeof list](onEditor);
      return description as keyof typeof list;
    } catch (error) {}
  }
  return;
}

export function getPossibleKeyboardOperations(onEditor: Editor.OnEditor) {
  return Object.entries(keyboardOperations).flatMap(([keyCombination]) => {
    const keyCombinationComponents = getKeyCombinationComponentsFromKeyCombination(keyCombination as KeyCombination);
    const operation = getOperationForKeyCombination(keyCombinationComponents, onEditor);
    if (!operation) return [];
    return { keyCombination: keyCombination as KeyCombination, operation };
  });
}
