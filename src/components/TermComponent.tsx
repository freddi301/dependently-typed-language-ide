import * as React from "react";
import { TermPath } from "../core/path";
import { Term } from "../core/program";
import { ReferenceComponent } from "./ReferenceComponent";
import { ArrowComponent } from "./ArrowComponent";
import { ApplicationComponent } from "./ApplicationComponent";

export function TermComponent({
  term,
  parens,
  path,
}: {
  term: Term;
  parens: boolean;
  path: TermPath;
}) {
  switch (term.type) {
    case "reference":
      return <ReferenceComponent term={term} path={path} />;
    case "arrow":
      return <ArrowComponent term={term} parens={parens} path={path} />;
    case "application": {
      return <ApplicationComponent term={term} parens={parens} path={path} />;
    }
  }
}
