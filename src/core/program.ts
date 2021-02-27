export type Term = Reference | Arrow | Application;

export type Reference = { type: "reference"; reference: string };
export type Arrow = { type: "arrow"; head?: string; from: Term; to: Term };
export type Application = { type: "application"; left: Term; right: Term };

export type Program = Record<
  string,
  {
    type: Term | null;
    value: Term | null;
  }
>;

function replace(previous: string, next: Term, term: Term): Term {
  switch (term.type) {
    case "reference": {
      if (term.reference === previous) {
        return next;
      } else {
        return term;
      }
    }
    case "arrow": {
      if (term.head === previous) {
        return {
          type: "arrow",
          head: term.head,
          from: replace(previous, next, term.from),
          to: term.to,
        };
      } else {
        return {
          type: "arrow",
          head: term.head,
          from: replace(previous, next, term.from),
          to: replace(previous, next, term.to),
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
  }
}

function isSame(a: Term, b: Term): boolean {
  switch (a.type) {
    case "reference": {
      return a.type === b.type && a.reference === b.reference;
    }
    case "arrow": {
      return a.type === b.type && isSame(a.from, b.from) && isSame(a.to, b.to);
    }
    case "application": {
      return (
        a.type === b.type && isSame(a.left, b.left) && isSame(a.right, b.right)
      );
    }
  }
}

export function fromProgram(program: Program) {
  function check() {
    const mismatchedArgument = new Map<
      Term,
      { expected: Term; detected: Term }
    >();
    const isNotAFunction = new Map<
      Term,
      {
        detected: Term;
      }
    >();
    function checkTerm(term: Term) {
      if (term.type === "application") {
        const leftType = getType(term.left);
        const rightType = getType(term.right);
        if (leftType && rightType) {
          if (leftType.type === "arrow") {
            if (!isSame(leftType.from, rightType)) {
              mismatchedArgument.set(term.right, {
                expected: leftType.from,
                detected: rightType,
              });
            }
          } else {
            isNotAFunction.set(term.left, { detected: leftType });
          }
        }
        checkTerm(term.left);
        checkTerm(term.right);
      }
    }
    for (const [k, v] of Object.entries(program)) {
      if (v.value) {
        checkTerm(v.value);
      }
      if (v.type) {
        checkTerm(v.type);
      }
      if (v.value && v.type) {
        const annotatedType = getValue(v.type);
        const valueType = getType(v.value);
        if (valueType && annotatedType && !isSame(valueType, annotatedType)) {
          mismatchedArgument.set(v.value, {
            expected: annotatedType,
            detected: valueType,
          });
        }
      }
    }
    return { mismatchedArgument, isNotAFunction };
  }
  const checks = check();
  function hasError(term: Term) {
    return (
      checks.mismatchedArgument.has(term) || checks.isNotAFunction.has(term)
    );
  }
  function getType(term: Term): Term | null {
    switch (term.type) {
      case "reference": {
        const top = program[term.reference];
        if (top) {
          const annotatedType = top.type;
          if (annotatedType) {
            return getValue(annotatedType);
          }
          if (top.value) {
            return getType(top.value);
          }
        }
        break;
      }
      case "application": {
        const leftType = getType(term.left);
        if (leftType && leftType.type === "arrow") {
          const to = leftType.head
            ? replace(leftType.head, term.right, leftType.to)
            : leftType.to;
          return getValue(to);
        }
        break;
      }
      case "arrow": {
        return { type: "reference", reference: "type" };
      }
    }
    return null;
  }

  function getValue(term: Term): Term {
    switch (term.type) {
      case "reference": {
        const top = program[term.reference];
        if (top?.value) {
          return getValue(top.value);
        }
        return { type: "reference", reference: term.reference };
      }
      case "arrow": {
        return {
          type: "arrow",
          head: term.head,
          from: getValue(term.from),
          to: getValue(term.to),
        };
      }
      case "application": {
        return {
          type: "application",
          left: getValue(term.left),
          right: getValue(term.right),
        };
      }
    }
  }
  return { program, checks, hasError, getType, getValue };
}
