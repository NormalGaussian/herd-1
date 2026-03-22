import * as cloosterctl from "#cloosterctl";
import { asError } from "#utils";
import { Logger } from "#logger";

const COMMANDS = ["generate", "apply", "sync"] as const;
type Command = (typeof COMMANDS)[number];

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const command = args.find((a) => !a.startsWith("-")) as Command | undefined;

  if (!command || !COMMANDS.includes(command)) {
    console.log(`Usage: cloosterctl <${COMMANDS.join("|")}> [options]

Commands:
  generate   Regenerate machine configs from talos.yaml and existing secrets
  apply      Apply generated configs to cluster nodes
  sync       Generate configs and apply them to cluster nodes

Options:
  -v, --verbose     Run with verbose logging
  --basedir <path>  Base directory for resolving paths (default: cwd)
  --secretsdir <p>  Path to decrypted secrets directory (set by wrapper)
  --insecure        Allow insecure connections to nodes (apply/sync)
  --bootstrap       Run full bootstrap sequence (apply/sync)`);
    process.exit(command ? 1 : 0);
  }

  const has = (flag: string) => args.includes(flag);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const secretsdir = get("--secretsdir");
  if (!secretsdir) {
    console.error("Error: --secretsdir is required");
    process.exit(1);
  }

  return {
    command,
    verbose: has("-v") || has("--verbose"),
    basedir: get("--basedir") ?? process.cwd(),
    secretsdir,
    insecure: has("--insecure"),
    bootstrap: has("--bootstrap"),
  };
}

const logger = new Logger("cloosterctl");

try {
  const { command, verbose, basedir, secretsdir, insecure, bootstrap } =
    parseArgs(process.argv);
  logger.setMinLogLevel(verbose ? "debug" : "info");

  if (command === "generate") {
    await cloosterctl.generate({ logger, basedir, secretsdir });
  } else {
    await cloosterctl[command]({
      logger,
      basedir,
      secretsdir,
      insecure,
      bootstrap,
    });
  }
} catch (e) {
  logger.error(asError(e));
  process.exit(1);
}
