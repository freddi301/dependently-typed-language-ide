import React, { useLayoutEffect, useReducer, useRef, useState } from "react";
import { colors } from "../App";
import { EmulatedInput } from "./emulated-input";
import { getKeyCombinationComponentsFromEvent, ViewKeyCombination } from "./key-combinations";
import { getPossibleKeyboardOperations } from "./keyboard-operations";
import * as Path from "../core/path";
import * as Source from "../core/source";
import * as Compute from "../core/compute";
import * as Editor from "./editor-state";
import * as Suggestions from "./suggestions";
import { copyToClipboard, download, upload } from "../serialization/browser";

export function EditorComponent() {
  const [state, dispatch] = useReducer(Editor.reducer, Editor.emptyState);
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      dispatch({ type: "keydown", payload: getKeyCombinationComponentsFromEvent(event) });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  const on = Editor.onEditor(state);
  const prepared = Compute.prepare(on.source, {}, []);
  const suggestions = Suggestions.getSuggestions(state);
  const viewTerm = makeViewTerm(on.cursor, dispatch, suggestions);
  const possibleKeyboardOperations = getPossibleKeyboardOperations(on);
  const preparedTermUnderCursor: Compute.Term = Source.get(prepared as any, on.cursor.path) as any;
  const type = preparedTermUnderCursor && Compute.getNormalType(preparedTermUnderCursor);
  const value = preparedTermUnderCursor && Compute.getNormalValue(preparedTermUnderCursor);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: colors.background,
        color: colors.white,
        whiteSpace: "pre",
        display: "grid",
        gridTemplateColumns: "1fr 500px",
      }}
    >
      <div style={{ gridColumn: 1, position: "relative", overflow: "overlay" }}>
        <div style={{ position: "absolute", width: "100%", boxSizing: "border-box", padding: "1ch 0" }}>
          {viewTerm(prepared, false, true)}
        </div>
      </div>
      <div style={{ gridColumn: 2 }}>
        <Infos
          infos={{
            "computed type": <div style={{ padding: "0 2ch" }}>{type && viewTerm(type, false, true)}</div>,
            "computed value": <div style={{ padding: "0 2ch" }}>{value && viewTerm(value, false, true)}</div>,
            intellisense: (
              <div>
                {suggestions.map(({ identifier, type, matchesExpectedType }, index) => {
                  const isSelected = index === state.suggestionIndex;
                  return (
                    <div
                      key={index}
                      style={{
                        backgroundColor: isSelected ? colors.background : colors.backgroundDark,
                        borderLeft: `1ch solid ${isSelected ? colors.blue : "transparent"}`,
                      }}
                    >
                      {isSelected && <ScrollMeIntoView />}
                      {
                        {
                          yes: <span style={{ color: colors.green }}> ??? </span>,
                          no: <span style={{ color: colors.red }}> ??? </span>,
                          unknown: " ",
                        }[matchesExpectedType]
                      }
                      {identifier}
                      <span style={{ color: colors.purple }}> : </span>
                      {viewTerm(type, false, true)}
                    </div>
                  );
                })}
              </div>
            ),
            "keyboard shortcuts": (
              <div style={{ padding: "0 2ch" }}>
                {possibleKeyboardOperations.map(({ keyCombination, operation }) => {
                  return (
                    <div key={keyCombination} style={{ display: "flex", alignItems: "center" }}>
                      <ViewKeyCombination keyCombination={keyCombination} />
                      <div>{operation}</div>
                    </div>
                  );
                })}
              </div>
            ),
            extra: (
              <div style={{ padding: "0 2ch" }}>
                <button
                  onClick={() => {
                    download(JSON.stringify(on.source), "application/json");
                  }}
                >
                  download
                </button>
                <button
                  onClick={() => {
                    upload((text) => dispatch({ type: "load", payload: JSON.parse(text) }));
                  }}
                >
                  updload
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(JSON.stringify(on.source));
                  }}
                >
                  clipboard
                </button>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}

