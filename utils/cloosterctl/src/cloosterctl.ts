import { Logger } from "@normed/log-flour";
import { ErrorWithMeta, ensureDirectory } from "./utils";
import { ClusterConfig } from "./cluster-config";
import { TalosCtl } from "./talosctl";
import path from "path";
import fs from "fs";

async function setup({ logger, config: configFileName, basedir }: { logger: Logger; config: string; basedir: string }) {
  const talosctl = TalosCtl({ logger });

  logger.debug(`Checking talosctl installation`);
  const talosctlInstalled = await talosctl.verifyInstallation();
  if (!talosctlInstalled) {
    throw new ErrorWithMeta(
      `talosctl is not installed or is incorrectly configured`,
    );
  }
  logger.debug(`talosctl is installed correctly`);

  if (!configFileName) {
    throw new ErrorWithMeta(`Must specify a config file`);
  }

  const clusterConfig = await ClusterConfig.fromFile(
    path.resolve(basedir, configFileName),
    { eagerFilepathExistence: true, baseDirectory: basedir },
  );
  logger.debug(`Read configFile`, { configFileName });

  const clusterdir = path.resolve(basedir, clusterConfig.serialised.name);
  logger.debug(`Using clusterdir`, { clusterdir });

  await ensureDirectory(clusterdir, { basedir });

  return { talosctl, clusterConfig, basedir, clusterdir };
}

async function ensureSecrets({ logger, talosctl, clusterConfig, clusterdir, basedir }: {
  logger: Logger;
  talosctl: ReturnType<typeof TalosCtl>;
  clusterConfig: ClusterConfig;
  clusterdir: string;
  basedir: string;
}) {
  const talos = clusterConfig.serialised.talos;
  const secretsFile = path.resolve(
    clusterdir,
    talos?.secrets ?? "talos-secrets.yaml",
  );
  logger.debug(`Checking if secrets file exists`, { secretsFile });
  if (!fs.existsSync(secretsFile)) {
    logger.debug(`Secrets file does not exist; generating`, { secretsFile });
    await talosctl.gen.secrets(secretsFile, { basedir });
    logger.debug(`Secrets file created`, { secretsFile });
  } else {
    logger.debug(`Secrets file exists`, { secretsFile });
  }
  return secretsFile;
}

export async function regenerate({ logger, config: configFileName, basedir, secrets, talosdir }: { logger: Logger; config: string; basedir: string; secrets: string; talosdir: string }) {
  logger.info(`Started regenerate`);

  const talosctl = TalosCtl({ logger });
  const talosctlInstalled = await talosctl.verifyInstallation();
  if (!talosctlInstalled) {
    throw new ErrorWithMeta(`talosctl is not installed or is incorrectly configured`);
  }

  if (!configFileName) {
    throw new ErrorWithMeta(`Must specify a config file`);
  }

  const clusterConfig = await ClusterConfig.fromFile(
    path.resolve(basedir, configFileName),
    { eagerFilepathExistence: true, baseDirectory: basedir },
  );
  logger.debug(`Read configFile`, { configFileName });

  const secretsFile = path.resolve(basedir, secrets);
  if (!fs.existsSync(secretsFile)) {
    throw new ErrorWithMeta(`Secrets file not found`, { secretsFile });
  }
  logger.debug(`Using secrets file`, { secretsFile });

  const outputDir = path.resolve(basedir, talosdir);
  logger.debug(`Output directory`, { outputDir });

  await talosctl.gen.config(clusterConfig, secretsFile, { basedir, outputDir });

  const talosconfig = path.resolve(outputDir, "talosconfig");
  const controlPlaneIPs = clusterConfig.serialised.talos?.nodes["control-plane"].ips ?? [];

  if (controlPlaneIPs.length) {
    await talosctl.config.endpoints(talosconfig, controlPlaneIPs, { basedir });
    await talosctl.config.nodes(talosconfig, controlPlaneIPs, { basedir });
    logger.info(`Set endpoints and nodes in talosconfig`);
  }

  logger.info(`Regenerated configs in ${talosdir}`);
}

export async function apply({ logger, config: configFileName, insecure, basedir }: { logger: Logger; config: string; insecure: boolean; basedir: string }) {
  logger.info(`Started apply`);

  const { talosctl, clusterConfig, clusterdir, basedir: resolvedBasedir } = await setup({ logger, config: configFileName, basedir });
  const secretsFile = await ensureSecrets({ logger, talosctl, clusterConfig, clusterdir, basedir: resolvedBasedir });

  // Generate config
  await talosctl.gen.config(clusterConfig, secretsFile, { basedir: resolvedBasedir });

  logger.info(`Generated configs`);

  // Apply config
  await talosctl.gen["apply-config"](clusterConfig, { basedir: resolvedBasedir, insecure });

  logger.info(`Applied config to all nodes`);
}

export async function install({ logger }: { logger: Logger }) {
  logger.info(`Started`);

  const talosctl = TalosCtl({ logger });

  logger.debug(`Checking talosctl installation`);
  const talosctlInstalled = await talosctl.verifyInstallation();
  if (!talosctlInstalled) {
    logger.debug(`Installing talosctl`);
    await talosctl.install();
  } else {
    logger.debug(`talosctl is installed correctly`);
  }
}
