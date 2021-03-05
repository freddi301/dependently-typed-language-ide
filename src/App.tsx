import React, { useState } from "react";
import * as TextTree from "./components/TextTree";
import * as Source from "./core/Source";

function getTextTreeFromSource(source: Source.Term): TextTree.Tree {
  switch (source.type) {
    case "reference":
      return { type: "single", text: source.reference };
    case "pi": {
      const flattened = flattenPi({ collected: [], source });
      return {
        type: "double",
        separator: " -> ",
        first: {
          type: "multiple",
          separator: ", ",
          parenthesis: { left: "(", right: ")" },
          elements: flattened.collected.map(({ head, from }) => {
            return head
              ? {
                  type: "double",
                  separator: " : ",
                  first: { type: "single", text: head },
                  second: getTextTreeFromSource(from),
                }
              : getTextTreeFromSource(from);
          }),
        },
        second: getTextTreeFromSource(flattened.source),
      };
    }
    case "application": {
      const flattened = flattenApplication(source);
      return {
        type: "multiple",
        separator: " ",
        parenthesis: {
          left: "(",
          right: ")",
        },
        elements: flattened.map(getTextTreeFromSource),
      };
    }
  }
}

type FlattenedPi = {
  collected: Array<{ head: string; from: Source.Term }>;
  source: Source.Term;
};
function flattenPi({ collected, source }: FlattenedPi): FlattenedPi {
  switch (source.type) {
    case "pi":
      return flattenPi({
        collected: [...collected, { head: source.head, from: source.from }],
        source: source.to,
      });
    default:
      return { collected, source };
  }
}

// ((a b) c) d
// [a, b, c, d]
function flattenApplication(source: Source.Term): Array<Source.Term> {
  switch (source.type) {
    case "application":
      return [...flattenApplication(source.left), source.right];
    default:
      return [source];
  }
}

export default function App() {
  const [maxColumns, setMaxColumns] = useState(40);
  const params = {
    indentation: "  ",
    maxColumns,
  };
  const lines = TextTree.make(params).getLines(
    getTextTreeFromSource(sampleSource),
    0,
    null
  );
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: colors.background,
        color: colors.white,
        whiteSpace: "pre",
      }}
    >
      <input
        type="number"
        value={maxColumns}
        onChange={(event) => setMaxColumns(Number(event.currentTarget.value))}
      />
      <TextTree.ViewLines
        lines={lines}
        params={params}
        showLineNumbers={true}
      />
    </div>
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
  outline: "none",
};

const sampleSource: Source.Term = {
  type: "pi",
  head: "boolean",
  from: { type: "reference", reference: "type" },
  to: {
    type: "pi",
    head: "true",
    from: { type: "reference", reference: "boolean" },
    to: {
      type: "pi",
      head: "false",
      from: { type: "reference", reference: "boolean" },
      to: {
        type: "pi",
        head: "not",
        from: {
          type: "pi",
          head: "",
          from: { type: "reference", reference: "boolean" },
          to: { type: "reference", reference: "boolean" },
        },
        to: {
          type: "pi",
          head: "and",
          from: {
            type: "pi",
            head: "",
            from: { type: "reference", reference: "boolean" },
            to: {
              type: "pi",
              head: "",
              from: { type: "reference", reference: "boolean" },
              to: { type: "reference", reference: "boolean" },
            },
          },
          to: {
            type: "pi",
            head: "or",
            from: {
              type: "pi",
              head: "",
              from: { type: "reference", reference: "boolean" },
              to: {
                type: "pi",
                head: "",
                from: { type: "reference", reference: "boolean" },
                to: { type: "reference", reference: "boolean" },
              },
            },
            to: {
              type: "application",
              left: { type: "reference", reference: "not" },
              right: {
                type: "application",
                left: {
                  type: "application",
                  left: { type: "reference", reference: "and" },
                  right: { type: "reference", reference: "false" },
                },
                right: { type: "reference", reference: "true" },
              },
            },
          },
        },
      },
    },
  },
};
