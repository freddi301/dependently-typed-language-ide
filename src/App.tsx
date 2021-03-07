import React from "react";

export default function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: colors.background,
        color: colors.white,
        whiteSpace: "pre",
      }}
    ></div>
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

type TermTemplate<Inside> =
  | { type: "reference"; reference: string }
  | { type: "application"; left: Inside; right: Inside }
  | { type: "lambda"; head: string; body: Inside };

namespace simple {
  type Term = [TermTemplate<Term>];
  function replace(old: string, new_: Term, [term]: Term): Term {
    switch (term.type) {
      case "reference": {
        if (term.reference === old) return new_;
        else return [{ type: "reference", reference: term.reference }];
      }
      case "application": {
        return [
          {
            type: "application",
            left: replace(old, new_, term.left),
            right: replace(old, new_, term.right),
          },
        ];
      }
      case "lambda": {
        if (term.head === old)
          return [
            {
              type: "lambda",
              head: term.head,
              body: term.body,
            },
          ];
        else
          return [
            {
              type: "lambda",
              head: term.head,
              body: replace(old, new_, term.body),
            },
          ];
      }
    }
  }
  function evaluate([term]: Term): Term {
    switch (term.type) {
      case "reference":
        throw new Error(`cannot evaluate ${JSON.stringify(term)}`);
      case "application": {
        const [left] = evaluate(term.left);
        if (left.type !== "lambda")
          throw new Error(`cannot evaluate ${JSON.stringify(term)}`);
        return evaluate(replace(left.head, term.right, left.body));
      }
      case "lambda":
        return [term];
    }
  }
}

namespace explorable {
  type Term = [TermTemplate<Step>];
  type Step = Final | Replace;
  class Lazy<T> {
    constructor(private operation: () => T) {}
    state: { type: "uncalculated" } | { type: "calculated"; value: T } = {
      type: "uncalculated",
    };
    get value() {
      switch (this.state.type) {
        case "calculated":
          return this.state.value;
        case "uncalculated": {
          const value = this.operation();
          this.state = { type: "calculated", value };
          return value;
        }
        default:
          throw new Error("invalid state");
      }
    }
  }
  interface Explorable<T> {
    inside: T;
  }
  class Final implements Explorable<Term> {
    constructor(public term: Term) {}
    get inside() {
      return this.term;
    }
  }
  class Replace implements Explorable<Term> {
    constructor(public old: string, public new_: Term, public term: Term) {}
    get inside() {
      return this.result.value;
    }
    result = new Lazy(
      (): Term => {
        const {
          old,
          new_,
          term: [term],
        } = this;
        switch (term.type) {
          case "reference": {
            if (term.reference === old) return new_;
            else return [{ type: "reference", reference: term.reference }];
          }
          case "application": {
            return [
              {
                type: "application",
                left: new Replace(old, new_, term.left.inside),
                right: new Replace(old, new_, term.right.inside),
              },
            ];
          }
          case "lambda": {
            if (term.head === old)
              return [
                {
                  type: "lambda",
                  head: term.head,
                  body: term.body,
                },
              ];
            else
              return [
                {
                  type: "lambda",
                  head: term.head,
                  body: new Replace(old, new_, term.body.inside),
                },
              ];
          }
        }
      }
    );
  }
  function evaluate([term]: Term): Term {
    switch (term.type) {
      case "reference":
        throw new Error(`cannot evaluate ${JSON.stringify(term)}`);
      case "application": {
        const [left] = evaluate(term.left.inside);
        if (left.type !== "lambda")
          throw new Error(`cannot evaluate ${JSON.stringify(term)}`);
        return evaluate(
          new Replace(left.head, term.right.inside, left.body.inside).inside
        );
      }
      case "lambda":
        return [term];
    }
  }
}