function makeViewTerm(
  cursor: Editor.SourceState["cursor"],
  dispatch: (action: Editor.Action) => void,
  suggestions: Array<Suggestions.Suggestion>
) {
  function viewTerm(term: Compute.Term, showParens: boolean, isBlock: boolean) {
    const hasCursor = term.path ? Path.equals(term.path, cursor.path) : false;
    const backgroundColor = hasCursor ? colors.backgroundDark : "transparent";
    const cursorHere = () => term.path && dispatch({ type: "cursor", payload: term.path });
    const parens = (symbol: string) =>
      showParens && (
        <span style={{ color: colors.purple }} onClick={cursorHere}>
          {symbol}
        </span>
      );
    const punctuation = (symbol: string) => (
      <span style={{ color: colors.purple }} onClick={cursorHere}>
        {symbol}
      </span>
    );
    switch (term.type) {
      case "type": {
        return (
          <span style={{ color: colors.purple, backgroundColor }} onClick={cursorHere}>
            type{term.universe !== 1 && <> {term.universe}</>}
          </span>
        );
      }
      case "free":
      case "reference": {
        if (hasCursor) {
          const firstSuggestion = suggestions[0];
          const showSuggestion = firstSuggestion && firstSuggestion.identifier !== term.identifier;
          return (
            <>
              <EmulatedInput state={{ text: term.identifier, cursor: cursor.cursor }} />
              {showSuggestion && firstSuggestion && (
                <>
                  {" "}
                  <span style={{ backgroundColor: colors.backgroundDark, borderLeft: `1ch solid ${colors.blue}`, padding: "0 1ch" }}>
                    {firstSuggestion.identifier}
                    {/* <span style={{ color: colors.purple }}> : </span>
                    {viewTerm(firstSuggestion.type, false)} */}
                  </span>
                </>
              )}
            </>
          );
        }
        return (
          <span
            onClick={cursorHere}
            style={{
              color: term.identifier === "" ? colors.gray : colors.white,
              backgroundColor,
            }}
          >
            {term.identifier || "_"}
          </span>
        );
      }
      case "application": {
        const leftType = Compute.getNormalType(term.left);
        const leftMustBePiError = leftType && leftType.type !== "pi";
        const leftMustBePiErrorNode = leftMustBePiError && leftType && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a function</div>
            <div>detected: {viewTerm(leftType, false, false)}</div>
          </ErrorTooltip>
        );
        const rightType = Compute.getNormalType(term.right);
        const rightMustBeLeftFromError = leftType && leftType.type === "pi" && rightType && !Compute.equals(leftType.from, rightType);
        const rightMustBeLeftFromErrorNode = rightMustBeLeftFromError && rightType && leftType && leftType.type === "pi" && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>wrong argument type</div>
            <div>expected: {viewTerm(leftType.from, false, false)}</div>
            <div>detected: {viewTerm(rightType, false, false)}</div>
          </ErrorTooltip>
        );
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {leftMustBePiErrorNode}
            {viewTerm(term.left, term.left.type !== "application" || !!leftMustBePiError, false)}
            {punctuation(" ")}
            {rightMustBeLeftFromErrorNode}
            {viewTerm(term.right, true, false)}
            {parens(")")}
          </span>
        );
      }
      case "pi": {
        const fromType = Compute.getNormalType(term.from);
        const fromMustBeTypeError = fromType && fromType.type !== "type";
        const fromMustBeTypeErrorNode = fromMustBeTypeError && fromType && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a type</div>
            <div>detected: {viewTerm(fromType, false, false)}</div>
          </ErrorTooltip>
        );
        const toType = Compute.getNormalType(term.to);
        const toMustBeTypeError = toType && toType.type !== "type";
        const toMustBeTypeErrorNode = toMustBeTypeError && toType && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a type</div>
            <div>detected: {viewTerm(toType, false, false)}</div>
          </ErrorTooltip>
        );
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {term.head || hasCursor ? (
              <>
                {punctuation("(")}
                {hasCursor ? (
                  <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} />
                ) : (
                  <span onClick={cursorHere}>{term.head}</span>
                )}
                {punctuation(" : ")}
                {fromMustBeTypeErrorNode}
                {viewTerm(term.from, false, false)}
                {punctuation(")")}
              </>
            ) : (
              <>
                {fromMustBeTypeErrorNode}
                {viewTerm(term.from, false, false)}
              </>
            )}
            {punctuation(" -> ")}
            {toMustBeTypeErrorNode}
            {viewTerm(term.to, false, false)}
            {parens(")")}
          </span>
        );
      }
      case "lambda": {
        const fromType = Compute.getNormalType(term.from);
        const fromMustBeTypeError = fromType && fromType.type !== "type";
        const fromMustBeTypeErrorNode = fromMustBeTypeError && fromType && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a type</div>
            <div>detected: {viewTerm(fromType, false, false)}</div>
          </ErrorTooltip>
        );
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {punctuation("(")}
            {hasCursor ? (
              <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} />
            ) : (
              <span onClick={cursorHere}>{term.head}</span>
            )}
            {punctuation(" : ")}
            {fromMustBeTypeErrorNode}
            {viewTerm(term.from, false, false)}
            {punctuation(")")}
            {punctuation(" => ")}
            {viewTerm(term.body, false, false)}
            {parens(")")}
          </span>
        );
      }
      case "let": {
        const rightIsBlock = term.right.type === "let" && isBlock;
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {hasCursor ? (
              <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} />
            ) : (
              <span onClick={cursorHere}>{term.head}</span>
            )}
            {punctuation(" : ")}
            {viewTerm(term.from, term.from.type === "let", false)}
            {punctuation(" = ")}
            {viewTerm(term.left, term.left.type === "let", false)}
            {rightIsBlock ? punctuation(" ;\n") : punctuation(" ; ")}
            {viewTerm(term.right, false, rightIsBlock)}
            {parens(")")}
          </span>
        );
      }
    }
  }
  return viewTerm;
}

function ErrorTooltip({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <div
        style={{ color: colors.red, cursor: "pointer", fontWeight: "bold" }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        !
      </div>
      <div
        style={{
          position: "absolute",
          backgroundColor: colors.backgroundDark,
          borderTop: `2px solid ${colors.red}`,
          padding: "0 1ch",
        }}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}

// function tryIt<T>(f: () => T) {
//   try {
//     return f();
//   } catch (error) {
//     return;
//   }
// }

function Infos({ infos }: { infos: Record<string, React.ReactNode> }) {
  const [isOpenById, setIsOpenById] = useState<Record<string, boolean>>(Object.fromEntries(Object.keys(infos).map((k) => [k, true])));
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {Object.entries(infos).map(([head, body]) => {
        const isOpen = isOpenById[head];
        return (
          <div key={head} style={{ flexGrow: isOpen ? 1 : 0, display: "flex", flexDirection: "column" }}>
            <div
              onClick={() => {
                setIsOpenById({ ...isOpenById, [head]: !isOpen });
              }}
              style={{
                backgroundColor: colors.background,
                cursor: "pointer",
                padding: "0 2ch",
                userSelect: "none",
              }}
            >
              {head}
            </div>
            {isOpen && (
              <div style={{ flexGrow: 1, backgroundColor: colors.backgroundDark, position: "relative", overflow: "auto" }}>
                <div style={{ position: "absolute", width: "100%", boxSizing: "border-box" }}>{body}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScrollMeIntoView() {
  const ref = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }, []);
  return <span ref={ref} />;
}
