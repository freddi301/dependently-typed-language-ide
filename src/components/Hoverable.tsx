import * as React from "react";
import { colors } from "../App";

export function Hoverable({
  head,
  body,
  hasMouseOver,
}: {
  head: React.ReactNode;
  body: React.ReactNode;
  hasMouseOver: boolean;
}) {
  return (
    <span>
      {hasMouseOver && (
        <div
          style={{
            display: "inline",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              backgroundColor: colors.backgroundDark,
              border: `1px solid black`,
              padding: "0 1ch",
            }}
          >
            {body}
          </div>
        </div>
      )}
      {head}
    </span>
  );
}
