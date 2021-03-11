import React, { useState } from "react";
/*
type Json = boolean | number | string | Json[] | { [property: string]: Json };

export type TOfMagic<C extends Magic<any>> = C extends Magic<infer T>
  ? T
  : never;

type EditableComponent<T> = React.ComponentType<{
  value: T;
  onChange(value: T): void;
}>;

export type Magic<T> = {
  fromJSON(data: Json): T;
  toJSON(data: T): Json;
  default: T;
  EditableComponent: EditableComponent<T>;
};

export const boolean: Magic<boolean> = {
  fromJSON(data) {
    if (typeof data === "boolean") {
      return data;
    }
    throw new Error();
  },
  toJSON(data) {
    return data;
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
  fromJSON(data) {
    if (typeof data === "number") {
      return data;
    }
    throw new Error();
  },
  toJSON(data) {
    return data;
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
  fromJSON(data) {
    if (typeof data === "string") {
      return data;
    }
    throw new Error();
  },
  toJSON(data) {
    return data;
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
    fromJSON(data) {
      if (data instanceof Array) {
        return data.map(item.fromJSON);
      }
      throw new Error();
    },
    toJSON(data) {
      return data.map(item.toJSON) as Json;
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
): Magic<{ [K in keyof T]: TOfMagic<T[K]> }> {
  return {
    fromJSON(data) {
      if (typeof data === "object" && !(data instanceof Array)) {
        return Object.fromEntries(
          Object.entries(entries).map(([k, c]) => [k, c.fromJSON(data[k])])
        ) as { [K in keyof T]: TOfMagic<T[K]> };
      }
      throw new Error();
    },
    toJSON(data) {
      return Object.fromEntries(
        Object.entries(entries).map(([k, c]) => [k, c.toJSON(data[k])])
      ) as Json;
    },
    default: Object.fromEntries(
      Object.entries(entries).map(([k, v]) => [k, v.default])
    ) as { [K in keyof T]: TOfMagic<T[K]> },
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

export function enumeration<C extends Record<string, Magic<any>>>(
  cases: C,
  default_: keyof C
): Magic<{ [K in keyof C]: { type: K; payload: TOfMagic<C[K]> } }[keyof C]> {
  return {
    fromJSON(data) {
      if (
        typeof data === "object" &&
        !(data instanceof Array) &&
        cases[data.type as keyof C]
      ) {
        return {
          type: data.type,
          payload: cases[data.type as keyof C].fromJSON(data.payload),
        } as {
          [K in keyof C]: { type: K; payload: TOfMagic<C[K]> };
        }[keyof C];
      }
      throw new Error();
    },
    toJSON(data) {
      return {
        type: data.type,
        payload: cases[data.type].toJSON(data.payload),
      } as Json;
    },
    default: { type: default_, payload: cases[default_].default },
    EditableComponent({ value, onChange }) {
      const PayloadComponent = cases[value.type].EditableComponent;
      return (
        <>
          <select
            value={value.type as string}
            onChange={(event) => {
              const key = event.currentTarget.value as keyof C;
              onChange({ type: key, payload: cases[key].default });
            }}
          >
            {Object.entries(cases).map(([k, v]) => {
              return <option key={k}>{k}</option>;
            })}
          </select>
          <div style={{ marginLeft: "2ch" }}>
            <PayloadComponent
              value={value.payload}
              onChange={(p) => onChange({ type: value.type, payload: p })}
            />
          </div>
        </>
      );
    },
  };
}
*/
