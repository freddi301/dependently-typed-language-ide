import { EditorState } from "./editor";
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
  Enter: { addEntry: null },
  Escape: { resetCursor: null },
  ":": { addEntryThenCursorToType: null, turnIntoPiHeadThenCursorToFrom: null },
  "-": { turnIntoPiFromThenCursorToTo: null },
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
