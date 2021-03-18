import * as Source from "./source";
import * as Path from "./path";

export type Term = { path: Path.Path | null; scope: Scope } & (
  | { type: "free"; identifier: string }
  | { type: "type"; universe: number }
  | { type: "reference"; identifier: string; type_: Term }
  | { type: "application"; left: Term; right: Term }
  | { type: "pi"; head: string; from: Term; to: Term }
  | { type: "lambda"; head: string; from: Term; body: Term }
  | { type: "let"; head: string; from: Term; left: Term; right: Term }
);

type Scope = Record<string, Term>;

export function prepare(term: Source.Term, scope: Scope, path: Path.Path): Term {
  switch (term.type) {
    case "type": {
      return { type: "type", universe: term.universe, path, scope };
    }
    case "reference": {
      const type_ = scope[term.identifier];
      if (type_) {
        return { type: "reference", identifier: term.identifier, type_, path, scope };
      } else {
        return { type: "free", identifier: term.identifier, path, scope };
      }
    }
    case "application": {
      return {
        type: "application",
        left: prepare(term.left, scope, Path.child(path, "left")),
        right: prepare(term.right, scope, Path.child(path, "right")),
        path,
        scope,
      };
    }
    case "pi": {
      const from = prepare(term.from, scope, Path.child(path, "from"));
      const to = prepare(term.to, { ...scope, [term.head]: from }, Path.child(path, "to"));
      return {
        type: "pi",
        head: term.head,
        from,
        to,
        path,
        scope,
      };
    }
    case "lambda": {
      const from = prepare(term.from, scope, Path.child(path, "from"));
      const body = prepare(term.body, { ...scope, [term.head]: from }, Path.child(path, "body"));
      return {
        type: "lambda",
        head: term.head,
        from,
        body,
        path,
        scope,
      };
    }
    case "let": {
      const from = prepare(term.from, scope, Path.child(path, "from"));
      const left = prepare(term.left, scope, Path.child(path, "left"));
      const right = prepare(term.right, { ...scope, [term.head]: from }, Path.child(path, "right"));
      return {
        type: "let",
        head: term.head,
        from,
        left,
        right,
        path,
        scope,
      };
    }
  }
}

export function unprepare(term: Term): Source.Term {
  switch (term.type) {
    case "free": {
      return { type: "reference", identifier: term.identifier };
    }
    case "type": {
      return { type: "type", universe: term.universe };
    }
    case "reference": {
      return { type: "reference", identifier: term.identifier };
    }
    case "application": {
      const left = unprepare(term.left);
      const right = unprepare(term.right);
      return {
        type: "application",
        left,
        right,
      };
    }
    case "pi": {
      const from = unprepare(term.from);
      const to = unprepare(term.to);
      return {
        type: "pi",
        head: term.head,
        from,
        to,
      };
    }
    case "lambda": {
      const from = unprepare(term.from);
      const body = unprepare(term.body);
      return {
        type: "lambda",
        head: term.head,
        from,
        body,
      };
    }
    case "let": {
      const from = unprepare(term.from);
      const left = unprepare(term.left);
      const right = unprepare(term.right);
      return {
        type: "let",
        head: term.head,
        from,
        left,
        right,
      };
    }
  }
}

export function equals(a: Term, b: Term): boolean {
  switch (a.type) {
    case "free":
      return a.type === b.type && a.identifier === b.identifier;
    case "type":
      return a.type === b.type && a.universe === b.universe;
    case "reference":
      return a.type === b.type && a.identifier === b.identifier;
    case "application":
      return a.type === b.type && equals(a.left, b.left) && equals(a.right, b.right);
    case "pi":
      return false; // TODO nomral form + rename variables
    case "lambda":
      return false; // TODO normal form + rename variables
    case "let":
      return false; // TODO normal form + rename variables
  }
}

