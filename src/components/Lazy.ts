export class Lazy<T> {
  constructor(private operation: () => T) {}
  state: { type: "uncalculated" } | { type: "calculated"; value: T } = {
    type: "uncalculated",
  };
  get value() {
    switch (this.state.type) {
      case "calculated":
        return this.state.value;
      case "uncalculated": {
        const value = this.operation();
        this.state = { type: "calculated", value };
        return value;
      }
      default:
        throw new Error("invalid state");
    }
  }
}
