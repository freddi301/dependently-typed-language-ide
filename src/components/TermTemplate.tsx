import * as Composer from "./Composer";

export type TermTemplate<Inside> =
  | { type: "reference"; reference: string }
  | { type: "application"; left: Inside; right: Inside }
  | { type: "lambda"; head: string; body: Inside };
