import { TermComponent } from "./TermComponent";
import { Application } from "../core/program";
import { isSamePath, TermPath } from "../core/path";
import { useContext } from "react";
import { colors, EditorContext } from "../App";

export function ApplicationComponent({
  term,
  path,
  parens,
}: {
  term: Application;
  path: TermPath;
  parens: boolean;
}) {
  const { state, setState } = useContext(EditorContext);
  const { source, cursor } = state;
  const hasCursor = isSamePath(path, cursor);
  return (
    <span
      style={{
        backgroundColor: hasCursor ? colors.backgroundDark : "transparent",
      }}
    >
      {parens && "("}
      {term.left.type === "application" ? (
        <ApplicationComponent
          term={term.left}
          path={[...path, "left"]}
          parens={false}
        />
      ) : (
        <TermComponent
          term={term.left}
          path={[...path, "left"]}
          parens={true}
        />
      )}
      <span
        onClick={() => {
          setState({ ...state, cursor: path });
        }}
      >
        {" "}
      </span>
      <TermComponent
        term={term.right}
        path={[...path, "right"]}
        parens={true}
      />
      {parens && ")"}
    </span>
  );
}
