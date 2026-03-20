import yargs from "yargs";
import * as cloosterctl from "../cloosterctl";
import { asError } from "../utils";
import { Logger } from "@normed/log-flour";

export function getCli(
  handlers: {
    apply: (argv: { verbose: boolean; config: string; logger: Logger; insecure: boolean; basedir: string }) => Promise<void>;
    regenerate: (argv: { verbose: boolean; config: string; logger: Logger; basedir: string; secrets: string; talosdir: string }) => Promise<void>;
    install: (argv: { verbose: boolean; logger: Logger }) => Promise<void>;
  },
  logger: Logger
) {
  const configOption = (yargs: yargs.Argv) => {
    return yargs.option("config", {
      alias: "c",
      type: "string",
      description: "Path to the cluster configuration file",
      demandOption: true,
    });
  };

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
      description: "Base directory for resolving relative paths (defaults to cwd)",
      default: process.cwd(),
    })
    .command(
      "apply",
      "Generate and apply a cluster configuration to nodes",
      (yargs) => {
        return configOption(yargs).option("insecure", {
            type: "boolean",
            description: "Allow insecure connections from talosctl to nodes",
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
      "regenerate",
      "Regenerate machine configs from secrets and patches (does not apply to nodes)",
      (yargs) => {
        return configOption(yargs)
          .option("secrets", {
            alias: "s",
            type: "string",
            description: "Path to the cluster secrets file",
            demandOption: true,
          })
          .option("talosdir", {
            type: "string",
            description: "Directory for generated talos configs",
            demandOption: true,
          });
      },
      async (argv) => {
        const minLogLevel = argv.verbose ? "debug" : "info";
        logger.setMinLogLevel(minLogLevel);
        return await handlers.regenerate({ ...argv, logger });
      },
    )
    .command(
      "install",
      "Install talosctl",
      (yargs) => {
        return yargs;
      },
      async (argv) => {
        const minLogLevel = argv.verbose ? "debug" : "info";
        logger.setMinLogLevel(minLogLevel);
        return await handlers.install({ ...argv, logger });
      },
    )
    .help()
    .strict()
    .exitProcess(false)
    .showHelpOnFail(false)
    .fail(() => {});
}

const logger = new Logger("cloosterctl");
getCli(cloosterctl, logger).parseAsync(process.argv.slice(2)).then(() => {
    process.exit(0);
}).catch((e) => {
    logger.error(asError(e))
    process.exit(1);
})
