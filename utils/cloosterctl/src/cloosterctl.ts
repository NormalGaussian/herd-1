import type { Logger } from "#logger";
import { ErrorWithMeta } from "#utils";
import { ClusterConfig } from "#cluster-config";
import { TalosCtl } from "#talosctl";
import path from "path";
import fs from "fs";

const CONFIG_FILE = "talos.yaml";

async function setup({ logger, basedir }: { logger: Logger; basedir: string }) {
  const talosctl = TalosCtl({ logger });

  const talosctlInstalled = await talosctl.verifyInstallation();
  if (!talosctlInstalled) {
    throw new ErrorWithMeta(
      `talosctl is not installed or is incorrectly configured`,
    );
  }

  const clusterConfig = await ClusterConfig.fromFile(
    path.resolve(basedir, CONFIG_FILE),
    { eagerFilepathExistence: true, baseDirectory: basedir },
  );
  logger.debug(`Read config`, { CONFIG_FILE });

  return { talosctl, clusterConfig };
}

export async function generate({
  logger,
  basedir,
  secretsdir,
}: {
  logger: Logger;
  basedir: string;
  secretsdir: string;
}) {
  logger.info(`Started generate`);

  const { talosctl, clusterConfig } = await setup({ logger, basedir });

  const secretsFile = path.resolve(secretsdir, "talos-secrets.yaml");
  if (!fs.existsSync(secretsFile)) {
    throw new ErrorWithMeta(`Secrets file not found`, { secretsFile });
  }

  const outputDir = path.resolve(secretsdir, "talos.sops");
  await talosctl.gen.config(clusterConfig, secretsFile, { basedir, outputDir });

  const talosconfig = path.resolve(outputDir, "talosconfig");
  const controlPlaneIPs =
    clusterConfig.serialised.talos?.nodes["control-plane"].ips ?? [];

  if (controlPlaneIPs.length) {
    await talosctl.config.endpoints(talosconfig, controlPlaneIPs, { basedir });
    await talosctl.config.nodes(talosconfig, controlPlaneIPs, { basedir });
  }

  logger.info(`Generated configs in ${outputDir}`);
}

export async function apply({
  logger,
  basedir,
  secretsdir,
  insecure,
  bootstrap,
}: {
  logger: Logger;
  basedir: string;
  secretsdir: string;
  insecure: boolean;
  bootstrap: boolean;
}) {
  logger.info(`Started apply`);

  const { talosctl, clusterConfig } = await setup({ logger, basedir });

  await talosctl.gen["apply-config"](clusterConfig, {
    basedir,
    insecure,
    configDir: path.resolve(secretsdir, "talos.sops"),
  });

  logger.info(`Applied config to all nodes`);

  if (bootstrap) {
    await bootstrapCluster({
      logger,
      talosctl,
      clusterConfig,
      basedir,
      secretsdir,
    });
  }
}

export async function sync({
  logger,
  basedir,
  secretsdir,
  insecure,
  bootstrap,
}: {
  logger: Logger;
  basedir: string;
  secretsdir: string;
  insecure: boolean;
  bootstrap: boolean;
}) {
  await generate({ logger, basedir, secretsdir });
  await apply({ logger, basedir, secretsdir, insecure, bootstrap });
}

async function bootstrapCluster({
  logger,
  talosctl,
  clusterConfig,
  basedir,
  secretsdir,
}: {
  logger: Logger;
  talosctl: ReturnType<typeof TalosCtl>;
  clusterConfig: ClusterConfig;
  basedir: string;
  secretsdir: string;
}) {
  const controlPlaneIPs =
    clusterConfig.serialised.talos?.nodes["control-plane"].ips ?? [];
  const configDir = path.resolve(secretsdir, "talos.sops");

  logger.info(`Sleeping for 60 seconds to allow nodes to come up`);
  await new Promise((resolve) => setTimeout(resolve, 60000));

  logger.info(`Bootstrapping control plane`);
  await talosctl.bootstrap(
    path.resolve(configDir, "talosconfig"),
    controlPlaneIPs[0],
    { basedir },
  );

  logger.info(`Sleeping for 60 seconds to allow control plane to come up`);
  await new Promise((resolve) => setTimeout(resolve, 60000));

  logger.info(`Downloading kubeconfig`);
  await talosctl.kubeconfig(
    path.resolve(configDir, "talosconfig"),
    path.resolve(basedir, clusterConfig.serialised.name, "kubeconfig"),
    { basedir },
  );

  logger.info(`Kubeconfig downloaded. Ready to use with kubectl`);
}
