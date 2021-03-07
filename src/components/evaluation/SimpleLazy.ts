import { TermTemplate } from "../TermTemplate";

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

export function evaluate([term]: Term): Term {
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
