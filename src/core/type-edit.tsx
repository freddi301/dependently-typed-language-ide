import React, { useEffect, useState } from "react";
import { colors, styleInputSeamless } from "../App";
import { SourceTerm } from "./type";

type SourceTermPath = Array<string>;

function isEqualPath(a: SourceTermPath, b: SourceTermPath): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function getByPath(term: SourceTerm, path: SourceTermPath): SourceTerm {
  const [head, ...tail] = path;
  if (head === undefined) {
    return term;
  }
  if (head in term) {
    return getByPath((term as any)[head], tail);
  }
  throw new Error("invalid path");
}

function setByPath(
  term: SourceTerm,
  path: SourceTermPath,
  new_: SourceTerm
): SourceTerm {
  const [head, ...tail] = path;
  if (head === undefined) {
    return new_;
  }
  if (head in term) {
    return { ...term, [head]: setByPath((term as any)[head], tail, new_) };
  }
  throw new Error("invalid path");
}

function getByEntryPath(
  source: Record<string, SourceTerm>,
  { entry, path }: { entry: string; path: SourceTermPath }
): SourceTerm {
  const term = source[entry];
  if (!term) throw new Error();
  return getByPath(term, path);
}

function setByEntryPath(
  source: Record<string, SourceTerm>,
  { entry, path }: { entry: string; path: SourceTermPath },
  new_: SourceTerm
): Record<string, SourceTerm> {
  if (path.length === 0) {
    return { ...source, [entry]: new_ };
  }
  const term = source[entry];
  if (!term) throw new Error();
  return { ...source, [entry]: setByPath(term, path, new_) };
}

type EditorState = {
  source: Record<string, SourceTerm>;
  cursor: { entry: string; path: SourceTermPath } | null;
};

