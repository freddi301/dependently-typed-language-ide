import * as React from "react";

type Term = Reference | Arrow | Application;

type Reference = { type: "reference"; reference: string };
type Arrow = { type: "arrow"; head?: string; from: Term; to: Term };
type Application = { type: "application"; left: Term; right: Term };

type Program = Record<
  string,
  {
    type: Term | null;
    value: Term | null;
  }
>;

function replace(previous: string, next: Term, term: Term): Term {
  switch (term.type) {
    case "reference": {
      if (term.reference === previous) {
        return next;
      } else {
        return term;
      }
    }
    case "arrow": {
      if (term.head === previous) {
        return {
          type: "arrow",
          head: term.head,
          from: replace(previous, next, term.from),
          to: term.to,
        };
      } else {
        return {
          type: "arrow",
          head: term.head,
          from: replace(previous, next, term.from),
          to: replace(previous, next, term.to),
        };
      }
    }
    case "application": {
      return {
        type: "application",
        left: replace(previous, next, term.left),
        right: replace(previous, next, term.right),
      };
    }
  }
}

function isSame(a: Term, b: Term): boolean {
  switch (a.type) {
    case "reference": {
      return a.type === b.type && a.reference === b.reference;
    }
    case "arrow": {
      return a.type === b.type && isSame(a.from, b.from) && isSame(a.to, b.to);
    }
    case "application": {
      return (
        a.type === b.type && isSame(a.left, b.left) && isSame(a.right, b.right)
      );
    }
  }
}

function fromProgram(program: Program) {
  function check() {
    const mismatchedArgument = new Map<
      Term,
      { expected: Term; detected: Term }
    >();
    const isNotAFunction = new Map<
      Term,
      {
        detected: Term;
      }
    >();
    function checkTerm(term: Term) {
      if (term.type === "application") {
        const leftType = getType(term.left);
        const rightType = getType(term.right);
        if (leftType && rightType) {
          if (leftType.type === "arrow") {
            if (!isSame(leftType.from, rightType)) {
              mismatchedArgument.set(term.right, {
                expected: leftType.from,
                detected: rightType,
              });
            }
          } else {
            isNotAFunction.set(term.left, { detected: leftType });
          }
        }
        checkTerm(term.left);
        checkTerm(term.right);
      }
    }
    for (const [k, v] of Object.entries(program)) {
      if (v.value) {
        checkTerm(v.value);
      }
    }
    return { mismatchedArgument, isNotAFunction };
  }
  const checks = check();
  function hasError(term: Term) {
    return (
      checks.mismatchedArgument.has(term) || checks.isNotAFunction.has(term)
    );
  }
  function getType(term: Term): Term | null {
    switch (term.type) {
      case "reference": {
        const top = program[term.reference];
        if (top) {
          const annotatedType = top.type;
          if (annotatedType) {
            return getValue(annotatedType);
          }
          if (top.value) {
            return getType(top.value);
          }
        }
        break;
      }
      case "application": {
        const leftType = getType(term.left);
        if (leftType && leftType.type === "arrow") {
          const to = leftType.head
            ? replace(leftType.head, term.right, leftType.to)
            : leftType.to;
          return getValue(to);
        }
        break;
      }
      case "arrow": {
        return { type: "reference", reference: "type" };
      }
    }
    return null;
  }

  function getValue(term: Term): Term {
    switch (term.type) {
      case "reference": {
        const top = program[term.reference];
        if (top?.value) {
          return getValue(top.value);
        }
        return { type: "reference", reference: term.reference };
      }
      case "arrow": {
        return {
          type: "arrow",
          head: term.head,
          from: getValue(term.from),
          to: getValue(term.to),
        };
      }
      case "application": {
        return {
          type: "application",
          left: getValue(term.left),
          right: getValue(term.right),
        };
      }
    }
  }
  return { program, checks, hasError, getType, getValue };
}

type ProgramContext = ReturnType<typeof fromProgram>;
const ProgramContext = React.createContext<ProgramContext>(null as any);

type TermPath = Array<string>;

function getByRelativePath(path: TermPath, term: Term): Term | null {
  const [head, ...tail] = path;
  if (!head) return term;
  switch (term.type) {
    case "reference": {
      return null;
    }
    case "arrow": {
      switch (head) {
        case "from":
          return getByRelativePath(tail, term.from);
        case "to":
          return getByRelativePath(tail, term.to);
        default:
          return null;
      }
    }
    case "application": {
      switch (head) {
        case "left":
          return getByRelativePath(tail, term.left);
        case "right":
          return getByRelativePath(tail, term.right);
        default:
          return null;
      }
    }
  }
}

