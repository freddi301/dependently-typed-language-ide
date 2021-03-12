import React from "react";
import { colors } from "../../App";

export type KeyCombination = `${"ctrl-" | ""}${"shift-" | ""}${"alt-" | ""}${All}`;

type AlphaLowerCase =
  | "q"
  | "w"
  | "e"
  | "r"
  | "t"
  | "y"
  | "u"
  | "i"
  | "o"
  | "p"
  | "a"
  | "s"
  | "d"
  | "f"
  | "g"
  | "h"
  | "j"
  | "k"
  | "l"
  | "z"
  | "x"
  | "c"
  | "v"
  | "b"
  | "n"
  | "m";

type AlphaUpperCase =
  | "Q"
  | "W"
  | "E"
  | "R"
  | "T"
  | "Y"
  | "U"
  | "I"
  | "O"
  | "P"
  | "A"
  | "S"
  | "D"
  | "F"
  | "G"
  | "H"
  | "J"
  | "K"
  | "L"
  | "Z"
  | "X"
  | "C"
  | "V"
  | "B"
  | "N"
  | "M";

type Alpha = AlphaLowerCase | AlphaUpperCase;

type Numeric = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Control = "Control" | "Shift" | "Alt";

type Arrow = `Arrow${"Left" | "Up" | "Right" | "Down"}`;

type Punctuation = ":" | "." | "," | ";";

type Other = "Enter" | "Escape" | "Backspace" | "Delete" | "-";

type All = Alpha | Numeric | Punctuation | Control | Arrow | Other;

export type KeyCombinationComponents = { ctrl: boolean; shift: boolean; alt: boolean; key: All };

export function getKeyCombinationComponentsFromEvent(event: KeyboardEvent): KeyCombinationComponents {
  return { ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, key: event.key as All };
}

function getKeyCombinationComponentsFromKeyCombination(keyCombination: KeyCombination): KeyCombinationComponents {
  const match = keyCombination.match(/(ctrl-)?(shift-)?(alt-)?(.*)/);
  if (!match) throw new Error();
  if (!match[4]) throw new Error();
  return {
    ctrl: match[1] === "ctrl-",
    shift: match[2] === "shift-",
    alt: match[3] === "alt-",
    key: match[4] as All,
  };
}

export function getKeyCombinationFromKeyCombinationComponents({ ctrl, shift, alt, key }: KeyCombinationComponents): KeyCombination {
  return `${ctrl ? "ctrl-" : ""}${shift ? "shift-" : ""}${alt ? "alt-" : ""}${key}` as KeyCombination;
}

export function ViewKeyCombination({ keyCombination }: { keyCombination: KeyCombination }) {
  const { ctrl, shift, alt, key } = getKeyCombinationComponentsFromKeyCombination(keyCombination);
  const style: React.CSSProperties = {
    border: `1px solid ${colors.white}`,
    borderRadius: "4px",
    backgroundColor: colors.backgroundDark,
    margin: "0 2px",
    padding: "0 0.5ch",
  };
  return (
    <>
      {ctrl && <span style={style}>ctrl</span>}
      {shift && <span style={style}>shift</span>}
      {alt && <span style={style}>alt</span>}
      <span style={style}>{key}</span>
    </>
  );
}
