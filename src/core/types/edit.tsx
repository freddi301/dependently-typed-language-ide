import React, { useEffect, useState } from "react";
import { colors, styleInputSeamless } from "../../App";
import {
  getByEntryPath,
  isEqualEntryPath,
  setByEntryPath,
  SourceTermEntryPath,
} from "./path";
import { SourceTerm } from "./term";

type EditorState = {
  source: Record<string, SourceTerm>;
  cursor: SourceTermEntryPath | null;
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
  }, [choiceIndex, choices, showChoices, state, termUnderCursor]);
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
    { entry, path }: SourceTermEntryPath
  ) {
    const hasCursor = state.cursor
      ? isEqualEntryPath({ entry, path }, state.cursor)
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
