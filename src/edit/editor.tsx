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
  const viewDerivedTerm = (term: Compute.PreparedTerm) => viewTerm(Compute.unprepareTerm(term), false, null);
  const possibleKeyboardOperations = getPossibleKeyboardOperations(state);
  const prepatredTermUnderCursor: Compute.PreparedTerm | null =
    cursor.type === "entry" && (Source.fluentScope(preparedScope as any).get(cursor.path).term as any);
  const type = tryIt(() => prepatredTermUnderCursor && Compute.getType(prepatredTermUnderCursor, preparedScope));
  const value = tryIt(() => prepatredTermUnderCursor && Compute.getValue(prepatredTermUnderCursor, preparedScope));
  const isShowable = (entry: string, level: "type" | "value", term: Source.Term) =>
    !Source.isNullTerm(term) || (cursor.type === "entry" && cursor.path.entry === entry && cursor.path.level === level);
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
          {Object.entries(source).map(([entry, { type, value }]) => {
            const prepared = preparedScope[entry];
            if (!prepared) throw new Error();
            const annotatedType = tryIt(() => Compute.getValue(prepared.type, preparedScope));
            const derivedType = tryIt(() => Compute.getType(prepared.value, preparedScope));
            const hasError =
              annotatedType &&
              derivedType &&
              !Compute.isEqual(annotatedType, derivedType) &&
              !Source.isNullTerm(type) &&
              !Source.isNullTerm(value);
            return (
              <React.Fragment key={entry}>
                <div style={{ padding: "0 1ch" }}>
                  {entry}
                  {type && isShowable(entry, "type", type) && (
                    <>
                      <span style={{ color: colors.purple }}> : </span>
                      {viewTerm(type, false, { entry, level: "type", relative: [] })}
                    </>
                  )}
                  {value && isShowable(entry, "value", value) && (
                    <>
                      <span style={{ color: colors.purple }}> = </span>
                      {viewTerm(value, false, { entry, level: "value", relative: [] })}
                    </>
                  )}
                </div>
                {hasError && annotatedType && derivedType && (
                  <div style={{ backgroundColor: colors.backgroundDark, padding: "0 1ch" }}>
                    <div style={{ color: colors.red }}>type error</div>
                    <div>expected: {viewDerivedTerm(annotatedType)}</div>
                    <div>detected: {viewDerivedTerm(derivedType)}</div>
                  </div>
                )}
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
            "computed type": type && viewDerivedTerm(type),
            "computed value": value && viewDerivedTerm(value),
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
  preparedScope: Compute.PreparedScope
) {
  function viewTerm(term: Source.Term, showParens: boolean, path: Path.Absolute | null) {
    const preparedTerm: Compute.PreparedTerm | null = path && (Source.fluentScope(preparedScope as any).get(path).term as any);
    const hasCursor = cursor.type === "entry" && path ? Path.fluent(path).isEqual(cursor.path) : false;
    const backgroundColor = hasCursor ? colors.backgroundDark : "transparent";
    const cursorHere = () => path && dispatch({ type: "cursor", payload: path });
    const childPath = (leaf: string) => path && Path.fluent(path).child(leaf).path;
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
      case "reference": {
        if (hasCursor && cursor.type === "entry") {
          return (
            <>
              <EmulatedInput state={{ text: term.identifier, cursor: cursor.cursor }} />
              <span style={{ color: colors.gray }}> {suggestions[0]}</span>
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
        // left must have type pi
        // right must have type left.from
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {viewTerm(term.left, term.left.type !== "application", childPath("left"))}
            {punctuation(" ")}
            {viewTerm(term.right, true, childPath("right"))}
            {parens(")")}
          </span>
        );
      }
      case "pi": {
        // from must have type type
        // to must have type type
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {term.head || hasCursor ? (
              <>
                {punctuation("(")}
                {hasCursor && cursor.type === "entry" ? <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} /> : term.head}
                {punctuation(" : ")}
                {viewTerm(term.from, false, childPath("from"))}
                {punctuation(")")}
              </>
            ) : (
              viewTerm(term.from, false, childPath("from"))
            )}
            {punctuation(" -> ")}
            {viewTerm(term.to, false, childPath("to"))}
            {parens(")")}
          </span>
        );
      }
      case "lambda": {
        const fromMustBeTypeError = (() => {
          if (preparedTerm) {
            if (preparedTerm.type !== "lambda") throw new Error();
            const fromType = Compute.getType(preparedTerm.from, preparedScope);
            return fromType.type !== "type";
          }
          return false;
        })();
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {punctuation("(")}
            {hasCursor && cursor.type === "entry" ? <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} /> : term.head}
            {punctuation(" : ")}
            {fromMustBeTypeError && <ErrorTooltip>must be a type</ErrorTooltip>}
            {viewTerm(term.from, false, childPath("from"))}
            {punctuation(")")}
            {punctuation(" => ")}
            {viewTerm(term.body, false, childPath("body"))}
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
      <div style={{ color: colors.red, cursor: "pointer" }} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        !
      </div>
      <div
        style={{
          position: "absolute",
          backgroundColor: colors.backgroundDark,
          border: `1px solid ${colors.red}`,
          padding: "0 1ch",
        }}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}

function tryIt<T>(f: () => T) {
  try {
    return f();
  } catch (error) {
    return;
  }
}

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
