export type SourceTerm =
  | { type: "type"; universe: number }
  | { type: "reference"; identifier: string }
  | { type: "application"; left: SourceTerm; right: SourceTerm }
  | { type: "pi"; head: string; from: SourceTerm; to: SourceTerm };

export type BoundTerm =
  | { type: "free"; identifier: string }
  | { type: "type"; universe: number }
  | { type: "reference"; identifier: string }
  | { type: "application"; left: BoundTerm; right: BoundTerm }
  | { type: "pi"; head: string; from: BoundTerm; to: BoundTerm };

export function markFreeVariables(
  term: SourceTerm,
  scope: Record<string, boolean>
): BoundTerm {
  switch (term.type) {
    case "type": {
      return { type: "type", universe: term.universe };
    }
    case "reference": {
      if (term.identifier in scope) {
        return { type: "reference", identifier: term.identifier };
      } else {
        return { type: "free", identifier: term.identifier };
      }
    }
    case "application": {
      return {
        type: "application",
        left: markFreeVariables(term.left, scope),
        right: markFreeVariables(term.right, scope),
      };
    }
    case "pi": {
      return {
        type: "pi",
        head: term.head,
        from: markFreeVariables(term.from, scope),
        to: markFreeVariables(term.to, { ...scope, [term.head]: true }),
      };
    }
  }
}

function replace(old: string, new_: BoundTerm, term: BoundTerm): BoundTerm {
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
        return { type: "reference", identifier: term.identifier };
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
  }
}

export function getType(
  term: BoundTerm,
  scope: Record<string, BoundTerm>
): BoundTerm {
  switch (term.type) {
    case "free": {
      throw new Error();
    }
    case "type": {
      return { type: "type", universe: term.universe + 1 };
    }
    case "reference": {
      const fromScope = scope[term.identifier];
      if (!fromScope) throw new Error("should not get here");
      return fromScope;
    }
    case "application": {
      const leftType = getType(term.left, scope);
      if (leftType.type !== "pi") throw new Error();
      const rightType = getType(term.right, scope);
      if (leftType.from !== rightType) throw new Error();
      return replace(leftType.head, rightType, leftType.to);
    }
    case "pi": {
      const fromType = getType(term.from, scope);
      if (fromType.type !== "type") throw new Error();
      const toType = getType(term.to, scope);
      if (toType.type !== "type") throw new Error();
      return {
        type: "type",
        universe: Math.max(fromType.universe, toType.universe),
      };
    }
  }
}
