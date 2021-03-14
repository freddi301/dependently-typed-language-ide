import * as Source from "./source";

export type PreparedTerm =
  | { type: "free"; identifier: string }
  | { type: "type"; universe: number }
  | { type: "reference"; identifier: string; type_: PreparedTerm }
  | { type: "application"; left: PreparedTerm; right: PreparedTerm }
  | { type: "pi"; head: string; from: PreparedTerm; to: PreparedTerm }
  | { type: "lambda"; head: string; from: PreparedTerm; body: PreparedTerm };

type PreparedScope = Record<string, { type: PreparedTerm; value: PreparedTerm }>;

function prepareTerm(term: Source.Term, typeScope: Record<string, PreparedTerm>): PreparedTerm {
  switch (term.type) {
    case "type": {
      return { type: "type", universe: term.universe };
    }
    case "reference": {
      const type_ = typeScope[term.identifier];
      if (type_) {
        return { type: "reference", identifier: term.identifier, type_ };
      } else {
        return { type: "free", identifier: term.identifier };
      }
    }
    case "application": {
      return {
        type: "application",
        left: prepareTerm(term.left, typeScope),
        right: prepareTerm(term.right, typeScope),
      };
    }
    case "pi": {
      const from = prepareTerm(term.from, typeScope);
      return {
        type: "pi",
        head: term.head,
        from,
        to: prepareTerm(term.to, { ...typeScope, [term.head]: from }),
      };
    }
    case "lambda": {
      const from = prepareTerm(term.from, typeScope);
      return {
        type: "lambda",
        head: term.head,
        from,
        body: prepareTerm(term.body, { ...typeScope, [term.head]: from }),
      };
    }
  }
}

export function prepareScope(scope: Source.Scope): PreparedScope {
  return Object.fromEntries(
    Object.entries(scope).map(([entry, { type, value }]) => {
      return [entry, { type: prepareTerm(type, {}), value: prepareTerm(value, {}) }];
    })
  );
}

export function unprepareTerm(term: PreparedTerm): Source.Term {
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

function isEqual(a: PreparedTerm, b: PreparedTerm): boolean {
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

function replace(old: string, new_: PreparedTerm, term: PreparedTerm): PreparedTerm {
  switch (term.type) {
    case "free": {
      return { type: "free", identifier: term.identifier };
    }
    case "type": {
      return { type: "type", universe: term.universe };
    }
    case "reference": {
      if (term.identifier === old) {
        return new_;
      } else {
        return { type: "reference", identifier: term.identifier, type_: replace(old, new_, term.type_) };
      }
    }
    case "application": {
      return {
        type: "application",
        left: replace(old, new_, term.left),
        right: replace(old, new_, term.right),
      };
    }
    case "pi": {
      if (term.head === old) {
        return {
          type: "pi",
          head: term.head,
          from: replace(old, new_, term.from),
          to: term.to,
        };
      } else {
        return {
          type: "pi",
          head: term.head,
          from: replace(old, new_, term.from),
          to: replace(old, new_, term.to),
        };
      }
    }
    case "lambda": {
      if (term.head === old) {
        return {
          type: "lambda",
          head: term.head,
          from: replace(old, new_, term.from),
          body: term.body,
        };
      } else {
        return {
          type: "lambda",
          head: term.head,
          from: replace(old, new_, term.from),
          body: replace(old, new_, term.body),
        };
      }
    }
  }
}

const nullTerm: PreparedTerm = { type: "free", identifier: "" };
function isNullTerm(term: PreparedTerm): boolean {
  return term.type === "free" && term.identifier === "";
}

export function getType(term: PreparedTerm, scope: PreparedScope): PreparedTerm {
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
      return { type: "type", universe: term.universe + 1 };
    }
    case "reference": {
      return term.type_;
    }
    case "application": {
      const leftType = getType(term.left, scope);
      if (leftType.type !== "pi") {
        // TODO report error
        throw new Error();
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
      };
    }
    case "lambda": {
      return { type: "pi", head: term.head, from: term.from, to: getType(term.body, scope) };
    }
  }
}

export function getValue(term: PreparedTerm, scope: PreparedScope): PreparedTerm {
  switch (term.type) {
    case "free": {
      const fromScope = scope[term.identifier];
      if (!fromScope || isNullTerm(fromScope.value)) {
        return {
          type: "free",
          identifier: term.identifier,
        };
      }
      return fromScope.value;
    }
    case "type": {
      return { type: "type", universe: term.universe };
    }
    case "reference": {
      return { type: "reference", identifier: term.identifier, type_: term.type_ };
    }
    case "application": {
      const left = getValue(term.left, scope);
      if (left.type === "lambda") {
        return getValue(replace(left.head, term.right, left.body), scope);
      } else {
        return { type: "application", left, right: term.right };
      }
    }
    case "pi": {
      return { type: "pi", head: term.head, from: term.from, to: term.to };
    }
    case "lambda": {
      return { type: "lambda", head: term.head, from: term.from, body: term.body };
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