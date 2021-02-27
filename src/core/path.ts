import { Program, Term } from "./program";

export type TermPath = Array<string>;

function getByRelativePath(path: TermPath, term: Term): Term | null {
  const [head, ...tail] = path;
  if (!head) return term;
  switch (term.type) {
    case "reference": {
      return null;
    }
    case "arrow": {
      switch (head) {
        case "from":
          return getByRelativePath(tail, term.from);
        case "to":
          return getByRelativePath(tail, term.to);
        default:
          return null;
      }
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
  }
}

export function getByPath(path: TermPath, program: Program): Term | null {
  const [key, level, ...relative] = path;
  if (!key) return null;
  const first = program[key];
  if (!first) return null;
  switch (level) {
    case "type": {
      if (first.type) {
        return getByRelativePath(relative, first.type);
      } else {
        return null;
      }
    }
    case "value": {
      if (first.value) {
        return getByRelativePath(relative, first.value);
      } else {
        return null;
      }
    }
    default:
      return null;
  }
}

function setByRelativePath(
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
    case "arrow": {
      switch (head) {
        case "from": {
          const from = setByRelativePath(tail, replacement, term.from);
          return from
            ? {
                type: "arrow",
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
                type: "arrow",
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
  }
}

export function setByPath(
  path: TermPath,
  replacement: Term,
  program: Program
): Program | null {
  const [key, level, ...relative] = path;
  if (!key) return null;
  const first = program[key];
  if (!first) return null;
  switch (level) {
    case "type": {
      const type = first.type
        ? setByRelativePath(relative, replacement, first.type)
        : null;
      return type
        ? {
            ...program,
            [key]: {
              type,
              value: first.value,
            },
          }
        : null;
    }
    case "value": {
      const value = first.value
        ? setByRelativePath(relative, replacement, first.value)
        : null;
      return value
        ? {
            ...program,
            [key]: {
              type: first.type,
              value,
            },
          }
        : null;
    }
    default:
      return null;
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
