export type SourceTerm =
  | { type: "reference"; identifier: string }
  | { type: "application"; left: SourceTerm; right: SourceTerm }
  | { type: "lambda"; head: string; body: SourceTerm };

export type BoundTerm =
  | { type: "free"; identifier: string }
  | { type: "reference"; identifier: string }
  | { type: "application"; left: BoundTerm; right: BoundTerm }
  | { type: "lambda"; head: string; body: BoundTerm };

export function markFreeVariables(
  term: SourceTerm,
  scope: Record<string, boolean>
): BoundTerm {
  switch (term.type) {
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
    case "lambda": {
      return {
        type: "lambda",
        head: term.head,
        body: markFreeVariables(term.body, { ...scope, [term.head]: true }),
      };
    }
  }
}

function replace(old: string, new_: BoundTerm, term: BoundTerm): BoundTerm {
  switch (term.type) {
    case "free": {
      return { type: "free", identifier: term.identifier };
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
    case "lambda": {
      if (term.head === old) {
        return { type: "lambda", head: term.head, body: term.body };
      } else {
        return {
          type: "lambda",
          head: term.head,
          body: replace(old, new_, term.body),
        };
      }
    }
  }
}

export function getValue(
  term: BoundTerm,
  scope: Record<string, BoundTerm>
): BoundTerm {
  switch (term.type) {
    case "free": {
      return {
        type: "free",
        identifier: term.identifier,
      };
    }
    case "reference": {
      const fromScope = scope[term.identifier];
      if (!fromScope) throw new Error("should not get here");
      return getValue(fromScope, scope);
    }
    case "application": {
      const left = getValue(term.left, scope);
      if (left.type === "lambda") {
        return getValue(replace(left.head, term.right, left.body), scope);
      } else {
        return { type: "application", left, right: term.right };
      }
    }
    case "lambda": {
      return { type: "lambda", head: term.head, body: term.body };
    }
  }
}

let nextUID = 1;
function getUID() {
  return String(nextUID++);
}

export function getNormal(
  term: BoundTerm,
  scope: Record<string, BoundTerm>
): BoundTerm {
  term = getValue(term, scope);
  switch (term.type) {
    case "free": {
      return {
        type: "free",
        identifier: term.identifier,
      };
    }
    case "reference": {
      return { type: "reference", identifier: term.identifier };
    }
    case "application": {
      return {
        type: "application",
        left: getNormal(term.left, scope),
        right: getNormal(term.right, scope),
      };
    }
    case "lambda": {
      const freeHead = getUID();
      const freeBody = replace(
        term.head,
        { type: "reference", identifier: freeHead },
        term.body
      );
      const normalBody = getNormal(freeBody, scope);
      const boundBody = replace(
        freeHead,
        { type: "reference", identifier: term.head },
        normalBody
      );
      return { type: "lambda", head: term.head, body: boundBody };
    }
  }
}
