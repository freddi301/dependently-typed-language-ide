import React, { useState } from "react";
import { colors } from "../App";

export type Tree = Leaf | Branch;
type Leaf = { type: "leaf"; text: string };
type Branch = {
  type: "branch";
  separator: string;
  parenthesis: { left: string; right: string };
  elements: Array<Tree>;
};

type Line =
  | { type: "tree"; level: number; tree: Tree; separator: string | null }
  | {
      type: "open";
      level: number;
      parenthesis: { left: string; right: string };
    }
  | {
      type: "close";
      level: number;
      parenthesis: { left: string; right: string };
      separator: string | null;
    };

type Params = {
  indentation: string;
  maxColumns: number;
};

export function make({ indentation, maxColumns }: Params) {
  function getInlineLength(tree: Tree): number {
    switch (tree.type) {
      case "leaf":
        return tree.text.length;
      case "branch":
        return tree.elements.reduce(
          (memo, item) => memo + getInlineLength(item),
          tree.parenthesis.left.length +
            tree.parenthesis.right.length +
            Math.min(0, tree.separator.length * tree.elements.length - 1)
        );
    }
  }
  function getLines(
    tree: Tree,
    level: number,
    separator: string | null
  ): Array<Line> {
    switch (tree.type) {
      case "leaf":
        return [{ type: "tree", level, tree, separator }];
      case "branch": {
        if (getInlineLength(tree) <= maxColumns - level * indentation.length) {
          return [{ type: "tree", level, tree, separator }];
        }
        const children = tree.elements.flatMap((element, index, array) => {
          return getLines(
            element,
            level + 1,
            index < array.length - 1 ? tree.separator : null
          );
        });
        return [
          { type: "open", level, parenthesis: tree.parenthesis },
          ...children,
          { type: "close", level, parenthesis: tree.parenthesis, separator },
        ];
      }
    }
  }
  return {
    getLines,
    getInlineLength,
  };
}

type TextArray = string | Array<TextArray>;
export function textArrayToTree(
  textArray: TextArray,
  {
    separator,
    parenthesis,
  }: { separator: string; parenthesis: { left: string; right: string } }
): Tree {
  if (typeof textArray === "string") return { type: "leaf", text: textArray };
  if (textArray instanceof Array)
    return {
      type: "branch",
      separator,
      parenthesis,
      elements: textArray.map((element) =>
        textArrayToTree(element, { separator, parenthesis })
      ),
    };
  throw new Error();
}

export function ViewLines({
  lines,
  params,
  showLineNumbers,
}: {
  lines: Array<Line>;
  params: Params;
  showLineNumbers: boolean;
}) {
  const { indentation } = params;
  const lineNumberWidth = `${String(lines.length).length}ch`;
  const lineNumber = (n: number) =>
    showLineNumbers ? (
      <span
        style={{
          textAlign: "right",
          width: lineNumberWidth,
          userSelect: "none",
          display: "inline-block",
          marginRight: "1ch",
        }}
      >
        {n}
      </span>
    ) : null;
  return (
    <>
      {lines.map((line, index) => {
        return (
          <div key={index}>
            {lineNumber(index + 1)}
            {indentation.repeat(line.level)}
            {(() => {
              switch (line.type) {
                case "tree":
                  return (
                    <>
                      <ViewInlineTree tree={line.tree} />
                      {line.separator}
                    </>
                  );
                case "open": {
                  return <>{line.parenthesis.left}</>;
                }
                case "close": {
                  return (
                    <>
                      {line.parenthesis.right}
                      {line.separator}
                    </>
                  );
                }
              }
            })()}
          </div>
        );
      })}
    </>
  );
}

function ViewInlineTree({ tree }: { tree: Tree }) {
  switch (tree.type) {
    case "leaf":
      return <span>{tree.text}</span>;
    case "branch": {
      const { parenthesis, separator } = tree;
      return (
        <>
          {parenthesis?.left}
          {tree.elements.map((element, index, array) => {
            return (
              <React.Fragment key={index}>
                <ViewInlineTree tree={element} />
                {index < array.length - 1 && separator}
              </React.Fragment>
            );
          })}
          {parenthesis?.right}
        </>
      );
    }
  }
}

export function SimpleTest() {
  const [maxColumns, setMaxColumns] = useState(20);
  const params = {
    indentation: "  ",
    separator: ", ",
    parenthesis: { left: "(", right: ")" },
    maxColumns,
  };
  const lines = make(params).getLines(
    textArrayToTree(
      [
        "a",
        "b",
        "c",
        ["d", "e"],
        "f",
        ["g", ["h", ["i", ["j", "k"]]]],
        [["l", "m", "n", "o"], "p", ["q", "r", ["s", "t"]]],
        "u",
      ],
      { separator: ", ", parenthesis: { left: "[", right: "]" } }
    ),
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
      <ViewLines lines={lines} params={params} showLineNumbers={true} />
    </div>
  );
}
