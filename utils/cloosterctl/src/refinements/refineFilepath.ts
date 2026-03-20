import { RefinementError, refineString } from "@normed/refinements";

export function refineFilepath(
  path: string[],
  v: unknown,
): string | RefinementError {
  return refineString(path, v);
}
