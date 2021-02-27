import * as React from "react";
import { getByPath, isSamePath, setByPath, TermPath } from "../core/path";
import { Application } from "../core/program";
import { Hoverable } from "./Hoverable";
import { Details } from "./Details";
import { ProgramContext, colors, EditorContext } from "../App";
import { TermComponent } from "./TermComponent";

export function ApplicationComponent({
  term,
  parens,
  path,
}: {
  term: Application;
  parens: boolean;
  path: TermPath;
}) {
  const editor = React.useContext(EditorContext);
  const { hasError, getType } = React.useContext(ProgramContext);
  const [hasMouseOver, setHasMouseOver] = React.useState(false);
  const hasCursor = isSamePath(path, editor.state.cursor);
  const type = getType(term);
  const hasType = type !== null;
  React.useLayoutEffect(() => {
    if (!hasCursor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const parentPath = path.slice(0, -1);
      const leafPath = path[path.length - 1];
      const parent = getByPath(parentPath, editor.program);
      if (event.key === " ") {
        debugger;
        if (parent?.type === "application" && leafPath === "right") {
          event.preventDefault();
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
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hasCursor]);
  return (
    <Hoverable
      hasMouseOver={hasMouseOver}
      head={
        <span
          style={{
            backgroundColor:
              hasMouseOver || hasCursor ? colors.backgroundDark : "",
            borderBottom: hasError(term)
              ? `2px solid ${colors.red}`
              : !hasType
              ? `2px solid ${colors.gray}`
              : "2px solid transparent",
            marginBottom: "-2px",
          }}
        >
          {parens && "("}
          <TermComponent
            term={term.left}
            parens={term.left.type !== "application"}
            path={[...path, "left"]}
          />
          <span
            onMouseOver={() => setHasMouseOver(true)}
            onMouseLeave={() => setHasMouseOver(false)}
            onClick={() => editor.action.setCursor(path)}
          >
            {" "}
          </span>
          <TermComponent
            term={term.right}
            parens={true}
            path={[...path, "right"]}
          />
          {parens && ")"}
        </span>
      }
      body={<Details term={term} />}
    />
  );
}
