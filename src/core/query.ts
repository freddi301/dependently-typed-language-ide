import * as Source from "./source";
import * as Path from "./path";

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

export function allIdentifiersInScope(source: Source.Scope, path: Path.Absolute): Set<string> {
  const all = new Set<string>();
  const term = Source.fluentScope(source).get(Path.fluent({ entry: path.entry, level: path.level, relative: [] }).path).term;
  const exploreTerm = (term: Source.Term, path: Path.Relative): void => {
    const [head, ...tail] = path;
    if (!head) return;
    switch (term.type) {
      case "application": {
        switch (head) {
          case "left":
            return exploreTerm(term.left, tail);
          case "right":
            return exploreTerm(term.left, tail);
          default:
            throw new Error();
        }
      }
      case "pi": {
        switch (head) {
          case "from":
            return exploreTerm(term.from, tail);
          case "to": {
            all.add(term.head);
            return exploreTerm(term.to, tail);
          }
          default:
            throw new Error();
        }
      }
      case "lambda": {
        switch (head) {
          case "from":
            return exploreTerm(term.from, tail);
          case "body": {
            all.add(term.head);
            return exploreTerm(term.body, tail);
          }
          default:
            throw new Error();
        }
      }
    }
  };
  exploreTerm(term, path.relative);
  for (const [entry] of Object.entries(source)) {
    all.add(entry);
  }
  return all;
}
