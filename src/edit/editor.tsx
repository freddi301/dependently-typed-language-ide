import React, { useLayoutEffect, useReducer, useState } from "react";
import { colors } from "../App";
import { EmulatedInput } from "./emulated-input";
import { getKeyCombinationComponentsFromEvent, ViewKeyCombination } from "./key-combinations";
import { getPossibleKeyboardOperations } from "./keyboard-operations";
import * as Path from "../core/path";
import * as Source from "../core/source";
import { getType, getValue, prepareScope, unprepareTerm, PreparedTerm } from "../core/compute";
import * as Editor from "./editor-state";
import * as History from "./history-state";
import * as Query from "../core/query";

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
  const viewTerm = makeViewTerm({ source, cursor }, dispatch);
  const viewDerivedTerm = (term: PreparedTerm) => viewTerm(unprepareTerm(term), false, { entry: "*", level: "type", relative: [] });
  const possibleKeyboardOperations = getPossibleKeyboardOperations(state);
  const preparedScope = prepareScope(source);
  const termUnderCursor = cursor.type === "entry" && (Source.fluentScope(preparedScope as any).get(cursor.path).term as any);
  const type = tryIt(() => getType(termUnderCursor, preparedScope));
  const value = tryIt(() => getValue(termUnderCursor, preparedScope));
  const isShowable = (entry: string, level: "type" | "value", term: Source.Term) =>
    !Source.isNullTerm(term) || (cursor.type === "entry" && cursor.path.entry === entry && cursor.path.level === level);
  const allIdentifiers = Query.allIdentifiers(source);
  const allIdentifiersInScope = cursor.type === "entry" && Query.allIdentifiersInScope(source, cursor.path);
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
      <div style={{ gridColumn: 1, position: "relative", overflow: "scroll" }}>
        <div style={{ position: "absolute", width: "100%", boxSizing: "border-box", padding: "1ch" }}>
          {Object.entries(source).map(([entry, { type, value }]) => {
            return (
              <div key={entry}>
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
            );
          })}
          {cursor.type === "top-empty" && <EmulatedInput state={cursor.input} />}
        </div>
      </div>
      <div style={{ gridColumn: 2, display: "flex", flexDirection: "column" }}>
        <InfoSection head="computed type" body={type && viewDerivedTerm(type)} />
        <InfoSection head="computed value" body={value && viewDerivedTerm(value)} />
        <InfoSection
          head="all identifiers in scope"
          body={
            allIdentifiersInScope &&
            Array.from(allIdentifiersInScope, (identifier) => {
              return <div key={identifier}>{identifier}</div>;
            })
          }
        />
        <InfoSection
          head="all identifiers"
          body={Array.from(allIdentifiers, (identifier) => {
            return <div key={identifier}>{identifier}</div>;
          })}
        />
        <InfoSection
          head="keyboard shortcuts"
          body={possibleKeyboardOperations.map(({ keyCombination, operation }) => {
            return (
              <div key={keyCombination} style={{ display: "flex", alignItems: "center" }}>
                <ViewKeyCombination keyCombination={keyCombination} />
                <div>{operation}</div>
              </div>
            );
          })}
        />
      </div>
    </div>
  );
}

function makeViewTerm({ source, cursor }: Editor.SourceState, dispatch: (action: Editor.Action) => void) {
  function viewTerm(term: Source.Term, showParens: boolean, path: Path.Absolute) {
    const hasCursor = cursor.type === "entry" ? Path.fluent(path).isEqual(cursor.path) : false;
    const backgroundColor = hasCursor ? colors.backgroundDark : "transparent";
    const cursorHere = () => dispatch({ type: "cursor", payload: path });
    const childPath = (leaf: string) => Path.fluent(path).child(leaf).path;
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
          return <EmulatedInput state={{ text: term.identifier, cursor: cursor.cursor }} />;
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
        return (
          <span style={{ backgroundColor }}>
            {parens("(")}
            {punctuation("(")}
            {hasCursor && cursor.type === "entry" ? <EmulatedInput state={{ text: term.head, cursor: cursor.cursor }} /> : term.head}
            {punctuation(" : ")}
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

function tryIt<T>(f: () => T) {
  try {
    return f();
  } catch (error) {
    return;
  }
}

function InfoSection({ head, body }: { head: string; body: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div style={{ flexGrow: isOpen ? 1 : 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          backgroundColor: colors.background,
          cursor: "pointer",
          padding: "0 2ch",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {head}
      </div>
      {isOpen && <div style={{ flexGrow: 1, backgroundColor: colors.backgroundDark, padding: "0 2ch" }}>{body}</div>}
    </div>
  );
}
