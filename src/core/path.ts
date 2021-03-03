import { Term } from "./program";

export type TermPath = Array<string>;

export function getByRelativePath(path: TermPath, term: Term): Term | null {
  const [head, ...tail] = path;
  if (!head) return term;
  switch (term.type) {
    case "reference": {
      return null;
    }
    case "application": {
      switch (head) {
        case "left":
          return getByRelativePath(tail, term.left);
        case "right":
          return getByRelativePath(tail, term.right);
        default:
          return null;
      }
    }
    case "pi": {
      switch (head) {
        case "from":
          return getByRelativePath(tail, term.from);
        case "to":
          return getByRelativePath(tail, term.to);
        default:
          return null;
      }
    }
    case "lambda": {
      switch (head) {
        case "from":
          return getByRelativePath(tail, term.from);
        case "body":
          return getByRelativePath(tail, term.body);
        default:
          return null;
      }
    }
  }
}

export function setByRelativePath(
  path: TermPath,
  replacement: Term,
  term: Term
): Term | null {
  const [head, ...tail] = path;
  if (!head) {
    return replacement;
  }
  switch (term.type) {
    case "reference": {
      return null;
    }
    case "application": {
      switch (head) {
        case "left": {
          const left = setByRelativePath(tail, replacement, term.left);
          return left
            ? {
                type: "application",
                left,
                right: term.right,
              }
            : null;
        }
        case "right": {
          const right = setByRelativePath(tail, replacement, term.right);
          return right
            ? {
                type: "application",
                left: term.left,
                right,
              }
            : null;
        }
        default:
          return null;
      }
    }
    case "pi": {
      switch (head) {
        case "from": {
          const from = setByRelativePath(tail, replacement, term.from);
          return from
            ? {
                type: "pi",
                head: term.head,
                from,
                to: term.to,
              }
            : null;
        }
        case "to": {
          const to = setByRelativePath(tail, replacement, term.to);
          return to
            ? {
                type: "pi",
                head: term.head,
                from: term.from,
                to,
              }
            : null;
        }
        default:
          return null;
      }
    }
    case "lambda": {
      switch (head) {
        case "from": {
          const from = setByRelativePath(tail, replacement, term.from);
          return from
            ? {
                type: "lambda",
                head: term.head,
                from,
                body: term.body,
              }
            : null;
        }
        case "body": {
          const body = setByRelativePath(tail, replacement, term.body);
          return body
            ? {
                type: "lambda",
                head: term.head,
                from: term.from,
                body,
              }
            : null;
        }
        default:
          return null;
      }
    }
  }
}

export function isSamePath(a: TermPath, b: TermPath) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
