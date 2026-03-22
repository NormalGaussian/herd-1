import * as jsYaml from "js-yaml";
import fs from "fs";
import path from "path";

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

export async function writeYaml(
  filename: string,
  obj: Record<string, unknown>,
  opts?: jsYaml.DumpOptions,
): Promise<void> {
  const data = jsYaml.dump(obj, opts);
  await fs.promises.writeFile(filename, data);
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

export async function ensureDirectory(
  name: string,
  { basedir }: { basedir: string },
) {
  const resolvedName = path.resolve(basedir, name);
  const dirs = await fs.promises.readdir(basedir, { withFileTypes: true });
  let dirent = dirs.find(
    (dirent) => path.resolve(basedir, dirent.name) === resolvedName,
  );
  if (dirent && !dirent.isDirectory()) {
    throw new ErrorWithMeta(
      `A file already exists with the same name as this directory`,
      { name },
    );
  }
  if (!dirent) {
    fs.mkdirSync(resolvedName);
  }
}

export function asError(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }
  return new Error("" + e);
}
