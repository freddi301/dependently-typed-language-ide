import * as Editor from "./editor-state";
import * as History from "./history-state";
import Fuse from "fuse.js";

/*
filter by scope

order by
  expected type
  text
  by proximity
*/

export function getSuggestions(state: Editor.State): Array<string> {
  const text = Editor.getTextUnderCursor(state);
  const { source } = History.getCurrent(state.history);
  const top = Object.keys(source);
  return text ? new Fuse(top).search(text).map(({ item }) => item) : top;
}
