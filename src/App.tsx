import React, { useState } from "react";
import * as Composer from "./components/Composer";

const Person = Composer.object({
  name: Composer.string,
  surname: Composer.string,
  age: Composer.number,
  alive: Composer.boolean,
  toys: Composer.array(Composer.string),
});

const People = Composer.array(Person);

export default function App() {
  const [state, setState] = useState<Composer.TOfCodec<typeof People["codec"]>>(
    []
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
      <People.EditableComponent value={state} onChange={setState} />
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
