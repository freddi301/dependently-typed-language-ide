import React, { useState } from "react";

type JSONBranch<Inside> = Array<Inside> | Record<string, Inside>;
type JSONLeaf = boolean | number | string;
type JSON = JSONLeaf | JSONBranch<JSONLeaf>;

type Codec<T> = {
  fromJSON(data: JSON): T;
  toJSON(data: T): JSON;
};
export type TOfCodec<C extends Codec<any>> = C extends Codec<infer T>
  ? T
  : never;

type EditableComponent<T> = React.ComponentType<{
  value: T;
  onChange(value: T): void;
}>;

type Magic<T> = {
  codec: Codec<T>;
  default: T;
  EditableComponent: EditableComponent<T>;
};

export const boolean: Magic<boolean> = {
  codec: {
    fromJSON(data) {
      if (typeof data === "boolean") {
        return data;
      }
      throw new Error();
    },
    toJSON(data) {
      return data;
    },
  },
  default: false,
  EditableComponent({ value, onChange }) {
    return (
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  },
};

export const number: Magic<number> = {
  codec: {
    fromJSON(data) {
      if (typeof data === "number") {
        return data;
      }
      throw new Error();
    },
    toJSON(data) {
      return data;
    },
  },
  default: 0,
  EditableComponent({ value, onChange }) {
    return (
      <input
        type="number"
        value={value}
        onChange={(event) => {
          const value = Number(event.currentTarget.value);
          if (typeof value === "number") {
            onChange(value);
          }
        }}
      />
    );
  },
};

export const string: Magic<string> = {
  codec: {
    fromJSON(data) {
      if (typeof data === "string") {
        return data;
      }
      throw new Error();
    },
    toJSON(data) {
      return data;
    },
  },
  default: "",
  EditableComponent({ value, onChange }) {
    return (
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  },
};

export function array<T>(item: Magic<T>): Magic<Array<T>> {
  return {
    codec: {
      fromJSON(data) {
        if (data instanceof Array) {
          return data.map(item.codec.fromJSON);
        }
        throw new Error();
      },
      toJSON(data) {
        return data.map(item.codec.toJSON) as JSON;
      },
    },
    default: [],
    EditableComponent({ value, onChange }) {
      return (
        <>
          {value.map((v, index) => {
            return (
              <div key={index} style={{ display: "flex" }}>
                <Dropdown
                  head={<button>+</button>}
                  body={
                    <div style={{ backgroundColor: "black" }}>
                      <button
                        onClick={() => {
                          const copied = [...value];
                          copied.splice(index, 1);
                          onChange(copied);
                        }}
                      >
                        remove
                      </button>
                      {index > 0 && (
                        <button
                          onClick={() => {
                            const copied = [...value];
                            copied[index] = value[index - 1];
                            copied[index - 1] = value[index];
                            onChange(copied);
                          }}
                        >
                          move up
                        </button>
                      )}
                      {index < value.length - 1 && (
                        <button
                          onClick={() => {
                            const copied = [...value];
                            copied[index] = value[index + 1];
                            copied[index + 1] = value[index];
                            onChange(copied);
                          }}
                        >
                          move down
                        </button>
                      )}
                    </div>
                  }
                />
                <div>
                  <item.EditableComponent
                    value={v}
                    onChange={(v) => {
                      const copied = [...value];
                      copied[index] = v;
                      onChange(copied);
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div>
            <button
              onClick={() => {
                onChange([...value, item.default]);
              }}
            >
              +
            </button>
          </div>
        </>
      );
    },
  };
}

export function object<T extends Record<string, Magic<any>>>(
  entries: T
): Magic<{ [K in keyof T]: TOfCodec<T[K]["codec"]> }> {
  return {
    codec: {
      fromJSON(data) {
        if (typeof data === "object" && !(data instanceof Array)) {
          return Object.fromEntries(
            Object.entries(entries).map(([k, c]) => [
              k,
              c.codec.fromJSON(data[k]),
            ])
          ) as { [K in keyof T]: TOfCodec<T[K]["codec"]> };
        }
        throw new Error();
      },
      toJSON(data) {
        return Object.fromEntries(
          Object.entries(entries).map(([k, c]) => [k, c.codec.toJSON(data[k])])
        ) as JSON;
      },
    },
    default: Object.fromEntries(
      Object.entries(entries).map(([k, v]) => [k, v.default])
    ) as { [K in keyof T]: TOfCodec<T[K]["codec"]> },
    EditableComponent({ value, onChange }) {
      return (
        <>
          {Object.entries(entries).map(([k, v]) => {
            return (
              <div key={k}>
                {k} ={" "}
                <v.EditableComponent
                  value={value[k]}
                  onChange={(v) => {
                    onChange({ ...value, [k]: v });
                  }}
                />
              </div>
            );
          })}
        </>
      );
    },
  };
}

function Dropdown({
  head,
  body,
}: {
  head: React.ReactNode;
  body: React.ReactNode;
}) {
  const [isOpened, setIsOpened] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => {
          setIsOpened(!isOpened);
        }}
      >
        {head}
      </div>
      {isOpened && (
        <div style={{ position: "absolute", left: 0, zIndex: 0 }}>{body}</div>
      )}
    </div>
  );
}
