import {
  RefinementFunction,
  refineAny,
  refineUndefined,
} from "@normed/refinements";

export function optional<R>(
  refine: RefinementFunction<R>,
): RefinementFunction<R | undefined> {
  return refineAny<R | undefined>(refineUndefined, refine);
}
