import { createContext, useState } from "react";
import { TermComponent } from "./components/TermComponent";
import { getByRelativePath, setByRelativePath, TermPath } from "./core/path";
import { getType, getValue, Term } from "./core/program";
import { copyToClipboard, download, load } from "./serialization/browser";

type EditorState = { source: Term; cursor: TermPath; clipBoard: Term | null };
export const EditorContext = createContext<{
  state: EditorState;
  setState(state: EditorState): void;
}>(null as any);

export default function App() {
  const [state, setState] = useState<EditorState>({
    source: {
      type: "reference",
      reference: "main",
      t: undefined,
    },
    cursor: [],
    clipBoard: null,
  });
  const { source, cursor } = state;
  const value = getValue(state.source);
  const type = value ? getType(value) : null;
  const termUnderCursor = getByRelativePath(state.cursor, state.source);
  return (
    <EditorContext.Provider value={{ state, setState }}>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: colors.background,
          color: colors.white,
          whiteSpace: "pre",
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gridTemplateRows: "1fr 1fr",
        }}
      >
        <div
          style={{
            gridColumn: "1",
            gridRow: "1",
            position: "relative",
            overflow: "scroll",
          }}
        >
          <div style={{ position: "absolute" }}>
            <TermComponent term={state.source} path={[]} parens={false} />
          </div>
        </div>
        <div
          style={{
            gridColumn: "1",
            gridRow: "2",
            position: "relative",
            overflow: "scroll",
          }}
        >
          <div style={{ position: "absolute" }}>
            {value && (
              <div>
                = <TermComponent term={value} path={["*"]} parens={false} />
              </div>
            )}
            {type && (
              <div>
                : <TermComponent term={type} path={["*"]} parens={false} />
              </div>
            )}
          </div>
        </div>
        <div style={{ gridColumn: "2", gridRow: "1" }}>
          <div>
            <button
              onClick={() => {
                if (termUnderCursor) {
                  download(
                    JSON.stringify(termUnderCursor, null, 2),
                    "application/json"
                  );
                }
              }}
            >
              export
            </button>
            <button
              onClick={() => {
                if (termUnderCursor) {
                  copyToClipboard(JSON.stringify(termUnderCursor, null, 2));
                }
              }}
            >
              copy as json
            </button>
            <button
              onClick={() => {
                if (termUnderCursor) {
                  load((text) => {
                    setState({
                      ...state,
                      source:
                        setByRelativePath(cursor, JSON.parse(text), source) ??
                        source,
                    });
                  });
                }
              }}
            >
              import
            </button>
          </div>
          <div>
            <button
              disabled={termUnderCursor === null}
              onClick={() => {
                setState({
                  ...state,
                  source:
                    setByRelativePath(
                      cursor,
                      { type: "reference", reference: "?", t: undefined },
                      source
                    ) ?? source,
                });
              }}
            >
              insert reference
            </button>
          </div>
          <div>
            <button
              disabled={termUnderCursor === null}
              onClick={() => {
                setState({
                  ...state,
                  source:
                    setByRelativePath(
                      cursor,
                      {
                        type: "application",
                        left: {
                          type: "reference",
                          reference: "?",
                          t: undefined,
                        },
                        right: {
                          type: "reference",
                          reference: "?",
                          t: undefined,
                        },
                      },
                      source
                    ) ?? source,
                });
              }}
            >
              insert application
            </button>
          </div>
          <div>
            <button
              disabled={termUnderCursor === null}
              onClick={() => {
                setState({
                  ...state,
                  source:
                    setByRelativePath(
                      cursor,
                      {
                        type: "pi",
                        head: "?",
                        from: {
                          type: "reference",
                          reference: "?",
                          t: undefined,
                        },
                        to: { type: "reference", reference: "?", t: undefined },
                      },
                      source
                    ) ?? source,
                });
              }}
            >
              insert pi
            </button>
          </div>
          <div>
            <button
              disabled={termUnderCursor === null}
              onClick={() => {
                setState({
                  ...state,
                  source:
                    setByRelativePath(
                      cursor,
                      {
                        type: "lambda",
                        head: "?",
                        from: {
                          type: "reference",
                          reference: "?",
                          t: undefined,
                        },
                        body: {
                          type: "reference",
                          reference: "?",
                          t: undefined,
                        },
                      },
                      source
                    ) ?? source,
                });
              }}
            >
              insert lambda
            </button>
          </div>
          <div>
            <button
              disabled={termUnderCursor === null}
              onClick={() => {
                if (termUnderCursor) {
                  setState({ ...state, clipBoard: termUnderCursor });
                }
              }}
            >
              copy
            </button>
            <button
              disabled={state.clipBoard === null || termUnderCursor === null}
              onClick={() => {
                if (state.clipBoard && termUnderCursor) {
                  setState({
                    ...state,
                    source:
                      setByRelativePath(cursor, state.clipBoard, source) ??
                      source,
                  });
                }
              }}
            >
              paste
            </button>
            <div>
              {state.clipBoard && (
                <TermComponent
                  term={state.clipBoard}
                  path={["*"]}
                  parens={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </EditorContext.Provider>
  );
}

export const colors = {
  background: "#282c34",
  backgroundDark: "#21252b",
  backgroundLight: "#2c313c",
  backgroundHover: "#292d35",
  backgroundFocus: "#2c313a",
  white: "#abb2bf",
  gray: "#5c6370",
  blue: "#61afef",
  red: "#e06c75",
  yellow: "#e5c07b",
  green: "#98c379",
  purple: "#c678dd",
};

export const styleInputSeamless: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: "inherit",
  font: "inherit",
  fontSize: "inherit",
  padding: 0,
  margin: 0,
};
