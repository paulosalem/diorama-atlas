import { t } from "./locale.js";

export class TranslatableError extends Error {
  constructor(template, values = {}) {
    super(
      template.replace(/\{(\w+)\}/g, (_, key) => {
        if (!Object.hasOwn(values, key))
          throw new TypeError(`Missing message value: ${key}`);
        return String(values[key]);
      }),
    );
    this.name = "TranslatableError";
    this.template = template;
    this.values = values;
  }
}

export function translateError(error) {
  if (!(error instanceof TranslatableError)) return t(error.message);
  const values = Object.fromEntries(
    Object.entries(error.values).map(([key, value]) => [
      key,
      typeof value === "string" ? t(value) : value,
    ]),
  );
  return t(error.template, values);
}
