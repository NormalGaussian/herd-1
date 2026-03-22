import yargs from "yargs";
import * as cloosterctl from "../cloosterctl.ts";
import { asError } from "../utils.ts";
import { Logger } from "@normed/log-flour";

export function getCli(
  handlers: {
    generate: (argv: {
      verbose: boolean;
      logger: Logger;
      basedir: string;
      secretsdir: string;
    }) => Promise<void>;
    apply: (argv: {
      verbose: boolean;
      logger: Logger;
      basedir: string;
      secretsdir: string;
      insecure: boolean;
      bootstrap: boolean;
    }) => Promise<void>;
    sync: (argv: {
      verbose: boolean;
      logger: Logger;
      basedir: string;
      secretsdir: string;
      insecure: boolean;
      bootstrap: boolean;
    }) => Promise<void>;
  },
  logger: Logger,
) {
  return yargs()
    .parserConfiguration({
      "parse-numbers": false,
      "strip-aliased": true,
      "boolean-negation": false,
    })
    .scriptName("cloosterctl")
    .option("verbose", {
      alias: "v",
      type: "boolean",
      description: "Run with verbose logging",
      default: false,
    })
    .option("basedir", {
      type: "string",
      description:
        "Base directory for resolving relative paths (defaults to cwd)",
      default: process.cwd(),
    })
    .option("secretsdir", {
      type: "string",
      description: "Path to decrypted secrets directory (set by wrapper)",
      demandOption: true,
    })
    .command(
      "generate",
      "Regenerate machine configs from talos.yaml and existing secrets",
      (yargs) => yargs,
      async (argv) => {
        const minLogLevel = argv.verbose ? "debug" : "info";
        logger.setMinLogLevel(minLogLevel);
        return await handlers.generate({ ...argv, logger });
      },
    )
    .command(
      "apply",
      "Apply generated configs to cluster nodes",
      (yargs) => {
        return yargs
          .option("insecure", {
            type: "boolean" as const,
            description:
              "Allow insecure connections to nodes (first-time setup)",
            default: false,
          })
          .option("bootstrap", {
            type: "boolean" as const,
            description:
              "Run full bootstrap sequence (wait, bootstrap etcd, download kubeconfig)",
            default: false,
          });
      },
      async (argv) => {
        const minLogLevel = argv.verbose ? "debug" : "info";
        logger.setMinLogLevel(minLogLevel);
        return await handlers.apply({ ...argv, logger });
      },
    )
    .command(
      "sync",
      "Generate configs and apply them to cluster nodes",
      (yargs) => {
        return yargs
          .option("insecure", {
            type: "boolean" as const,
            description:
              "Allow insecure connections to nodes (first-time setup)",
            default: false,
          })
          .option("bootstrap", {
            type: "boolean" as const,
            description:
              "Run full bootstrap sequence (wait, bootstrap etcd, download kubeconfig)",
            default: false,
          });
      },
      async (argv) => {
        const minLogLevel = argv.verbose ? "debug" : "info";
        logger.setMinLogLevel(minLogLevel);
        return await handlers.sync({ ...argv, logger });
      },
    )
    .help()
    .strict()
    .exitProcess(false)
    .showHelpOnFail(false)
    .fail(() => {});
}

const logger = new Logger("cloosterctl");
getCli(cloosterctl, logger)
  .parseAsync(process.argv.slice(2))
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    logger.error(asError(e));
    process.exit(1);
  });
