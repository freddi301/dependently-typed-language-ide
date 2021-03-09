import { SourceTerm as Term } from "../App";

function replace(old: string, new_: Term, term: Term): Term {
  switch (term.type) {
    case "reference": {
      if (term.payload === old) return new_;
      else return { type: "reference", payload: term.payload };
    }
    case "application": {
      return {
        type: "application",
        payload: {
          left: replace(old, new_, term.payload.left),
          right: replace(old, new_, term.payload.right),
        },
      };
    }
    case "lambda": {
      if (term.payload.head === old)
        return {
          type: "lambda",
          payload: {
            head: term.payload.head,
            body: term.payload.body,
          },
        };
      else
        return {
          type: "lambda",
          payload: {
            head: term.payload.head,
            body: replace(old, new_, term.payload.body),
          },
        };
    }
  }
}

export function evaluate(term: Term): Term {
  switch (term.type) {
    case "reference":
      throw new Error(`cannot evaluate ${JSON.stringify(term)}`);
    case "application": {
      const left = evaluate(term.payload.left);
      if (left.type !== "lambda")
        throw new Error(`cannot evaluate ${JSON.stringify(term)}`);
      return evaluate(
        replace(left.payload.head, term.payload.right, left.payload.body)
      );
    }
    case "lambda":
      return term;
  }
}
