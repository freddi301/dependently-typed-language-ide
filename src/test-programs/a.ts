import { Program } from "../core/program";

export const program: Program = {
  x: { type: { type: "reference", reference: "X" }, value: null },
  y: { type: { type: "reference", reference: "Y" }, value: null },
  f: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "X" },
      to: { type: "reference", reference: "Y" },
    },
    value: null,
  },
  g: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "Y" },
      to: { type: "reference", reference: "X" },
    },
    value: null,
  },
  v1: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "f" },
      right: { type: "reference", reference: "x" },
    },
  },
  v2: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "f" },
      right: { type: "reference", reference: "y" },
    },
  },
  v3: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "g" },
      right: { type: "reference", reference: "x" },
    },
  },
  v4: {
    type: null,
    value: { type: "reference", reference: "x" },
  },
  f2: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "X" },
      to: {
        type: "arrow",
        from: { type: "reference", reference: "X" },
        to: { type: "reference", reference: "Y" },
      },
    },
    value: null,
  },
  v5: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "f2" },
      right: { type: "reference", reference: "x" },
    },
  },
  v6: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "f2" },
      right: { type: "reference", reference: "y" },
    },
  },
  v7: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "f2" },
        right: { type: "reference", reference: "x" },
      },
      right: { type: "reference", reference: "y" },
    },
  },
  ft1: {
    type: null,
    value: {
      type: "arrow",
      from: { type: "reference", reference: "X" },
      to: { type: "reference", reference: "Y" },
    },
  },
  f3: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "X" },
      to: { type: "reference", reference: "ft1" },
    },
    value: null,
  },
  v8: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "f3" },
        right: { type: "reference", reference: "x" },
      },
      right: { type: "reference", reference: "y" },
    },
  },
  v9: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "x" },
      right: { type: "reference", reference: "y" },
    },
  },
  v10: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "f" },
        right: { type: "reference", reference: "x" },
      },
      right: { type: "reference", reference: "x" },
    },
  },
  boolean: {
    type: { type: "reference", reference: "type" },
    value: null,
  },
  true: {
    type: { type: "reference", reference: "boolean" },
    value: null,
  },
  false: {
    type: { type: "reference", reference: "boolean" },
    value: null,
  },
  natural: {
    type: { type: "reference", reference: "type" },
    value: null,
  },
  zero: {
    type: { type: "reference", reference: "natural" },
    value: null,
  },
  successive: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "natural" },
      to: { type: "reference", reference: "natural" },
    },
    value: null,
  },
  "0n": {
    type: null,
    value: { type: "reference", reference: "zero" },
  },
  "1n": {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "successive" },
      right: { type: "reference", reference: "0n" },
    },
  },
  "2n": {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "successive" },
      right: { type: "reference", reference: "1n" },
    },
  },
  maybe: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "type" },
      to: { type: "reference", reference: "type" },
    },
    value: null,
  },
  nothing: {
    type: {
      type: "arrow",
      head: "t",
      from: { type: "reference", reference: "type" },
      to: {
        type: "application",
        left: { type: "reference", reference: "maybe" },
        right: { type: "reference", reference: "t" },
      },
    },
    value: null,
  },
  just: {
    type: {
      type: "arrow",
      head: "t",
      from: { type: "reference", reference: "type" },
      to: {
        type: "arrow",
        head: "v",
        from: { type: "reference", reference: "t" },
        to: {
          type: "application",
          left: { type: "reference", reference: "maybe" },
          right: { type: "reference", reference: "t" },
        },
      },
    },
    value: null,
  },
  m1: {
    type: null,
    value: {
      type: "application",
      left: { type: "reference", reference: "nothing" },
      right: { type: "reference", reference: "boolean" },
    },
  },
  m2: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: { type: "reference", reference: "boolean" },
      },
      right: { type: "reference", reference: "true" },
    },
  },
  m3: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: { type: "reference", reference: "boolean" },
      },
      right: { type: "reference", reference: "zero" },
    },
  },
  m4: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: {
          type: "application",
          left: { type: "reference", reference: "maybe" },
          right: { type: "reference", reference: "boolean" },
        },
      },
      right: { type: "reference", reference: "m2" },
    },
  },
  m5: {
    type: null,
    value: {
      type: "application",
      left: {
        type: "application",
        left: { type: "reference", reference: "just" },
        right: {
          type: "application",
          left: { type: "reference", reference: "maybe" },
          right: { type: "reference", reference: "natural" },
        },
      },
      right: { type: "reference", reference: "m2" },
    },
  },
  maybeMap: {
    type: {
      type: "arrow",
      head: "a",
      from: { type: "reference", reference: "type" },
      to: {
        type: "arrow",
        head: "b",
        from: { type: "reference", reference: "type" },
        to: {
          type: "arrow",
          head: "f",
          from: {
            type: "arrow",
            from: { type: "reference", reference: "a" },
            to: { type: "reference", reference: "b" },
          },
          to: {
            type: "arrow",
            head: "m",
            from: {
              type: "application",
              left: { type: "reference", reference: "maybe" },
              right: { type: "reference", reference: "a" },
            },
            to: {
              type: "application",
              left: { type: "reference", reference: "maybe" },
              right: { type: "reference", reference: "b" },
            },
          },
        },
      },
    },
    value: null,
  },
  mm2: {
    type: {
      type: "arrow",
      from: { type: "reference", reference: "boolean" },
      to: { type: "reference", reference: "natural" },
    },
    value: null,
  },
  mm3: {
    type: null,
    value: { type: "reference", reference: "maybeMap" },
  },
};
