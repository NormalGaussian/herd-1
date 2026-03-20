import { RefinementError, refineString } from "@normed/refinements";
import { isIP } from "net";

export function refineIP(path: string[], v: unknown): string | RefinementError {
  const string = refineString(path, v);
  if (string instanceof Error) {
    throw string;
  }

  if (!isIP(string)) {
    throw new RefinementError(path, "is not a valid IP address");
  }

  return string;
}
