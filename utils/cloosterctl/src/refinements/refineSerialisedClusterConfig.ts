import {
  makeRefinement,
  refineArrayOf,
  refineString,
  refineStringLiteral,
} from "@normed/refinements";
import { refineIP } from "./refineIP";
import { optional } from "./optional";
import { refineFilepath } from "./refineFilepath";

export const refineSerialisedClusterConfig = makeRefinement({
  kind: refineStringLiteral("cloosterconfig"),
  name: refineString,
  talos: optional(
    makeRefinement({
      cluster: makeRefinement({
        ip: refineIP,
      }),
      secrets: optional(refineFilepath),
      "config-patch": optional(
        makeRefinement({
          worker: optional(refineArrayOf(refineFilepath)),
          "control-plane": optional(refineArrayOf(refineFilepath)),
          all: optional(refineArrayOf(refineFilepath)),
        }),
      ),
      nodes: makeRefinement({
        all: optional(
          makeRefinement({
            "config-patch": optional(refineArrayOf(refineFilepath)),
          }),
        ),
        "control-plane": makeRefinement({
          ips: refineArrayOf(refineIP),
          "config-patch": optional(refineArrayOf(refineFilepath)),
        }),
        worker: makeRefinement({
          ips: optional(refineArrayOf(refineIP)),
          "config-patch": optional(refineArrayOf(refineFilepath)),
        }),
      }),
    }),
  ),
});
