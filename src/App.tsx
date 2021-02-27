import * as React from "react";
import { TermPath } from "./core/path";
import { fromProgram, Program } from "./core/program";
import { program as defaultProgram } from "./test-programs/a";
import { ProgramComponent } from "./components/ProgramComponent";

export type ProgramContext = ReturnType<typeof fromProgram>;
export const ProgramContext = React.createContext<ProgramContext>(null as any);

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
  outline: "none",
  padding: 0,
  margin: 0,
};

type EditorState = {
  cursor: TermPath;
};

function useEditor() {
  const [program, setProgram] = React.useState<Program>({});
  const [state, setState] = React.useState<EditorState>({
    cursor: [],
  });
  const setCursor = (path: TermPath) => {
    setState((state) => ({ ...state, cursor: path }));
  };
  return {
    program,
    state,
    action: {
      setProgram,
      setCursor,
    },
  };
}

export const EditorContext = React.createContext<ReturnType<typeof useEditor>>(
  null as any
);

export default function App() {
  const editor = useEditor();
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: colors.background,
        color: colors.white,
        whiteSpace: "pre",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ borderBottom: `1px solid ${colors.white}` }}>
        <button
          onClick={() => {
            load((text) => editor.action.setProgram(JSON.parse(text)));
          }}
        >
          import
        </button>
        <button
          onClick={() => {
            load((text) =>
              editor.action.setProgram({
                ...editor.program,
                ...JSON.parse(text),
              })
            );
          }}
        >
          import overwrite
        </button>
        <button
          onClick={() =>
            download(
              JSON.stringify(editor.program, null, 2),
              "application/json"
            )
          }
        >
          export
        </button>
      </div>
      <div
        style={{
          flexGrow: 1,
          overflow: "auto",
          padding: "1em",
        }}
      >
        <div>
          <EditorContext.Provider value={editor}>
            <ProgramComponent program={editor.program} />
          </EditorContext.Provider>
        </div>
        <div style={{ height: "calc(100% - 2ch)" }}></div>
      </div>
      <div style={{ borderTop: `1px solid ${colors.white}` }}>
        {JSON.stringify(editor.state.cursor)}
      </div>
    </div>
  );
}

function download(data: string, type: "application/json") {
  const filename = prompt();
  if (!filename) return;
  const file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob) {
    // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  } else {
    // Others
    const a = document.createElement("a");
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

function load(onLoad: (text: string) => void) {
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.type = "file";
  input.addEventListener("change", (event: any) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event: any) {
      const contents = event.target.result;
      onLoad(contents);
      document.body.removeChild(input);
    };
    reader.readAsText(file);
  });
  input.click();
}
