import * as Source from "./source";
import * as Path from "./path";

export type Term =
  | { type: "free"; identifier: string; path: Path.Absolute | null; typeScope: Record<string, Term> }
  | { type: "type"; universe: number; path: Path.Absolute | null; typeScope: Record<string, Term> }
  | { type: "reference"; identifier: string; type_: Term; path: Path.Absolute | null; typeScope: Record<string, Term> }
  | { type: "application"; left: Term; right: Term; path: Path.Absolute | null; typeScope: Record<string, Term> }
  | { type: "pi"; head: string; from: Term; to: Term; path: Path.Absolute | null; typeScope: Record<string, Term> }
  | { type: "lambda"; head: string; from: Term; body: Term; path: Path.Absolute | null; typeScope: Record<string, Term> };

export type Scope = Record<string, { type: Term; value: Term }>;

function prepareTerm(term: Source.Term, typeScope: Record<string, Term>, path: Path.Absolute): Term {
  switch (term.type) {
    case "type": {
      return { type: "type", universe: term.universe, path, typeScope };
    }
    case "reference": {
      const type_ = typeScope[term.identifier];
      if (type_) {
        return { type: "reference", identifier: term.identifier, type_, path, typeScope };
      } else {
        return { type: "free", identifier: term.identifier, path, typeScope };
      }
    }
    case "application": {
      return {
        type: "application",
        left: prepareTerm(term.left, typeScope, Path.fluent(path).child("left").path),
        right: prepareTerm(term.right, typeScope, Path.fluent(path).child("right").path),
        path,
        typeScope,
      };
    }
    case "pi": {
      const from = prepareTerm(term.from, typeScope, Path.fluent(path).child("from").path);
      return {
        type: "pi",
        head: term.head,
        from,
        to: prepareTerm(term.to, { ...typeScope, [term.head]: from }, Path.fluent(path).child("to").path),
        path,
        typeScope,
      };
    }
    case "lambda": {
      const from = prepareTerm(term.from, typeScope, Path.fluent(path).child("from").path);
      return {
        type: "lambda",
        head: term.head,
        from,
        body: prepareTerm(term.body, { ...typeScope, [term.head]: from }, Path.fluent(path).child("body").path),
        path,
        typeScope,
      };
    }
  }
}

export function prepareScope(scope: Source.Scope): Scope {
  return Object.fromEntries(
    Object.entries(scope).map(([entry, { type, value }]) => {
      return [
        entry,
        {
          type: prepareTerm(type, {}, { entry, level: "type", relative: [] }),
          value: prepareTerm(value, {}, { entry, level: "value", relative: [] }),
        },
      ];
    })
  );
}

export function unprepareTerm(term: Term): Source.Term {
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
      return {
        type: "application",
        left: unprepareTerm(term.left),
        right: unprepareTerm(term.right),
      };
    }
    case "pi": {
      const from = unprepareTerm(term.from);
      return {
        type: "pi",
        head: term.head,
        from,
        to: unprepareTerm(term.to),
      };
    }
    case "lambda": {
      const from = unprepareTerm(term.from);
      return {
        type: "lambda",
        head: term.head,
        from,
        body: unprepareTerm(term.body),
      };
    }
  }
}

export function isEqual(a: Term, b: Term): boolean {
  switch (a.type) {
    case "free":
      return a.type === b.type && a.identifier === b.identifier;
    case "type":
      return a.type === b.type && a.universe === b.universe;
    case "reference":
      return a.type === b.type && a.identifier === b.identifier;
    case "application":
      return a.type === b.type && isEqual(a.left, b.left) && isEqual(a.right, b.right);
    case "pi":
      return false; // TODO nomral form + rename variables
    case "lambda":
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
  }
}

export const nullTerm: Term = { type: "free", identifier: "", typeScope: {}, path: null };
export function isNullTerm(term: Term): boolean {
  return term.type === "free" && term.identifier === "";
}

export function getType(term: Term, scope: Scope): Term {
  switch (term.type) {
    case "free": {
      const fromScope = scope[term.identifier];
      if (!fromScope) {
        // TODO report error
        return nullTerm;
      }
      if (!isNullTerm(fromScope.type)) {
        return fromScope.type;
      }
      return getType(fromScope.value, scope);
    }
    case "type": {
      return { type: "type", universe: term.universe + 1, path: null, typeScope: {} };
    }
    case "reference": {
      return term.type_;
    }
    case "application": {
      const leftType = getType(term.left, scope);
      if (leftType.type !== "pi") {
        // TODO report error
        return nullTerm;
      }
      const rightType = getType(term.right, scope);
      if (!isEqual(leftType.from, rightType)) {
        // TODO report error
      }
      return replace(leftType.head, term.right, leftType.to);
    }
    case "pi": {
      const fromType = getType(term.from, scope);
      if (fromType.type !== "type") {
        // TODO report error
      }
      const toType = getType(term.to, scope);
      if (toType.type !== "type") {
        // TODO report erorr
      }
      return {
        type: "type",
        universe: Math.max(fromType.type === "type" ? fromType.universe : -1, toType.type === "type" ? toType.universe : -1),
        path: null,
        typeScope: {},
      };
    }
    case "lambda": {
      return { type: "pi", head: term.head, from: term.from, to: getType(term.body, scope), path: null, typeScope: {} };
    }
  }
}

export function getValue(term: Term, scope: Scope): Term {
  switch (term.type) {
    case "free": {
      const fromScope = scope[term.identifier];
      if (!fromScope || isNullTerm(fromScope.value)) {
        return term;
      }
      return fromScope.value;
    }
    case "type": {
      return term;
    }
    case "reference": {
      return term;
    }
    case "application": {
      const left = getValue(term.left, scope);
      if (left.type === "lambda") {
        return getValue(replace(left.head, term.right, left.body), scope);
      } else {
        return { ...term, left };
      }
    }
    case "pi": {
      return term;
    }
    case "lambda": {
      return term;
    }
  }
}

// let nextUID = 1;
// function getUID() {
//   return String(nextUID++);
// }

// export function getNormal(term: PreparedTerm, scope: Record<string, PreparedTerm>): PreparedTerm {
//   term = getValue(term, scope);
//   switch (term.type) {
//     case "free": {
//       return {
//         type: "free",
//         identifier: term.identifier,
//       };
//     }
//     case "type": {
//       return { type: "type", universe: term.universe };
//     }
//     case "reference": {
//       return { type: "reference", identifier: term.identifier, type_: term.type_ };
//     }
//     case "application": {
//       return {
//         type: "application",
//         left: getNormal(term.left, scope),
//         right: getNormal(term.right, scope),
//       };
//     }
//     case "pi": {
//       const freeHead = getUID();
//       const freeTo = replace(term.head, { type: "reference", identifier: freeHead }, term.to);
//       const normalTo = getNormal(freeTo, scope);
//       const boundTo = replace(freeHead, { type: "reference", identifier: term.head }, normalTo);
//       return { type: "lambda", head: term.head, from: getNormal(term.from, scope), body: boundTo };
//     }
//     case "lambda": {
//       const freeHead = getUID();
//       const freeBody = replace(term.head, { type: "reference", identifier: freeHead }, term.body);
//       const normalBody = getNormal(freeBody, scope);
//       const boundBody = replace(freeHead, { type: "reference", identifier: term.head }, normalBody);
//       return { type: "lambda", head: term.head, from: getNormal(term.from, scope), body: boundBody };
//     }
//   }
// }
