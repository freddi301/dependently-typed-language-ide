import * as React from "react";
import { TermPath } from "../core/path";
import { Application } from "../core/program";
import { Hoverable } from "./Hoverable";
import { Details } from "./Details";
import { ProgramContext, colors } from "../App";
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
  const { hasError } = React.useContext(ProgramContext);
  const [hasMouseOver, setHasMouseOver] = React.useState(false);
  return (
    <Hoverable
      hasMouseOver={hasMouseOver}
      head={
        <span
          style={{
            backgroundColor: hasMouseOver ? colors.backgroundDark : "",
            borderBottom: hasError(term) ? `2px solid ${colors.red}` : "",
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
