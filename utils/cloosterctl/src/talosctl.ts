import { run } from "./run.ts";
import type { ClusterConfig } from "./cluster-config.ts";
import { ErrorWithMeta } from "./utils.ts";
import path from "path";
import type { Logger } from "@normed/log-flour";

function basicHooks(commandPurpose: string, logger: Logger) {
  return {
    exit(
      code: null | number,
      signal: NodeJS.Signals | null,
      command: string,
      args: string[],
    ) {
      if (!code && !signal) {
        logger.debug(`Ran command to ${commandPurpose}`, {
          "$>": `${command} ${args.join(" ")}`,
          code,
          signal,
        });
      }
    },
  };
}

export function TalosCtl({ logger }: { logger: Logger }) {
  return {
    /**
     * Check if talosctl is installed (on PATH as `talosctl`)
     */
    verifyInstallation: async () => {
      try {
        await run("which", ["talosctl"], {
          stdout: false,
          stderr: false,
          errorOnNonZeroExitCode: true,
          hooks: basicHooks("Check if talosctl is installed", logger),
        });
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Install talosctl using the script from the talos site
     */
    async install() {
      return await run(
        "sh",
        ["-c", `curl -sSfL curl -sL https://talos.dev/install | sh`],
        {
          stdout: true,
          stderr: true,
          errorOnNonZeroExitCode: true,
          hooks: basicHooks("Install talosctl", logger),
        },
      );
    },
    async bootstrap(
      talosconfig: string,
      node: string,
      { basedir }: { basedir: string },
    ): ReturnType<typeof run> {
      return await run(
        "talosctl",
        ["bootstrap", "-n", node, "--talosconfig", talosconfig],
        {
          stdout: true,
          stderr: true,
          spawnOptions: { cwd: basedir },
          errorOnNonZeroExitCode: true,
          hooks: basicHooks("bootstrap control plane", logger),
        },
      );
    },

    async kubeconfig(
      talosconfig: string,
      outputPath: string,
      { basedir }: { basedir: string },
    ): ReturnType<typeof run> {
      return await run(
        "talosctl",
        ["--talosconfig", talosconfig, "kubeconfig", outputPath],
        {
          stdout: true,
          stderr: true,
          spawnOptions: { cwd: basedir },
          errorOnNonZeroExitCode: true,
          hooks: basicHooks("download kubeconfig", logger),
        },
      );
    },

    config: {
      async endpoints(
        talosconfig: string,
        endpoints: string[],
        { basedir }: { basedir: string },
      ): ReturnType<typeof run> {
        return await run(
          "talosctl",
          ["config", "endpoints", "--talosconfig", talosconfig, ...endpoints],
          {
            stdout: true,
            stderr: true,
            spawnOptions: { cwd: basedir },
            errorOnNonZeroExitCode: true,
            hooks: basicHooks("set endpoints in talosconfig", logger),
          },
        );
      },
      async nodes(
        talosconfig: string,
        nodes: string[],
        { basedir }: { basedir: string },
      ): ReturnType<typeof run> {
        return await run(
          "talosctl",
          ["config", "nodes", "--talosconfig", talosconfig, ...nodes],
          {
            stdout: true,
            stderr: true,
            spawnOptions: { cwd: basedir },
            errorOnNonZeroExitCode: true,
            hooks: basicHooks("set nodes in talosconfig", logger),
          },
        );
      },
    },
    gen: {
      /**
       * Run `talosctl gen config ...` using the options from a ClusterConfig
       *
       * @param config ClusterConfig
       */
      async config(
        config: ClusterConfig,
        secretsFile: string | undefined,
        { basedir, outputDir }: { basedir: string; outputDir?: string },
      ): ReturnType<typeof run> {
        const {
          serialised: { name, talos },
        } = config;
        logger.info(`Generating talos config`, { name });

        if (!talos) {
          throw new ErrorWithMeta(
            `A talos configuration is required to run this command`,
          );
        }

        // Directory definitely exists
        const configPatches = {
          worker: [
            ...(talos.nodes.all?.["config-patch"] ?? []),
            ...(talos.nodes.worker["config-patch"] ?? []),
          ],
          controlPlane: [
            ...(talos.nodes.all?.["config-patch"] ?? []),
            ...(talos.nodes["control-plane"]["config-patch"] ?? []),
          ],
        };

        // TODO: sanitise string substitutions?
        return await run(
          "talosctl",
          [
            "gen",
            "config",
            name,
            `https://${talos.cluster.ip}:6443`,
            ...configPatches.worker
              .map((filepath) => [`--config-patch`, `@${filepath}`])
              .flat(),
            ...configPatches.controlPlane
              .map((filepath) => [
                `--config-patch-control-plane`,
                `@${filepath}`,
              ])
              .flat(),
            "--output",
            outputDir ?? path.resolve(basedir, name, "talos"),
            ...(secretsFile ? ["--with-secrets", secretsFile] : []),
            "--force", // override if they already exist
          ],
          {
            stdout: true,
            stderr: true,
            spawnOptions: { cwd: basedir },
            errorOnNonZeroExitCode: true,
            hooks: basicHooks("Generate Config", logger),
          },
        );
      },
      /**
       * Generate a talosctl secrets file
       *
       * Uses `talosctl gen secrets`
       *
       * @param secretsFile
       */
      async secrets(
        secretsFile: string,
        { basedir }: { basedir: string },
      ): ReturnType<typeof run> {
        return await run(
          "talosctl",
          ["gen", "secrets", "-o", path.resolve(basedir, secretsFile)],
          {
            stdout: true,
            stderr: true,
            spawnOptions: { cwd: basedir },
            errorOnNonZeroExitCode: true,
            hooks: basicHooks("generate secrets", logger),
          },
        );
      },
      /**
       *
       */
      async "apply-config"(
        clusterConfig: ClusterConfig,
        {
          basedir,
          insecure,
          configDir,
        }: { basedir: string; insecure: boolean; configDir: string },
      ): Promise<void> {
        const {
          serialised: { name, talos },
        } = clusterConfig;
        logger.info(`Applying talos config`, { name });
        if (!talos) {
          throw new ErrorWithMeta(
            `A talos configuration is required to run this command`,
          );
        }

        const workerIPs = talos.nodes.worker.ips ?? [];
        const controlPlaneIPs = talos.nodes["control-plane"].ips ?? [];
        logger.debug(`Applying config`, { workerIPs, controlPlaneIPs });

        if (!workerIPs.length && !controlPlaneIPs.length) {
          throw new ErrorWithMeta(
            `Cannot apply config - no worker nodes and no control plane nodes`,
            { workerIPs, controlPlaneIPs },
          );
        }

        const promises: Promise<void>[] = [];

        const flags = [insecure ? "--insecure" : false].filter(
          (v): v is string => typeof v === "string",
        );

        if (controlPlaneIPs.length) {
          const promise = run(
            "talosctl",
            [
              ...controlPlaneIPs.map((ip) => ["-n", ip]).flat(),
              "apply-config",
              ...flags,
              "-e",
              controlPlaneIPs[0],
              "--talosconfig",
              path.resolve(configDir, "talosconfig"),
              "--file",
              path.resolve(configDir, "controlplane.yaml"),
            ],
            {
              stdout: true,
              stderr: true,
              spawnOptions: { cwd: basedir },
              errorOnNonZeroExitCode: true,
              hooks: basicHooks("apply config to control plane nodes", logger),
            },
          ).then(() => {});
          promises.push(promise);
        }

        if (workerIPs.length) {
          const promise = run(
            "talosctl",
            [
              ...workerIPs.map((ip) => ["-n", ip]).flat(),
              "apply-config",
              ...flags,
              "--file",
              path.resolve(configDir, "worker.yaml"),
            ],
            {
              stdout: true,
              stderr: true,
              spawnOptions: { cwd: basedir },
              errorOnNonZeroExitCode: true,
              hooks: basicHooks("apply config to worker nodes", logger),
            },
          ).then(() => {});
          promises.push(promise);
        }

        await Promise.all(promises);
        logger.info(`Applied config to all nodes`, { name });
      },
    },
  };
}
