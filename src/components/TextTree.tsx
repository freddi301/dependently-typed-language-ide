import React, { useState } from "react";
import { colors } from "../App";

export type Tree = Single | Double | Multiple;
type Single = { type: "single"; text: string };
type Double = { type: "double"; separator: string; first: Tree; second: Tree };
type Multiple = {
  type: "multiple";
  separator: string;
  parenthesis: { left: string; right: string };
  elements: Array<Tree>;
};

type Line = { level: number; content: Array<Tree | string | null> };

type Params = {
  indentation: string;
  maxColumns: number;
};

export function make({ indentation, maxColumns }: Params) {
  function getInlineLength(tree: Tree): number {
    switch (tree.type) {
      case "single":
        return tree.text.length;
      case "double":
        return (
          getInlineLength(tree.first) +
          tree.separator.length +
          getInlineLength(tree.second)
        );
      case "multiple":
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
    const remainingColumns = maxColumns - level * indentation.length;
    switch (tree.type) {
      case "single":
        return [{ level, content: [tree, separator] }];
      case "double": {
        if (getInlineLength(tree) <= remainingColumns) {
          return [{ level, content: [tree, separator] }];
        } else if (getInlineLength(tree.first) <= remainingColumns) {
          if (
            tree.second.type === "double" &&
            getInlineLength(tree.second.first) <=
              remainingColumns - getInlineLength(tree.first)
          ) {
            return [
              {
                level,
                content: [
                  tree.first,
                  tree.separator,
                  tree.second.first,
                  tree.second.separator,
                ],
              },
              ...getLines(tree.second.second, level + 1, separator),
            ];
          } else if (
            tree.second.type === "multiple" &&
            getInlineLength(tree.second) >
              remainingColumns - getInlineLength(tree.first)
          ) {
            const treeSecond = tree.second;
            return [
              {
                level,
                content: [
                  tree.first,
                  tree.separator,
                  tree.second.parenthesis.left,
                ],
              },
              ...treeSecond.elements.flatMap((element, index, array) => {
                return getLines(
                  element,
                  level + 1,
                  treeSecond.separator
                  // index < array.length - 1 ? tree.separator : null
                );
              }),
              { level, content: [tree.second.parenthesis.right, separator] },
            ];
          }
          return [
            {
              level,
              content: [tree.first, tree.separator],
            },
            ...getLines(tree.second, level + 1, separator),
          ];
        } else {
          return [
            ...getLines(tree.first, level + 1, tree.separator),
            ...getLines(tree.second, level + 1, separator),
          ];
        }
      }
      case "multiple": {
        if (getInlineLength(tree) <= remainingColumns) {
          return [{ level, content: [tree, separator] }];
        }
        const children = tree.elements.flatMap((element, index, array) => {
          return getLines(
            element,
            level + 1,
            tree.separator
            // index < array.length - 1 ? tree.separator : null
          );
        });
        return [
          { level, content: [tree.parenthesis.left] },
          ...children,
          { level, content: [tree.parenthesis.right, separator] },
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
  if (typeof textArray === "string") return { type: "single", text: textArray };
  if (textArray instanceof Array)
    return {
      type: "multiple",
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
            {line.content.map((content, index) => {
              switch (typeof content) {
                case "string":
                  return content;
                case "object":
                  return (
                    content && <ViewInlineTree key={index} tree={content} />
                  );
                default:
                  return null;
              }
            })}
          </div>
        );
      })}
    </>
  );
}

function ViewInlineTree({ tree }: { tree: Tree }) {
  switch (tree.type) {
    case "single":
      return <>{tree.text}</>;
    case "double":
      return (
        <>
          <ViewInlineTree tree={tree.first} />
          {tree.separator}
          <ViewInlineTree tree={tree.second} />
        </>
      );
    case "multiple": {
      const { parenthesis, separator } = tree;
      return (
        <>
          {parenthesis.left}
          {tree.elements.map((element, index, array) => {
            return (
              <React.Fragment key={index}>
                <ViewInlineTree tree={element} />
                {index < array.length - 1 && separator}
              </React.Fragment>
            );
          })}
          {parenthesis.right}
        </>
      );
    }
  }
}

// export function SimpleTest() {
//   const [maxColumns, setMaxColumns] = useState(20);
//   const params = {
//     indentation: "  ",
//     separator: ", ",
//     parenthesis: { left: "(", right: ")" },
//     maxColumns,
//   };
//   const lines = make(params).getLines(
//     textArrayToTree(
//       [
//         "a",
//         "b",
//         "c",
//         ["d", "e"],
//         "f",
//         ["g", ["h", ["i", ["j", "k"]]]],
//         [["l", "m", "n", "o"], "p", ["q", "r", ["s", "t"]]],
//         "u",
//       ],
//       { separator: ", ", parenthesis: { left: "[", right: "]" } }
//     ),
//     0,
//     null
//   );
//   return (
//     <div
//       style={{
//         width: "100vw",
//         height: "100vh",
//         backgroundColor: colors.background,
//         color: colors.white,
//         whiteSpace: "pre",
//       }}
//     >
//       <input
//         type="number"
//         value={maxColumns}
//         onChange={(event) => setMaxColumns(Number(event.currentTarget.value))}
//       />
//       <ViewLines lines={lines} params={params} showLineNumbers={true} />
//     </div>
//   );
// }
