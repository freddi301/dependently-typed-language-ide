import * as React from "react";
import { isSamePath, setByPath, TermPath, getByPath } from "../core/path";
import { Reference } from "../core/program";
import { Hoverable } from "./Hoverable";
import { Details } from "./Details";
import {
  EditorContext,
  ProgramContext,
  styleInputSeamless,
  colors,
} from "../App";

export function ReferenceComponent({
  term,
  path,
}: {
  term: Reference;
  path: TermPath;
}) {
  const editor = React.useContext(EditorContext);
  const { hasError } = React.useContext(ProgramContext);
  const [hasMouseOver, setHasMouseOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const hasCursor = isSamePath(path, editor.state.cursor);
  React.useLayoutEffect(() => {
    if (hasCursor) inputRef.current?.focus();
  }, [hasCursor]);
  return (
    <Hoverable
      hasMouseOver={hasMouseOver}
      head={
        <input
          ref={inputRef}
          style={{
            ...styleInputSeamless,
            width: `${term.reference.length || 1}ch`,
            backgroundColor: hasMouseOver
              ? colors.backgroundDark
              : styleInputSeamless.backgroundColor,
            borderBottom: hasError(term) ? `2px solid ${colors.red}` : "none",
          }}
          onMouseOver={() => setHasMouseOver(true)}
          onMouseLeave={() => setHasMouseOver(false)}
          value={term.reference}
          onChange={(event) => {
            if (/^[a-zA-Z0-9?]*$/.test(event.currentTarget.value)) {
              const program = setByPath(
                path,
                {
                  type: "reference",
                  reference: event.currentTarget.value,
                },
                editor.program
              );
              if (program) {
                editor.action.setProgram(program);
              }
            }
          }}
          onKeyDown={(event) => {
            const parentPath = path.slice(0, -1);
            const leafPath = path[path.length - 1];
            const parent = getByPath(parentPath, editor.program);
            if (event.key === " ") {
              event.preventDefault();
              if (parent?.type === "application" && leafPath === "right") {
                const program = setByPath(
                  parentPath,
                  {
                    type: "application",
                    left: parent,
                    right: { type: "reference", reference: "" },
                  },
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor([...parentPath, "right"]);
                }
              } else {
                const program = setByPath(
                  path,
                  {
                    type: "application",
                    left: term,
                    right: { type: "reference", reference: "" },
                  },
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor([...path, "right"]);
                }
              }
            } else if (event.key === "Backspace" && term.reference === "") {
              if (parent?.type === "application" && leafPath === "right") {
                event.preventDefault();
                const program = setByPath(
                  parentPath,
                  parent.left,
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor(parentPath);
                }
              }
            } else if (event.key === "-") {
              event.preventDefault();
              if (parent?.type === "arrow" && leafPath === "from") {
                const program = setByPath(
                  parentPath,
                  {
                    type: "arrow",
                    from: term,
                    to: {
                      type: "arrow",
                      from: { type: "reference", reference: "" },
                      to: parent.to,
                    },
                  },
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor([...parentPath, "to", "from"]);
                }
              } else {
                const program = setByPath(
                  path,
                  {
                    type: "arrow",
                    from: term,
                    to: { type: "reference", reference: "" },
                  },
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor([...path, "to"]);
                }
              }
            } else if (event.key === "Backspace" && term.reference === "") {
              if (parent?.type === "application" && leafPath === "right") {
                event.preventDefault();
                const program = setByPath(
                  parentPath,
                  parent.left,
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor(parentPath);
                }
              }
            } else if (event.key === "Enter") {
              editor.action.setCursor([]);
            } else if (event.key === ":") {
              const program = setByPath(
                path,
                {
                  type: "arrow",
                  head: term.reference,
                  from: { type: "reference", reference: "" },
                  to: { type: "reference", reference: "" },
                },
                editor.program
              );
              if (program) {
                editor.action.setProgram(program);
                editor.action.setCursor([...path, "from"]);
              }
            } else if (event.key === "ArrowRight") {
              if (parent?.type === "arrow" && leafPath === "from") {
                editor.action.setCursor([...parentPath, "to"]);
              }
            }
          }}
          onClick={() => {
            editor.action.setCursor(path);
          }}
        />
      }
      body={<Details term={term} />}
    />
  );
}
