import * as React from "react";
import { TermPath } from "../core/path";
import { Arrow } from "../core/program";
import { Hoverable } from "./Hoverable";
import { Details } from "./Details";
import { ProgramContext, colors } from "../App";
import { TermComponent } from "./TermComponent";

export function ArrowComponent({
  term,
  parens,
  path,
}: {
  term: Arrow;
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
          {term.head ? (
            <>
              ({term.head} :{" "}
              {
                <TermComponent
                  term={term.from}
                  parens={false}
                  path={[...path, "from"]}
                />
              }
              )
            </>
          ) : (
            <TermComponent
              term={term.from}
              parens={true}
              path={[...path, "from"]}
            />
          )}{" "}
          <span
            onMouseOver={() => setHasMouseOver(true)}
            onMouseLeave={() => setHasMouseOver(false)}
          >
            {"->"}
          </span>{" "}
          <TermComponent term={term.to} parens={false} path={[...path, "to"]} />
          {parens && ")"}
        </span>
      }
      body={<Details term={term} />}
    />
  );
}