function getByPath(path: TermPath, program: Program): Term | null {
  const [key, level, ...relative] = path;
  if (!key) return null;
  const first = program[key];
  if (!first) return null;
  switch (level) {
    case "type": {
      if (first.type) {
        return getByRelativePath(relative, first.type);
      } else {
        return null;
      }
    }
    case "value": {
      if (first.value) {
        return getByRelativePath(relative, first.value);
      } else {
        return null;
      }
    }
    default:
      return null;
  }
}

function setByRelativePath(
  path: TermPath,
  replacement: Term,
  term: Term
): Term | null {
  const [head, ...tail] = path;
  if (!head) {
    return replacement;
  }
  switch (term.type) {
    case "reference": {
      return null;
    }
    case "arrow": {
      switch (head) {
        case "from": {
          const from = setByRelativePath(tail, replacement, term.from);
          return from
            ? {
                type: "arrow",
                from,
                to: term.to,
              }
            : null;
        }
        case "to": {
          const to = setByRelativePath(tail, replacement, term.to);
          return to
            ? {
                type: "arrow",
                from: term.from,
                to,
              }
            : null;
        }
        default:
          return null;
      }
    }
    case "application": {
      switch (head) {
        case "left": {
          const left = setByRelativePath(tail, replacement, term.left);
          return left
            ? {
                type: "application",
                left,
                right: term.right,
              }
            : null;
        }
        case "right": {
          const right = setByRelativePath(tail, replacement, term.right);
          return right
            ? {
                type: "application",
                left: term.left,
                right,
              }
            : null;
        }
        default:
          return null;
      }
    }
  }
}

function setByPath(
  path: TermPath,
  replacement: Term,
  program: Program
): Program | null {
  const [key, level, ...relative] = path;
  if (!key) return null;
  const first = program[key];
  if (!first) return null;
  switch (level) {
    case "type": {
      const type = first.type
        ? setByRelativePath(relative, replacement, first.type)
        : null;
      return type
        ? {
            ...program,
            [key]: {
              type,
              value: first.value,
            },
          }
        : null;
    }
    case "value": {
      const value = first.value
        ? setByRelativePath(relative, replacement, first.value)
        : null;
      return value
        ? {
            ...program,
            [key]: {
              type: first.type,
              value,
            },
          }
        : null;
    }
    default:
      return null;
  }
}

function isSamePath(a: TermPath, b: TermPath) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const colors = {
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

const styleInputSeamless: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: "inherit",
  font: "inherit",
  fontSize: "inherit",
  outline: "none",
  padding: 0,
  margin: 0,
};

function Hoverable({
  head,
  body,
  hasMouseOver,
}: {
  head: React.ReactNode;
  body: React.ReactNode;
  hasMouseOver: boolean;
}) {
  return (
    <span>
      {hasMouseOver && (
        <div
          style={{
            display: "inline",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              backgroundColor: colors.backgroundDark,
              border: `1px solid black`,
              padding: "0 1ch",
            }}
          >
            {body}
          </div>
        </div>
      )}
      {head}
    </span>
  );
}

function Details({ term }: { term: Term }) {
  const { getValue, getType, checks } = React.useContext(ProgramContext);
  const type = getType(term);
  const value = getValue(term);
  const mismatchedArgument = checks.mismatchedArgument.get(term);
  const isNotAFunction = checks.isNotAFunction.get(term);
  return (
    <>
      <div>: {type && <Term term={type} parens={false} path={["", ""]} />}</div>
      <div>
        = {value && <Term term={value} parens={false} path={["", ""]} />}
      </div>
      {mismatchedArgument && (
        <>
          <div style={{ color: colors.red }}>
            the type of the argument is not compatible
          </div>
          <div style={{ paddingLeft: "2ch" }}>
            expected:{" "}
            <Term
              term={mismatchedArgument.expected}
              parens={false}
              path={["", ""]}
            />
          </div>
          <div style={{ paddingLeft: "2ch" }}>
            detected:{" "}
            <Term
              term={mismatchedArgument.detected}
              parens={false}
              path={["", ""]}
            />
          </div>
        </>
      )}
      {isNotAFunction && (
        <>
          <div style={{ color: colors.red }}>is not a function</div>
          <div style={{ paddingLeft: "2ch" }}>
            detected:{" "}
            <Term
              term={isNotAFunction.detected}
              parens={false}
              path={["", ""]}
            />
          </div>
        </>
      )}
    </>
  );
}

