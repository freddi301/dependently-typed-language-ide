export type Term = Reference | Pi | Application;
export type Reference = { type: "reference"; reference: string };
export type Pi = { type: "pi"; head: string; from: Term; to: Term };
export type Application = { type: "application"; left: Term; right: Term };
