import { z } from "zod";
import { isIP } from "net";

const ip = z.string().refine((v) => isIP(v) !== 0, "Invalid IP address");
const filepath = z.string();

const nodeGroup = z.object({
  ips: z.array(ip).optional(),
  "config-patch": z.array(filepath).optional(),
});

export const clusterConfigSchema = z.object({
  kind: z.literal("cloosterconfig"),
  name: z.string(),
  talos: z
    .object({
      cluster: z.object({
        ip: ip,
      }),
      secrets: filepath.optional(),
      "config-patch": z
        .object({
          worker: z.array(filepath).optional(),
          "control-plane": z.array(filepath).optional(),
          all: z.array(filepath).optional(),
        })
        .optional(),
      nodes: z.object({
        all: z
          .object({
            "config-patch": z.array(filepath).optional(),
          })
          .optional(),
        "control-plane": nodeGroup.extend({
          ips: z.array(ip),
        }),
        worker: nodeGroup,
      }),
    })
    .optional(),
});

export type SerialisedClusterConfig = z.infer<typeof clusterConfigSchema>;
