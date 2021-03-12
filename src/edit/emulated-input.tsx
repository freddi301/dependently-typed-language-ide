import { colors } from "../App";
import { KeyCombinationComponents } from "./key-combinations";

export function EmulatedInput({ state: { text, cursor } }: { state: EmulatedInputState }) {
  return (
    <span style={{ display: "inline-block", position: "relative", height: "1rem" }}>
      {text}
      <span
        style={{
          position: "absolute",
          top: "0px",
          left: `${cursor}ch`,
          backgroundColor: colors.blue,
          width: "2px",
          height: "1.3rem",
        }}
      />
    </span>
  );
}

export type EmulatedInputState = { text: string; cursor: number };

export function emulatedInputReducer({ text, cursor }: EmulatedInputState, { key }: KeyCombinationComponents): EmulatedInputState {
  if (key.length === 1) {
    return {
      cursor: cursor + 1,
      text: text.slice(0, cursor) + key + text.slice(cursor),
    };
  } else if (key === "ArrowLeft" && cursor > 0) {
    return { text, cursor: cursor - 1 };
  } else if (key === "ArrowRight" && cursor < text.length) {
    return { text, cursor: cursor + 1 };
  } else if (key === "Backspace" && cursor > 0) {
    return {
      text: text.slice(0, cursor - 1) + text.slice(cursor),
      cursor: cursor - 1,
    };
  } else if (key === "Delete" && cursor < text.length) {
    return {
      text: text.slice(0, cursor) + text.slice(cursor + 1),
      cursor,
    };
  } else return { text, cursor };
}