export function TermEditor() {
  const [state, setState] = useState<EditorState>({
    source: { main: { type: "reference", identifier: "" } },
    cursor: null,
  });
  const termUnderCursor =
    state.cursor &&
    state.source[state.cursor.entry] &&
    getByEntryPath(state.source, state.cursor);
  const choices = getChoices(state, setState);
  const [showChoices, setShowChoices] = useState(false);
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const newIndex =
          choiceIndex === null || choiceIndex > choices.length - 2
            ? 0
            : choiceIndex + 1;
        setChoiceIndex(newIndex);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const newIndex =
          choiceIndex === null || choiceIndex === 0
            ? choices.length - 1
            : choiceIndex - 1;
        setChoiceIndex(newIndex);
      } else if (
        event.key === "Enter" &&
        choiceIndex !== null &&
        choices[choiceIndex]
      ) {
        event.preventDefault();
        setShowChoices(false);
        choices[choiceIndex]?.onSelect();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (showChoices) {
          setShowChoices(false);
        } else {
          setState({ ...state, cursor: null });
        }
      } else if (event.key === " " && event.ctrlKey) {
        event.preventDefault();
        setShowChoices(true);
      } else if (
        event.key === ":" &&
        state.cursor &&
        termUnderCursor?.type === "reference"
      ) {
        event.preventDefault();
        setState({
          ...state,
          source: setByEntryPath(state.source, state.cursor, {
            type: "pi",
            head: termUnderCursor.identifier,
            from: { type: "reference", identifier: "" },
            to: { type: "reference", identifier: "" },
          }),
          cursor: {
            entry: state.cursor.entry,
            path: [...state.cursor.path, "from"],
          },
        });
      } else if (
        event.key === "-" &&
        state.cursor &&
        termUnderCursor?.type === "reference"
      ) {
        event.preventDefault();
        setState({
          ...state,
          source: setByEntryPath(state.source, state.cursor, {
            type: "pi",
            head: "",
            from: termUnderCursor,
            to: { type: "reference", identifier: "" },
          }),
          cursor: {
            entry: state.cursor.entry,
            path: [...state.cursor.path, "to"],
          },
        });
      }
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [choiceIndex, choices, state, termUnderCursor]);
  const wrapAutocompletion = (
    hasCursor: boolean,
    children: React.ReactNode
  ) => {
    return (
      <span style={{ display: "inline-block", position: "relative" }}>
        {children}
        {hasCursor && (
          <div
            hidden={!showChoices}
            style={{ position: "absolute", left: 0, top: "calc(100% + 2px)" }}
          >
            {choices.map((choice, index) => {
              const isSelected = index === choiceIndex;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: isSelected
                      ? colors.backgroundLight
                      : colors.backgroundDark,
                    padding: "0 1ch",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    choice.onSelect();
                    setShowChoices(false);
                  }}
                  onMouseOver={() => {
                    setChoiceIndex(index);
                  }}
                >
                  {choice.description}
                </div>
              );
            })}
          </div>
        )}
      </span>
    );
  };
  function viewTerm(
    term: SourceTerm,
    parens: boolean,
    { entry, path }: { entry: string; path: SourceTermPath }
  ) {
    const hasCursor =
      state.cursor && state.cursor.entry === entry
        ? isEqualPath(path, state.cursor.path)
        : false;
    const borderBottom = hasCursor ? `2px solid ${colors.blue}` : "none";
    switch (term.type) {
      case "type":
        return wrapAutocompletion(
          hasCursor,
          <span
            style={{ color: colors.purple, borderBottom }}
            onClick={() => {
              setState({ ...state, cursor: { entry, path } });
            }}
            tabIndex={0}
            onFocus={() => {
              setState({ ...state, cursor: { entry, path } });
            }}
          >
            type<sub>{term.universe}</sub>
          </span>
        );
      case "reference":
        return wrapAutocompletion(
          hasCursor,
          <input
            value={term.identifier}
            onChange={(event) => {
              setState({
                ...state,
                source: setByEntryPath(
                  state.source,
                  { entry, path },
                  {
                    ...term,
                    identifier: event.currentTarget.value,
                  }
                ),
              });
            }}
            onClick={() => {
              setState({ ...state, cursor: { entry, path } });
            }}
            onFocus={() => {
              setState({ ...state, cursor: { entry, path } });
              setShowChoices(true);
            }}
            style={{
              ...styleInputSeamless,
              width: `${term.identifier.length || 1}ch`,
              color: colors.white,
              borderBottom:
                term.identifier === "" && !hasCursor
                  ? `2px solid ${colors.gray}`
                  : borderBottom,
            }}
          />
        );
      case "application":
        return wrapAutocompletion(
          hasCursor,
          <span style={{ borderBottom }}>
            {parens && (
              <span
                style={{ color: colors.purple }}
                onClick={() => {
                  setState({ ...state, cursor: { entry, path } });
                }}
              >
                (
              </span>
            )}
            {viewTerm(term.left, term.left.type !== "application", {
              entry,
              path: [...path, "left"],
            })}
            <span
              onClick={() => {
                setState({ ...state, cursor: { entry, path } });
              }}
            >
              {" "}
            </span>
            {viewTerm(term.right, true, { entry, path: [...path, "right"] })}
            {parens && (
              <span
                style={{ color: colors.purple }}
                onClick={() => {
                  setState({ ...state, cursor: { entry, path } });
                }}
              >
                )
              </span>
            )}
          </span>
        );
      case "pi":
        return wrapAutocompletion(
          hasCursor,
          <span style={{ borderBottom }}>
            {parens && (
              <span
                style={{ color: colors.purple }}
                onClick={() => {
                  setState({ ...state, cursor: { entry, path } });
                }}
              >
                (
              </span>
            )}
            {term.head || hasCursor ? (
              <>
                <span style={{ color: colors.purple }}>(</span>
                <input
                  value={term.head}
                  onChange={(event) => {
                    setState({
                      ...state,
                      source: setByEntryPath(
                        state.source,
                        { entry, path },
                        {
                          ...term,
                          head: event.currentTarget.value,
                        }
                      ),
                    });
                  }}
                  onFocus={() => {
                    setShowChoices(false);
                  }}
                  style={{
                    ...styleInputSeamless,
                    width: `${term.head.length || 1}ch`,
                  }}
                />
                {" : "}
                {viewTerm(term.from, false, { entry, path: [...path, "from"] })}
                <span style={{ color: colors.purple }}>)</span>
              </>
            ) : (
              viewTerm(term.from, false, { entry, path: [...path, "from"] })
            )}
            <span
              style={{ color: colors.purple }}
              onClick={() => {
                setState({ ...state, cursor: { entry, path } });
              }}
            >
              {" -> "}
            </span>
            {viewTerm(term.to, false, { entry, path: [...path, "to"] })}
            {parens && (
              <span
                style={{ color: colors.purple }}
                onClick={() => {
                  setState({ ...state, cursor: { entry, path } });
                }}
              >
                )
              </span>
            )}
          </span>
        );
    }
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gridTemplateRows: "1fr",
        height: "100%",
      }}
    >
      <div style={{ gridColumn: 1, gridRow: 1 }}></div>
      <div
        style={{
          gridColumn: 2,
          gridRow: 1,
          position: "relative",
          overflow: "scroll",
        }}
      >
        <div
          style={{ position: "absolute" }}
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setState({ ...state, cursor: null });
            }
          }}
        >
          {Object.entries(state.source).map(([k, v]) => {
            return (
              <div key={k}>
                {k} = {viewTerm(v, false, { entry: k, path: [] })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getChoices(
  state: EditorState,
  setState: (state: EditorState) => void
): Array<{ description: string; onSelect(): void }> {
  if (!state.cursor) return [];
  return [
    {
      description: "copy into",
      onSelect() {
        if (!state.cursor) throw new Error();
        const copied = getByEntryPath(state.source, state.cursor);
        const entry = window.prompt();
        if (entry) {
          if (state.source[entry]) {
            if (window.confirm("overwrite?")) {
              setState({
                ...state,
                source: setByEntryPath(
                  state.source,
                  { entry, path: [] },
                  copied
                ),
              });
            }
          } else {
            setState({
              ...state,
              source: setByEntryPath(state.source, { entry, path: [] }, copied),
            });
          }
        }
      },
    },
    {
      description: "insert type",
      onSelect() {
        if (!state.cursor) throw new Error();
        setState({
          ...state,
          source: setByEntryPath(state.source, state.cursor, {
            type: "type",
            universe: 1,
          }),
        });
      },
    },
    {
      description: "insert reference",
      onSelect() {
        if (!state.cursor) throw new Error();
        setState({
          ...state,
          source: setByEntryPath(state.source, state.cursor, {
            type: "reference",
            identifier: "?",
          }),
        });
      },
    },
    {
      description: "insert application",
      onSelect() {
        if (!state.cursor) throw new Error();
        setState({
          ...state,
          source: setByEntryPath(state.source, state.cursor, {
            type: "application",
            left: {
              type: "reference",
              identifier: "",
            },
            right: {
              type: "reference",
              identifier: "",
            },
          }),
        });
      },
    },
    {
      description: "insert pi",
      onSelect() {
        if (!state.cursor) throw new Error();
        setState({
          ...state,
          source: setByEntryPath(state.source, state.cursor, {
            type: "pi",
            head: "",
            from: {
              type: "reference",
              identifier: "",
            },
            to: {
              type: "reference",
              identifier: "",
            },
          }),
        });
      },
    },
  ];
}
