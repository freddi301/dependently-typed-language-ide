import { EditorState } from "./editor";
import { KeyCombination, getKeyCombinationFromKeyCombinationComponents, KeyCombinationComponents } from "./key-combinations";
import { operations } from "./operations";

export function getOperationForKeyCombination(keyCombinationComponents: KeyCombinationComponents, state: EditorState) {
  const { key } = keyCombinationComponents;
  const keyCombination = getKeyCombinationFromKeyCombinationComponents(keyCombinationComponents);
  const list = keyboardOperations[keyCombination] ?? keyboardOperations[key];
  if (!list) return;
  for (const description in list) {
    try {
      return operations[description as keyof typeof list](state);
    } catch (error) {}
  }
  return;
}

export const keyboardOperations: {
  [K in KeyCombination]?: { [K in keyof typeof operations]?: null };
} = {
  Enter: { addEntry: null },
  Escape: { resetCursor: null },
  ":": { addEntryThenCursorToType: null, turnIntoPiFromHeadCursorToFrom: null },
  "-": { turnIntoPiFromThenCursorToTo: null },
  // "shift-:": ["addEntryThenCursorToType"],
};
