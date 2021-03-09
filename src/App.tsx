import React, { useMemo, useState } from "react";
import * as Composer from "./components/Composer";
import * as SimpleLazy from "./components/SimpleLazy";

export type SourceTerm =
  | { type: "reference"; payload: string }
  | { type: "application"; payload: { left: SourceTerm; right: SourceTerm } }
  | { type: "lambda"; payload: { head: string; body: SourceTerm } };

const SourceTerm: Composer.Magic<SourceTerm> = Composer.enumeration(
  {
    reference: Composer.string,
    get application() {
      return Composer.object({
        left: SourceTerm,
        right: SourceTerm,
      });
    },
    get lambda() {
      return Composer.object({
        head: Composer.string,
        body: SourceTerm,
      });
    },
  },
  "reference"
);

export default function App() {
  const [state, setState] = useState<SourceTerm>(SourceTerm.default);
  const evaluated = useMemo(() => {
    try {
      return SimpleLazy.evaluate(state);
    } catch (error) {
      return null;
    }
  }, [state]);
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: colors.background,
        color: colors.white,
        whiteSpace: "pre",
      }}
    >
      <SourceTerm.EditableComponent value={state} onChange={setState} />
      {evaluated && (
        <SourceTerm.EditableComponent value={evaluated} onChange={() => {}} />
      )}
      <pre>{JSON.stringify(evaluated)}</pre>
    </div>
  );
}

export const colors = {
  background: "#282c34",
  backgroundDark: "#21252b",
  backgroundLight: "#2c313c",
  backgroundHover: "#292d35",
  backgroundFocus: "#2c313a",
  white: "#abb2bf",
  gray: "#5c6370",
  blue: "#61afef",
  red: "#e06c75",
  yellow: "#e5c07b",
  green: "#98c379",
  purple: "#c678dd",
};

export const styleInputSeamless: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: "inherit",
  font: "inherit",
  fontSize: "inherit",
  padding: 0,
  margin: 0,
  outline: "none",
};
