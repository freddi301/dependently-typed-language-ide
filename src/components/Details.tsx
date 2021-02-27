import * as React from "react";
import { Term } from "../core/program";
import { ProgramContext, colors } from "../App";
import { TermComponent } from "./TermComponent";

export function Details({ term }: { term: Term }) {
  const { getValue, getType, checks } = React.useContext(ProgramContext);
  const type = getType(term);
  const value = getValue(term);
  const mismatchedArgument = checks.mismatchedArgument.get(term);
  const isNotAFunction = checks.isNotAFunction.get(term);
  return (
    <>
      <div>
        : {type && <TermComponent term={type} parens={false} path={["", ""]} />}
      </div>
      <div>
        ={" "}
        {value && <TermComponent term={value} parens={false} path={["", ""]} />}
      </div>
      {mismatchedArgument && (
        <>
          <div style={{ color: colors.red }}>
            the type of the argument is not compatible
          </div>
          <div style={{ paddingLeft: "2ch" }}>
            expected:{" "}
            <TermComponent
              term={mismatchedArgument.expected}
              parens={false}
              path={["", ""]}
            />
          </div>
          <div style={{ paddingLeft: "2ch" }}>
            detected:{" "}
            <TermComponent
              term={mismatchedArgument.detected}
              parens={false}
              path={["", ""]}
            />
          </div>
        </>
      )}
      {isNotAFunction && (
        <>
          <div style={{ color: colors.red }}>is not a function</div>
          <div style={{ paddingLeft: "2ch" }}>
            detected:{" "}
            <TermComponent
              term={isNotAFunction.detected}
              parens={false}
              path={["", ""]}
            />
          </div>
        </>
      )}
    </>
  );
}
