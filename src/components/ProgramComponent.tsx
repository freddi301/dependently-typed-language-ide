import * as React from "react";
import { fromProgram, Program } from "../core/program";
import { TermComponent } from "./TermComponent";
import { EditorContext, ProgramContext, styleInputSeamless } from "../App";

export function ProgramComponent({ program }: { program: Program }) {
  const editor = React.useContext(EditorContext);
  return (
    <ProgramContext.Provider value={fromProgram(program)}>
      {Object.entries(program).map(([k, { type, value }]) => {
        return (
          <React.Fragment key={k}>
            <div>
              {k}
              {type && (
                <>
                  {" "}
                  :{" "}
                  <TermComponent
                    term={type}
                    parens={false}
                    path={[k, "type"]}
                  />
                </>
              )}
              {value && (
                <>
                  {" "}
                  ={" "}
                  <TermComponent
                    term={value}
                    parens={false}
                    path={[k, "value"]}
                  />
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}
      <Adder />
    </ProgramContext.Provider>
  );
}

function Adder() {
  const editor = React.useContext(EditorContext);
  const [text, setText] = React.useState("");
  return (
    <input
      style={{ ...styleInputSeamless, width: "100%" }}
      value={text}
      onChange={(event) => {
        if (/^[a-zA-Z0-9]*$/.test(event.currentTarget.value)) {
          setText(event.currentTarget.value);
        }
      }}
      onKeyDown={(event) => {
        const content = editor.program[text];
        if (event.key === "Enter") {
          event.preventDefault();
          setText("");
          editor.action.setProgram({
            ...editor.program,
            [text]: content ?? { type: null, value: null },
          });
        } else if (event.key === ":") {
          event.preventDefault();
          setText("");
          editor.action.setProgram({
            ...editor.program,
            [text]: {
              type: content?.type ?? { type: "reference", reference: "" },
              value: content?.value ?? null,
            },
          });
          editor.action.setCursor([text, "type"]);
        } else if (event.key === "=") {
          event.preventDefault();
          setText("");
          editor.action.setProgram({
            ...editor.program,
            [text]: {
              type: content?.type ?? null,
              value: content?.value ?? { type: "reference", reference: "" },
            },
          });
          editor.action.setCursor([text, "value"]);
        }
      }}
    />
  );
}
