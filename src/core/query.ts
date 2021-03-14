import * as Source from "./source";

export function allIdentifiers(source: Source.Scope): Set<string> {
  const all = new Set<string>();
  const exploreTerm = (term: Source.Term) => {
    switch (term.type) {
      case "reference": {
        all.add(term.identifier);
        break;
      }
      case "application": {
        exploreTerm(term.left);
        exploreTerm(term.right);
        break;
      }
      case "pi": {
        all.add(term.head);
        exploreTerm(term.from);
        exploreTerm(term.to);
        break;
      }
      case "lambda": {
        all.add(term.head);
        exploreTerm(term.from);
        exploreTerm(term.body);
      }
    }
  };
  for (const [entry, { type, value }] of Object.entries(source)) {
    all.add(entry);
    exploreTerm(type);
    exploreTerm(value);
  }
  return all;
}
