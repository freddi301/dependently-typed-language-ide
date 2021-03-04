import React from "react";

type Tree = Leaf | Branch;
type Leaf = { type: "leaf"; text: string };
type Branch = { type: "branch"; elements: Array<Tree> };

type Line =
  | { type: "tree"; level: number; tree: Tree }
  | { type: "parenthesis"; level: number; parenthesis: "left" | "right" };

type Params = {
  indentation: string;
  separator: string;
  parenthesis: { left: string; right: string };
  maxColumns: number;
};

export function make({
  indentation,
  parenthesis,
  separator,
  maxColumns,
}: Params) {
  function getInlineLength(tree: Tree): number {
    switch (tree.type) {
      case "leaf":
        return tree.text.length;
      case "branch":
        return (
          tree.elements.reduce(
            (memo, item) => memo + getInlineLength(item),
            0
          ) +
          (separator.length * tree.elements.length - 1)
        );
    }
  }

  function getLines(tree: Tree, level: number): Array<Line> {
    switch (tree.type) {
      case "leaf":
        return [{ type: "tree", level, tree }];
      case "branch": {
        if (getInlineLength(tree) <= maxColumns - level * indentation.length) {
          return [{ type: "tree", level, tree }];
        }
        return [
          { type: "parenthesis", level, parenthesis: "left" },
          ...tree.elements.flatMap((element) => {
            return getLines(element, level + 1);
          }),
          { type: "parenthesis", level, parenthesis: "right" },
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
export function textArrayToTree(textArray: TextArray): Tree {
  if (typeof textArray === "string") return { type: "leaf", text: textArray };
  if (textArray instanceof Array)
    return { type: "branch", elements: textArray.map(textArrayToTree) };
  throw new Error();
}

export function ViewLines({
  lines,
  params,
}: {
  lines: Array<Line>;
  params: Params;
}) {
  const { indentation, separator, parenthesis } = params;
  return (
    <>
      {lines.map((line, index) => {
        return (
          <div key={index}>
            {indentation.repeat(line.level)}
            {(() => {
              switch (line.type) {
                case "tree":
                  return (
                    <>
                      <ViewInlineTree tree={line.tree} params={params} />
                      {separator}
                    </>
                  );
                case "parenthesis": {
                  switch (line.parenthesis) {
                    case "left":
                      return parenthesis.left;
                    case "right":
                      return (
                        <>
                          {parenthesis.right}
                          {separator}
                        </>
                      );
                  }
                }
              }
            })()}
          </div>
        );
      })}
    </>
  );
}

function ViewInlineTree({ tree, params }: { tree: Tree; params: Params }) {
  const { parenthesis, separator } = params;
  switch (tree.type) {
    case "leaf":
      return <span>{tree.text}</span>;
    case "branch": {
      return (
        <>
          {parenthesis.left}
          {tree.elements.map((element, index, array) => {
            return (
              <React.Fragment key={index}>
                <ViewInlineTree tree={element} params={params} />
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
