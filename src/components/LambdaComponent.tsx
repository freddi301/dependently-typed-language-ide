import { TermComponent } from "./TermComponent";
import { Lambda } from "../core/program";
import { isSamePath, setByRelativePath, TermPath } from "../core/path";
import { useContext } from "react";
import { colors, EditorContext, styleInputSeamless } from "../App";

export function LambdaComponent({
  term,
  path,
  parens,
}: {
  term: Lambda;
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
      (
      <input
        value={term.head}
        onChange={(event) => {
          setState({
            ...state,
            source:
              setByRelativePath(
                path,
                {
                  type: "lambda",
                  head: event.currentTarget.value,
                  from: term.from,
                  body: term.body,
                },
                source
              ) ?? source,
          });
        }}
        style={{
          ...styleInputSeamless,
          width: `${term.head.length || 1}ch`,
          backgroundColor: hasCursor ? colors.backgroundDark : "transparent",
        }}
        onClick={() => {
          setState({ ...state, cursor: path });
        }}
      />{" "}
      :{" "}
      <TermComponent term={term.from} path={[...path, "from"]} parens={false} />
      )
      <span
        onClick={() => {
          setState({ ...state, cursor: path });
        }}
      >
        {" => "}
      </span>
      <TermComponent term={term.body} path={[...path, "body"]} parens={false} />
      {parens && ")"}
    </span>
  );
}
