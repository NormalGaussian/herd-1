import { Logger } from "@normed/log-flour";
import { ErrorWithMeta, ensureDirectory } from "./utils";
import { ClusterConfig } from "./cluster-config";
import { TalosCtl } from "./talosctl";
import path from "path";
import fs from "fs";

export async function apply({logger, config: configFileName, insecure }: { logger: Logger; config: string; insecure: boolean }) {
  logger.info(`Started`);

  const talosctl = TalosCtl({ logger });
  logger.debug(`Initialised plugins`, {
    talosctl: Boolean(talosctl),
  });

  logger.debug(`Checking talosctl installation`);
  const talosctlInstalled = await talosctl.verifyInstallation();
  if (!talosctlInstalled) {
    throw new ErrorWithMeta(
      `talosctl is not installed or is incorrectly configured`,
    );
  }
  logger.debug(`talosctl is installed correctly`);

  /* Main logic */

  if (!configFileName) {
    throw new ErrorWithMeta(`Must specifiy a config file`);
  }

  const clusterConfig = await ClusterConfig.fromFile(configFileName, {
    eagerFilepathExistence: true,
  });
  logger.debug(`Read configFile`, { configFileName });

  const basedir = process.cwd();
  const clusterdir = path.resolve(basedir, clusterConfig.serialised.name);
  logger.debug(`Using clusterdir`, { clusterdir });

  // The config for this cluster is saved in a directory named after the cluster
  await ensureDirectory(clusterdir, { basedir });

  // ensure secrets
  // Don't recreate a secrets file if it already exists, as it is not deterministic
  let secretsFile: string;
  {
    const talos = clusterConfig.serialised.talos;
    secretsFile = path.resolve(
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
  }

  // Generate config
  await talosctl.gen.config(clusterConfig, secretsFile, { basedir });

  logger.info(`Config??`);

  // Apply config
  await talosctl.gen["apply-config"](clusterConfig, { basedir, insecure });

  // TODO: bootstrap kubernetes

  // TODO: download kubeconfig

  logger.info(`Generated config`);
}

export async function install({ logger }: { logger: Logger }) {
  logger.info(`Started`);

  const talosctl = TalosCtl({ logger });
  logger.debug(`Initialised plugins`, {
    talosctl: Boolean(talosctl),
  });

  logger.debug(`Checking talosctl installation`);
  const talosctlInstalled = await talosctl.verifyInstallation();
  if (!talosctlInstalled) {
    logger.debug(`Installing talosctl`);
    await talosctl.install();
  } else {
    logger.debug(`talosctl is installed correctly`);
  }
}
