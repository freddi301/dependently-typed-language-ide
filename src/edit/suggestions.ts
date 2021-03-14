import * as Editor from "./editor-state";
import * as History from "./history-state";

/*
filter by scope

order by
  expected type
  text
  by proximity
*/

export function getSuggestions(state: Editor.State): Array<string> {
  const { source } = History.getCurrent(state.history);
  return Object.keys(source);
}
