import { Term } from "../core/program";
import { LambdaComponent } from "./LambdaComponent";
import { PiComponent } from "./PiComponent";
import { ApplicationComponent } from "./ApplicationComponent";
import { ReferenceComponent } from "./ReferenceComponent";
import { TermPath } from "../core/path";

export function TermComponent({
  term,
  path,
  parens,
}: {
  term: Term;
  path: TermPath;
  parens: boolean;
}) {
  switch (term.type) {
    case "reference":
      return <ReferenceComponent term={term} path={path} />;
    case "application":
      return <ApplicationComponent term={term} path={path} parens={parens} />;
    case "pi":
      return <PiComponent term={term} path={path} parens={parens} />;
    case "lambda":
      return <LambdaComponent term={term} path={path} parens={parens} />;
  }
}
