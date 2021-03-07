import { TermTemplate } from "../TermTemplate";
import { Lazy } from "../Lazy";

type Term = [TermTemplate<Step>];
type Step = Final | Replace;
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

export function evaluate([term]: Term): Term {
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
