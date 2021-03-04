import React, { useState } from "react";
import * as TextTree from "./components/TextTree";

export default function App() {
  const [maxColumns, setMaxColumns] = useState(20);
  const params = {
    indentation: "  ",
    separator: ", ",
    parenthesis: { left: "(", right: ")" },
    maxColumns,
  };
  const lines = TextTree.make(params).getLines(
    TextTree.textArrayToTree([
      "a",
      "b",
      "c",
      ["d", "e"],
      "f",
      ["g", ["h", ["i", ["j", "k"]]]],
      [["l", "m", "n", "o"], "p", ["q", "r", ["s", "t"]]],
      "u",
    ]),
    0
  );
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
      <input
        type="number"
        value={maxColumns}
        onChange={(event) => setMaxColumns(Number(event.currentTarget.value))}
      />
      <TextTree.ViewLines lines={lines} params={params} />
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