function Reference({ term, path }: { term: Reference; path: TermPath }) {
  const editor = React.useContext(EditorContext);
  const { hasError } = React.useContext(ProgramContext);
  const [hasMouseOver, setHasMouseOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const hasCursor = isSamePath(path, editor.state.cursor);
  React.useLayoutEffect(() => {
    if (hasCursor) inputRef.current?.focus();
  }, [hasCursor]);
  return (
    <Hoverable
      hasMouseOver={hasMouseOver}
      head={
        <input
          ref={inputRef}
          style={{
            ...styleInputSeamless,
            width: `${term.reference.length || 1}ch`,
            backgroundColor: hasMouseOver
              ? colors.backgroundDark
              : styleInputSeamless.backgroundColor,
            borderBottom: hasError(term) ? `2px solid ${colors.red}` : "none",
          }}
          onMouseOver={() => setHasMouseOver(true)}
          onMouseLeave={() => setHasMouseOver(false)}
          value={term.reference}
          onChange={(event) => {
            if (/^[a-zA-Z0-9?]*$/.test(event.currentTarget.value)) {
              const program = setByPath(
                path,
                {
                  type: "reference",
                  reference: event.currentTarget.value,
                },
                editor.program
              );
              if (program) {
                editor.action.setProgram(program);
              }
            }
          }}
          onKeyDown={(event) => {
            const parentPath = path.slice(0, -1);
            const leafPath = path[path.length - 1];
            const parent = getByPath(parentPath, editor.program);
            if (event.key === " ") {
              event.preventDefault();
              if (parent?.type === "application" && leafPath === "right") {
                const program = setByPath(
                  parentPath,
                  {
                    type: "application",
                    left: parent,
                    right: { type: "reference", reference: "" },
                  },
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor([...parentPath, "right"]);
                }
              } else {
                const program = setByPath(
                  path,
                  {
                    type: "application",
                    left: term,
                    right: { type: "reference", reference: "" },
                  },
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor([...path, "right"]);
                }
              }
            } else if (event.key === "Backspace" && term.reference === "") {
              if (parent?.type === "application" && leafPath === "right") {
                event.preventDefault();
                const program = setByPath(
                  parentPath,
                  parent.left,
                  editor.program
                );
                if (program) {
                  editor.action.setProgram(program);
                  editor.action.setCursor(parentPath);
                }
              }
            }
          }}
          onClick={() => {
            editor.action.setCursor(path);
          }}
        />
      }
      body={<Details term={term} />}
    />
  );
}

function Arrow({
  term,
  parens,
  path,
}: {
  term: Arrow;
  parens: boolean;
  path: TermPath;
}) {
  const { hasError } = React.useContext(ProgramContext);
  const [hasMouseOver, setHasMouseOver] = React.useState(false);
  return (
    <Hoverable
      hasMouseOver={hasMouseOver}
      head={
        <span
          style={{
            backgroundColor: hasMouseOver ? colors.backgroundDark : "",
            borderBottom: hasError(term) ? `2px solid ${colors.red}` : "",
          }}
        >
          {parens && "("}
          {term.head ? (
            <>
              ({term.head} :{" "}
              {
                <Term
                  term={term.from}
                  parens={false}
                  path={[...path, "from"]}
                />
              }
              )
            </>
          ) : (
            <Term term={term.from} parens={true} path={[...path, "from"]} />
          )}{" "}
          <span
            onMouseOver={() => setHasMouseOver(true)}
            onMouseLeave={() => setHasMouseOver(false)}
          >
            {"->"}
          </span>{" "}
          <Term term={term.to} parens={false} path={[...path, "to"]} />
          {parens && ")"}
        </span>
      }
      body={<Details term={term} />}
    />
  );
}

function Application({
  term,
  parens,
  path,
}: {
  term: Application;
  parens: boolean;
  path: TermPath;
}) {
  const { hasError } = React.useContext(ProgramContext);
  const [hasMouseOver, setHasMouseOver] = React.useState(false);
  return (
    <Hoverable
      hasMouseOver={hasMouseOver}
      head={
        <span
          style={{
            backgroundColor: hasMouseOver ? colors.backgroundDark : "",
            borderBottom: hasError(term) ? `2px solid ${colors.red}` : "",
          }}
        >
          {parens && "("}
          <Term
            term={term.left}
            parens={term.left.type !== "application"}
            path={[...path, "left"]}
          />
          <span
            onMouseOver={() => setHasMouseOver(true)}
            onMouseLeave={() => setHasMouseOver(false)}
          >
            {" "}
          </span>
          <Term term={term.right} parens={true} path={[...path, "right"]} />
          {parens && ")"}
        </span>
      }
      body={<Details term={term} />}
    />
  );
}

function Term({
  term,
  parens,
  path,
}: {
  term: Term;
  parens: boolean;
  path: TermPath;
}) {
  switch (term.type) {
    case "reference":
      return <Reference term={term} path={path} />;
    case "arrow":
      return <Arrow term={term} parens={parens} path={path} />;
    case "application": {
      return <Application term={term} parens={parens} path={path} />;
    }
  }
}

function Program({ program }: { program: Program }) {
  const editor = React.useContext(EditorContext);
  return (
    <ProgramContext.Provider value={fromProgram(program)}>
      {Object.entries(program).map(([k, { type, value }]) => {
        return (
          <React.Fragment key={k}>
            <div>
              {k}
              {type && (
                <>
                  {" "}
                  : <Term term={type} parens={false} path={[k, "type"]} />
                </>
              )}
              {value && (
                <>
                  {" "}
                  = <Term term={value} parens={false} path={[k, "value"]} />
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </ProgramContext.Provider>
  );
}

type EditorState = {
  cursor: TermPath;
};

function useEditor() {
  const [program, setProgram] = React.useState<Program>(defaultProgram);
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

const EditorContext = React.createContext<ReturnType<typeof useEditor>>(
  null as any
);

export default function App() {
  const editor = useEditor();
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "auto",
        boxSizing: "border-box",
        backgroundColor: colors.background,
        color: colors.white,
        padding: "1em",
        whiteSpace: "pre",
      }}
    >
      <EditorContext.Provider value={editor}>
        <Program program={editor.program} />
      </EditorContext.Provider>
    </div>
  );
}

const defaultProgram: Program = {
  // x: { type: { type: "reference", reference: "X" }, value: null },
  // y: { type: { type: "reference", reference: "Y" }, value: null },
  // f: {
  //   type: {
  //     type: "arrow",
  //     from: { type: "reference", reference: "X" },
  //     to: { type: "reference", reference: "Y" }
  //   },
  //   value: null
  // },
  // g: {
  //   type: {
  //     type: "arrow",
  //     from: { type: "reference", reference: "Y" },
  //     to: { type: "reference", reference: "X" }
  //   },
  //   value: null
  // },
  // v1: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: { type: "reference", reference: "f" },
  //     right: { type: "reference", reference: "x" }
  //   }
  // },
  // v2: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: { type: "reference", reference: "f" },
  //     right: { type: "reference", reference: "y" }
  //   }
  // },
  // v3: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: { type: "reference", reference: "g" },
  //     right: { type: "reference", reference: "x" }
  //   }
  // },
  // v4: {
  //   type: null,
  //   value: { type: "reference", reference: "x" }
  // },
  // f2: {
  //   type: {
  //     type: "arrow",
  //     from: { type: "reference", reference: "X" },
  //     to: {
  //       type: "arrow",
  //       from: { type: "reference", reference: "X" },
  //       to: { type: "reference", reference: "Y" }
  //     }
  //   },
  //   value: null
  // },
  // v5: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: { type: "reference", reference: "f2" },
  //     right: { type: "reference", reference: "x" }
  //   }
  // },
  // v6: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: { type: "reference", reference: "f2" },
  //     right: { type: "reference", reference: "y" }
  //   }
  // },
  // v7: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: {
  //       type: "application",
  //       left: { type: "reference", reference: "f2" },
  //       right: { type: "reference", reference: "x" }
  //     },
  //     right: { type: "reference", reference: "y" }
  //   }
  // },
  // ft1: {
  //   type: null,
  //   value: {
  //     type: "arrow",
  //     from: { type: "reference", reference: "X" },
  //     to: { type: "reference", reference: "Y" }
  //   }
  // },
  // f3: {
  //   type: {
  //     type: "arrow",
  //     from: { type: "reference", reference: "X" },
  //     to: { type: "reference", reference: "ft1" }
  //   },
  //   value: null
  // },
  // v8: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: {
  //       type: "application",
  //       left: { type: "reference", reference: "f3" },
  //       right: { type: "reference", reference: "x" }
  //     },
  //     right: { type: "reference", reference: "y" }
  //   }
  // },
  // v9: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: { type: "reference", reference: "x" },
  //     right: { type: "reference", reference: "y" }
  //   }
  // },
  // v10: {
  //   type: null,
  //   value: {
  //     type: "application",
  //     left: {
  //       type: "application",
  //       left: { type: "reference", reference: "f" },
  //       right: { type: "reference", reference: "x" }
  //     },
  //     right: { type: "reference", reference: "x" }
  //   }
  // },
  boolean: {
    type: { type: "reference", reference: "type" },
    value: null,
  },
  true: {
    type: { type: "reference", reference: "boolean" },
    value: null,
  },
  false: {
    type: { type: "reference", reference: "boolean" },
    value: null,
  },
  natural: {
    type: { type: "reference", reference: "type" },
    value: null,
  },
  zero: {
    type: { type: "reference", reference: "natural" },
    value: null,
  },
  successive: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "natural" },
      to: { type: "reference", reference: "natural" },
    },
    value: null,
  },
  "0n": {
    type: null,
    value: { type: "reference", reference: "zero" },
  },
  "1n": {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "successive" },
      right: { type: "reference", reference: "0n" },
    },
  },
  "2n": {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "successive" },
      right: { type: "reference", reference: "1n" },
    },
  },
  maybe: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "type" },
      to: { type: "reference", reference: "type" },
    },
    value: null,
  },
  nothing: {
    type: {
      type: "arrow",
      head: "t",
      from: { type: "reference", reference: "type" },
      to: {
        type: "application",
        left: { type: "reference", reference: "maybe" },
        right: { type: "reference", reference: "t" },
      },
    },
    value: null,
  },
  just: {
    type: {
      type: "arrow",
      head: "t",
      from: { type: "reference", reference: "type" },
      to: {
        type: "arrow",
        head: "v",
        from: { type: "reference", reference: "t" },
        to: {
          type: "application",
          left: { type: "reference", reference: "maybe" },
          right: { type: "reference", reference: "t" },
        },
      },
    },
    value: null,
  },
  m1: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "nothing" },
      right: { type: "reference", reference: "boolean" },
    },
  },
  m2: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: { type: "reference", reference: "boolean" },
      },
      right: { type: "reference", reference: "true" },
    },
  },
  m3: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: { type: "reference", reference: "boolean" },
      },
      right: { type: "reference", reference: "zero" },
    },
  },
  m4: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: {
          type: "application",
          left: { type: "reference", reference: "maybe" },
          right: { type: "reference", reference: "boolean" },
        },
      },
      right: { type: "reference", reference: "m2" },
    },
  },
  m5: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: {
          type: "application",
          left: { type: "reference", reference: "maybe" },
          right: { type: "reference", reference: "natural" },
        },
      },
      right: { type: "reference", reference: "m2" },
    },
  },
  maybeMap: {
    type: {
      type: "arrow",
      head: "a",
      from: { type: "reference", reference: "type" },
      to: {
        type: "arrow",
        head: "b",
        from: { type: "reference", reference: "type" },
        to: {
          type: "arrow",
          head: "f",
          from: {
            type: "arrow",
            from: { type: "reference", reference: "a" },
            to: { type: "reference", reference: "b" },
          },
          to: {
            type: "arrow",
            head: "m",
            from: {
              type: "application",
              left: { type: "reference", reference: "maybe" },
              right: { type: "reference", reference: "a" },
            },
            to: {
              type: "application",
              left: { type: "reference", reference: "maybe" },
              right: { type: "reference", reference: "b" },
            },
          },
        },
      },
    },
    value: null,
  },
  mm2: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "boolean" },
      to: { type: "reference", reference: "natural" },
    },
    value: null,
  },
  mm3: {
    type: null,
    value: { type: "reference", reference: "maybeMap" },
  },
};
