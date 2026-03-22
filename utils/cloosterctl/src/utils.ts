import * as jsYaml from "js-yaml";
import fs from "fs";

export async function readYaml(
  filename: string,
  opts?: jsYaml.LoadOptions,
): Promise<Record<string, unknown>> {
  const data = await fs.promises.readFile(filename, "utf-8");
  const yaml = jsYaml.load(data, Object.assign({ filename }, opts)) as Record<
    string,
    unknown
  >;
  return yaml;
}

export class ErrorWithMeta extends Error {
  meta: Record<string, unknown>;

  constructor(
    message: string,
    meta?: Record<string, unknown>,
    errorName: string = "ErrorWithMeta",
  ) {
    super(message);
    this.meta = meta ?? {};
    this.name = errorName;
  }
}

export function asError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  return new Error("" + e);
}
