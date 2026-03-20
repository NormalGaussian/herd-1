import * as jsYaml from "js-yaml";
import fs from "fs";
import path from "path";

export async function readYaml(
  filename: string,
  opts?: jsYaml.LoadOptions,
): Promise<JSONishObject> {
  const data = await fs.promises.readFile(filename, "utf-8");
  const yaml = jsYaml.load(
    data,
    Object.assign({ filename }, opts),
  ) as JSONishObject;
  return yaml;
}

export async function writeYaml(
  filename: string,
  obj: JSONishObject,
  opts?: jsYaml.DumpOptions,
): Promise<void> {
  const data = jsYaml.dump(obj, opts);
  await fs.promises.writeFile(filename, data);
}

export function JSONish_leaves(
  path: string[],
  o: JSONishMember,
): { path: string[]; leaf: JSONishLeaf }[] {
  if (typeof o !== "object" || o === null) {
    return [{ path, leaf: o }];
  }
  if (Array.isArray(o)) {
    return o.flatMap((v, i) => JSONish_leaves([...path, `[${i}]`], v));
  } else {
    return Object.entries(o).flatMap(([k, v]) =>
      JSONish_leaves([...path, k], v),
    );
  }
}

export interface WithMeta {
  meta: JSONishObject;
}

export class ErrorWithMeta extends Error implements WithMeta {
  meta: JSONishObject;

  constructor(
    message: string,
    meta?: JSONishObject,
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