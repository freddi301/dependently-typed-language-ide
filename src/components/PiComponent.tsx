import { TermComponent } from "./TermComponent";
import { Pi } from "../core/program";
import { isSamePath, setByRelativePath, TermPath } from "../core/path";
import { useContext } from "react";
import { colors, EditorContext, styleInputSeamless } from "../App";

export function PiComponent({
  term,
  path,
  parens,
}: {
  term: Pi;
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
                  type: "pi",
                  head: event.currentTarget.value,
                  from: term.from,
                  to: term.to,
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
      />
      <span
        onClick={() => {
          setState({ ...state, cursor: path });
        }}
      >
        {" "}
        :{" "}
      </span>
      <TermComponent term={term.from} path={[...path, "from"]} parens={false} />
      )
      <span
        onClick={() => {
          setState({ ...state, cursor: path });
        }}
      >
        {" -> "}
      </span>
      {term.to.type === "pi" ? (
        <PiComponent term={term.to} path={[...path, "to"]} parens={false} />
      ) : (
        <TermComponent term={term.to} path={[...path, "to"]} parens={true} />
      )}
      {parens && ")"}
    </span>
  );
}
