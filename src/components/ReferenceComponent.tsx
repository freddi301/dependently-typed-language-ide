import { useContext } from "react";
import { Reference } from "../core/program";
import { colors, EditorContext, styleInputSeamless } from "../App";
import { isSamePath, setByRelativePath, TermPath } from "../core/path";

export function ReferenceComponent({
  term,
  path,
}: {
  term: Reference;
  path: TermPath;
}) {
  const { state, setState } = useContext(EditorContext);
  const { source, cursor } = state;
  const hasCursor = isSamePath(path, cursor);
  return (
    <input
      value={term.reference}
      onChange={(event) => {
        setState({
          ...state,
          source:
            setByRelativePath(
              path,
              {
                type: "reference",
                reference: event.currentTarget.value,
                t: undefined,
              },
              source
            ) ?? source,
        });
      }}
      style={{
        ...styleInputSeamless,
        width: `${term.reference.length || 1}ch`,
        backgroundColor: hasCursor ? colors.backgroundDark : "transparent",
      }}
      onClick={() => {
        setState({ ...state, cursor: path });
      }}
    />
  );
}