// TODO replace inside typescope too?
function replace(old: string, new_: Term, term: Term): Term {
  switch (term.type) {
    case "free": {
      return term;
    }
    case "type": {
      return term;
    }
    case "reference": {
      if (term.identifier === old) {
        return new_;
      } else {
        return { ...term, type_: replace(old, new_, term.type_) };
      }
    }
    case "application": {
      return {
        ...term,
        left: replace(old, new_, term.left),
        right: replace(old, new_, term.right),
      };
    }
    case "pi": {
      if (term.head === old) {
        return {
          ...term,
          from: replace(old, new_, term.from),
        };
      } else {
        return {
          ...term,
          from: replace(old, new_, term.from),
          to: replace(old, new_, term.to),
        };
      }
    }
    case "lambda": {
      if (term.head === old) {
        return {
          ...term,
          from: replace(old, new_, term.from),
        };
      } else {
        return {
          ...term,
          from: replace(old, new_, term.from),
          body: replace(old, new_, term.body),
        };
      }
    }
    case "let": {
      if (term.head === old) {
        return {
          ...term,
          from: replace(old, new_, term.from),
          left: replace(old, new_, term.left),
        };
      } else {
        return {
          ...term,
          from: replace(old, new_, term.from),
          left: replace(old, new_, term.left),
          right: replace(old, new_, term.right),
        };
      }
    }
  }
}

export const nullTerm: Term = { type: "free", identifier: "", scope: {}, path: null };
export function isNullTerm(term: Term): boolean {
  return term.type === "free" && term.identifier === "";
}

function getType(term: Term): Term | null {
  switch (term.type) {
    case "free": {
      return null;
    }
    case "type": {
      return { type: "type", universe: term.universe + 1, path: null, scope: term.scope };
    }
    case "reference": {
      return term.type_;
    }
    case "application": {
      const leftType = getType(term.left);
      const rightType = getType(term.right);
      if (leftType?.type === "pi" && rightType && equals(leftType.from, rightType)) {
        return replace(leftType.head, term.right, leftType.to);
      } else {
        return null;
      }
    }
    case "pi": {
      const fromType = getType(term.from);
      const toType = getType(term.to);
      if (fromType?.type === "type" && toType?.type === "type") {
        return {
          type: "type",
          universe: Math.max(fromType.universe, toType.universe),
          path: null,
          scope: term.scope,
        };
      } else {
        return null;
      }
    }
    case "lambda": {
      const to = getType(term.body);
      if (to) {
        return { type: "pi", head: term.head, from: term.from, to, path: null, scope: term.scope };
      } else {
        return null;
      }
    }
    case "let": {
      return getType(term.right);
    }
  }
}

function getValue(term: Term): Term {
  switch (term.type) {
    case "application": {
      const left = getValue(term.left);
      if (left.type === "lambda") {
        return getValue(replace(left.head, term.right, left.body));
      } else {
        return { ...term, left, path: null };
      }
    }
    case "let": {
      return getValue(replace(term.head, term.left, term.right));
    }
    case "free":
    case "reference":
    case "type":
    case "pi":
    case "lambda": {
      return { ...term, path: null };
    }
  }
}

let nextUID = 1;
function getUID() {
  return String(nextUID++);
}

function getNormal(term: Term): Term {
  term = getValue(term);
  switch (term.type) {
    case "let":
    case "free":
    case "type":
    case "reference": {
      return { ...term, path: null };
    }
    case "application": {
      return {
        ...term,
        left: getNormal(term.left),
        right: getNormal(term.right),
        path: null,
      };
    }
    case "pi": {
      const normalFrom = getNormal(term.from);
      const freeHead = getUID();
      const freeTo = replace(
        term.head,
        { type: "reference", identifier: freeHead, type_: normalFrom, path: null, scope: term.scope },
        term.to
      );
      const normalTo = getNormal(freeTo);
      const boundTo = replace(
        freeHead,
        { type: "reference", identifier: term.head, type_: normalFrom, path: null, scope: term.scope },
        normalTo
      );
      return { ...term, head: term.head, from: normalFrom, to: boundTo, path: null };
    }
    case "lambda": {
      const normalFrom = getNormal(term.from);
      const freeHead = getUID();
      const freeBody = replace(
        term.head,
        { type: "reference", identifier: freeHead, type_: normalFrom, path: null, scope: term.scope },
        term.body
      );
      const normalBody = getNormal(freeBody);
      const boundBody = replace(
        freeHead,
        { type: "reference", identifier: term.head, type_: normalFrom, path: null, scope: term.scope },
        normalBody
      );
      return { ...term, head: term.head, from: normalFrom, body: boundBody, path: null };
    }
  }
}

export function getNormalValue(term: Term) {
  return getNormal(getValue(term));
}

export function getNormalType(term: Term) {
  const type = getType(term);
  if (!type) return null;
  return getNormal(type);
}
