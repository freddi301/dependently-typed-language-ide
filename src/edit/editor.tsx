import React, { useLayoutEffect, useReducer, useState } from "react";
import { colors } from "../App";
import { EmulatedInput } from "./emulated-input";
import { getKeyCombinationComponentsFromEvent, ViewKeyCombination } from "./key-combinations";
import { getPossibleKeyboardOperations } from "./keyboard-operations";
import * as Path from "../core/path";
import * as Source from "../core/source";
import * as Compute from "../core/compute";
import * as Editor from "./editor-state";
import * as History from "./history-state";
import { getSuggestions } from "./suggestions";
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
  const { source, cursor } = History.getCurrent(state.history);
  const preparedScope = Compute.prepareScope(source);
  const suggestions = getSuggestions(state);
  const viewTerm = makeViewTerm(cursor, dispatch, suggestions, preparedScope);
  const possibleKeyboardOperations = getPossibleKeyboardOperations(state);
  const preparedTermUnderCursor: Compute.Term | null =
    cursor.type === "entry" && (Source.fluentScope(preparedScope as any).get(cursor.path).term as any);
  const type = preparedTermUnderCursor && Compute.getType(preparedTermUnderCursor, preparedScope);
  const value = preparedTermUnderCursor && Compute.getValue(preparedTermUnderCursor, preparedScope);
  const isShowable = (entry: string, level: "type" | "value", term: Compute.Term) =>
    !Compute.isNullTerm(term) || (cursor.type === "entry" && cursor.path.entry === entry && cursor.path.level === level);
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
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div style={{ gridColumn: 1, position: "relative", overflow: "overlay" }}>
        <div style={{ position: "absolute", width: "100%", boxSizing: "border-box", padding: "1ch 0" }}>
          {Object.entries(preparedScope).map(([entry, { type, value }]) => {
            const annotatedType = Compute.getValue(type, preparedScope);
            const derivedType = Compute.getType(value, preparedScope);
            const annotatedTypeError =
              !Compute.isNullTerm(type) && !Compute.isNullTerm(value) && !Compute.isEqual(annotatedType, derivedType);
            const annotatedTypeErrorNode = annotatedTypeError && (
              <ErrorTooltip>
                <div style={{ color: colors.red }}>wrong value type</div>
                <div>expected: {viewTerm(annotatedType, false)}</div>
                <div>detected: {viewTerm(derivedType, false)}</div>
              </ErrorTooltip>
            );
            return (
              <React.Fragment key={entry}>
                <div style={{ padding: "0 1ch" }}>
                  {entry}
                  {type && isShowable(entry, "type", type) && (
                    <>
                      <span style={{ color: colors.purple }}> : </span>
                      {viewTerm(type, false)}
                    </>
                  )}
                  {value && isShowable(entry, "value", value) && (
                    <>
                      <span style={{ color: colors.purple }}> = </span>
                      {annotatedTypeErrorNode}
                      {viewTerm(value, false)}
                    </>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {cursor.type === "top-empty" && (
            <div style={{ paddingLeft: "1ch" }}>
              <EmulatedInput state={cursor.input} />
            </div>
          )}
        </div>
      </div>
      <div style={{ gridColumn: 2 }}>
        <Infos
          infos={{
            "computed type": type && viewTerm(type, false),
            "computed value": value && viewTerm(value, false),
            intellisense: suggestions.map((suggestion, index) => {
              const isSelected = index === state.suggestionIndex;
              return (
                <div key={suggestion} style={{ backgroundColor: isSelected ? colors.background : colors.backgroundDark }}>
                  {suggestion}
                </div>
              );
            }),
            "keyboard shortcuts": possibleKeyboardOperations.map(({ keyCombination, operation }) => {
              return (
                <div key={keyCombination} style={{ display: "flex", alignItems: "center" }}>
                  <ViewKeyCombination keyCombination={keyCombination} />
                  <div>{operation}</div>
                </div>
              );
            }),
            extra: (
              <div>
                <button
                  onClick={() => {
                    download(JSON.stringify(source), "application/json");
                  }}
                >
                  download
                </button>
                <button
                  onClick={() => {
                    upload((text) => JSON.parse(text));
                  }}
                >
                  updload
                </button>
                <button
                  onClick={() => {
                    copyToClipboard(JSON.stringify(source));
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
  suggestions: Array<string>,
  preparedScope: Compute.Scope
) {
  function viewTerm(term: Compute.Term, showParens: boolean) {
    const hasCursor = cursor.type === "entry" && term.path ? Path.fluent(term.path).isEqual(cursor.path) : false;
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
        if (hasCursor && cursor.type === "entry") {
          const showSuggestion = suggestions[0] && suggestions[0] !== term.identifier;
          return (
            <>
              <EmulatedInput state={{ text: term.identifier, cursor: cursor.cursor }} />
              {showSuggestion && (
                <>
                  {" "}
                  <span style={{ backgroundColor: colors.backgroundDark, border: `1px solid ${colors.green}`, padding: "0 1ch" }}>
                    {suggestions[0]}
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
        const leftType = Compute.getType(term.left, preparedScope);
        const leftMustBePiError = leftType.type !== "pi";
        const leftMustBePiErrorNode = leftMustBePiError && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a function</div>
            <div>detected: {viewTerm(leftType, false)}</div>
          </ErrorTooltip>
        );
        const rightType = Compute.getType(term.right, preparedScope);
        const rightMustBeLeftFromError = leftType.type === "pi" && !Compute.isEqual(leftType.from, rightType);
        const rightMustBeLeftFromErrorNode = rightMustBeLeftFromError && leftType.type === "pi" && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>wrong argument type</div>
            <div>expected: {viewTerm(leftType.from, false)}</div>
            <div>detected: {viewTerm(rightType, false)}</div>
          </ErrorTooltip>
        );
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {leftMustBePiErrorNode}
            {viewTerm(term.left, term.left.type !== "application")}
            {punctuation(" ")}
            {rightMustBeLeftFromErrorNode}
            {viewTerm(term.right, true)}
            {parens(")")}
          </span>
        );
      }
      case "pi": {
        const fromType = Compute.getType(term.from, preparedScope);
        const fromMustBeTypeError = fromType.type !== "type";
        const fromMustBeTypeErrorNode = fromMustBeTypeError && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a type</div>
            <div>detected: {viewTerm(fromType, false)}</div>
          </ErrorTooltip>
        );
        const toType = Compute.getType(term.to, preparedScope);
        const toMustBeTypeError = toType.type !== "type";
        const toMustBeTypeErrorNode = toMustBeTypeError && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a type</div>
            <div>detected: {viewTerm(toType, false)}</div>
          </ErrorTooltip>
        );
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {term.head || hasCursor ? (
              <>
                {punctuation("(")}
                {hasCursor && cursor.type === "entry" ? <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} /> : term.head}
                {punctuation(" : ")}
                {fromMustBeTypeErrorNode}
                {viewTerm(term.from, false)}
                {punctuation(")")}
              </>
            ) : (
              <>
                {fromMustBeTypeErrorNode}
                {viewTerm(term.from, false)}
              </>
            )}
            {punctuation(" -> ")}
            {toMustBeTypeErrorNode}
            {viewTerm(term.to, false)}
            {parens(")")}
          </span>
        );
      }
      case "lambda": {
        const fromType = Compute.getType(term.from, preparedScope);
        const fromMustBeTypeError = fromType.type !== "type";
        const fromMustBeTypeErrorNode = fromMustBeTypeError && (
          <ErrorTooltip>
            <div style={{ color: colors.red }}>must be a type</div>
            <div>detected: {viewTerm(fromType, false)}</div>
          </ErrorTooltip>
        );
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {punctuation("(")}
            {hasCursor && cursor.type === "entry" ? <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} /> : term.head}
            {punctuation(" : ")}
            {fromMustBeTypeErrorNode}
            {viewTerm(term.from, false)}
            {punctuation(")")}
            {punctuation(" => ")}
            {viewTerm(term.body, false)}
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
                <div style={{ position: "absolute", width: "100%", padding: "0 2ch", boxSizing: "border-box" }}>{body}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
