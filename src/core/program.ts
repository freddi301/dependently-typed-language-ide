export type Term = Reference | Application | Pi | Lambda;

export type Reference = {
  type: "reference";
  reference: string;
  t: Term | undefined;
};
export type Application = { type: "application"; left: Term; right: Term };
export type Pi = { type: "pi"; head: string; from: Term; to: Term };
export type Lambda = { type: "lambda"; head: string; from: Term; body: Term };

function replace(previous: string, next: Term, term: Term): Term {
  switch (term.type) {
    case "reference": {
      if (term.reference === previous) {
        return next;
      } else {
        return {
          type: "reference",
          reference: term.reference,
          t: term.t ? replace(previous, next, term.t) : term.t,
        };
      }
    }
    case "application": {
      return {
        type: "application",
        left: replace(previous, next, term.left),
        right: replace(previous, next, term.right),
      };
    }
    case "pi": {
      if (term.head === previous) {
        return {
          type: "pi",
          head: term.head,
          from: replace(previous, next, term.from),
          to: term.to,
        };
      } else {
        return {
          type: "pi",
          head: term.head,
          from: replace(previous, next, term.from),
          to: replace(previous, next, term.to),
        };
      }
    }
    case "lambda": {
      if (term.head === previous) {
        return {
          type: "lambda",
          head: term.head,
          from: replace(previous, next, term.from),
          body: term.body,
        };
      } else {
        return {
          type: "lambda",
          head: term.head,
          from: replace(previous, next, term.from),
          body: replace(previous, next, term.body),
        };
      }
    }
  }
}

export function isEqualTerm(a: Term, b: Term): boolean {
  switch (a.type) {
    case "reference": {
      return a.type === b.type && a.reference === b.reference;
    }
    case "application": {
      return (
        a.type === b.type &&
        isEqualTerm(a.left, b.left) &&
        isEqualTerm(a.right, b.right)
      );
    }
    case "pi": {
      return (
        a.type === b.type &&
        a.head === b.head &&
        isEqualTerm(a.from, b.from) &&
        isEqualTerm(a.to, b.to)
      );
    }
    case "lambda": {
      return (
        a.type === b.type &&
        a.head === b.head &&
        isEqualTerm(a.from, b.from) &&
        isEqualTerm(a.body, b.body)
      );
    }
  }
}

export function getValue(term: Term): Term | null {
  switch (term.type) {
    case "reference": {
      return { type: "reference", reference: term.reference, t: term.t };
    }
    case "application": {
      const left = getValue(term.left);
      if (!left) return null;
      const right = getValue(term.right);
      if (!right) return null;
      switch (left.type) {
        case "reference": {
          return {
            type: "application",
            left,
            right,
          };
        }
        case "application": {
          return {
            type: "application",
            left,
            right,
          };
        }
        case "pi": {
          return null;
        }
        case "lambda": {
          // check type
          return getValue(replace(left.head, right, left.body));
        }
      }
      break; // for eslint
    }
    case "pi": {
      const from = getValue(term.from);
      if (!from) return null;
      const placeholder = String(Math.random());
      const metaTo = getValue(
        replace(
          term.head,
          { type: "reference", reference: placeholder, t: from },
          term.to
        )
      );
      if (!metaTo) return null;
      const to = replace(
        placeholder,
        { type: "reference", reference: term.head, t: from },
        metaTo
      );
      return {
        type: "pi",
        head: term.head,
        from,
        to,
      };
    }
    case "lambda": {
      const from = getValue(term.from);
      if (!from) return null;
      const placeholder = String(Math.random());
      const metaBody = getValue(
        replace(
          term.head,
          { type: "reference", reference: placeholder, t: from },
          term.body
        )
      );
      if (!metaBody) return null;
      const body = replace(
        placeholder,
        { type: "reference", reference: term.head, t: from },
        metaBody
      );
      return {
        type: "lambda",
        head: term.head,
        from,
        body,
      };
    }
  }
}

export function getType(term: Term): Term | null {
  switch (term.type) {
    case "reference": {
      if (term.reference === "type")
        return { type: "reference", reference: "type", t: undefined };
      return term.t ?? null;
    }
    case "application": {
      const leftType = getType(term.left);
      if (!leftType) return null;
      const rightType = getType(term.right);
      if (!rightType) return null;
      if (leftType.type !== "pi") return null;
      if (!isEqualTerm(leftType.from, rightType)) return null;
      if (leftType.head) {
        return replace(leftType.head, rightType, leftType.to);
      } else {
        return leftType.to;
      }
    }
    case "pi": {
      return { type: "reference", reference: "type", t: undefined };
    }
    case "lambda": {
      const to = getType(term.body);
      if (!to) return null;
      return { type: "pi", head: term.head, from: term.from, to };
    }
  }
}
