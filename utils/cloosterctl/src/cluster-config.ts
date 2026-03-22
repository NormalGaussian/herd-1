import { ErrorWithMeta, readYaml } from "#utils";
import { clusterConfigSchema, type SerialisedClusterConfig } from "#schema";
import fs from "fs";
import node_path from "path";
import path from "path";

export namespace ClusterConfig {
  export type Serialised = SerialisedClusterConfig;
  export type ReadOptions = Partial<{
    eagerFilepathExistence: boolean;
    baseDirectory: string;
  }>;
}

export class ClusterConfig {
  readonly serialised: ClusterConfig.Serialised;
  private constructor(options: { serialised: ClusterConfig.Serialised }) {
    this.serialised = options.serialised;
  }

  public static async fromFile(
    filename: string,
    readOptions?: ClusterConfig.ReadOptions,
  ): Promise<ClusterConfig> {
    path.resolve(readOptions?.baseDirectory ?? process.cwd(), filename);
    const json = await readYaml(filename);
    return ClusterConfig.fromJSON(json, readOptions);
  }

  public static fromJSON(
    o: unknown,
    readOptions?: ClusterConfig.ReadOptions,
  ): ClusterConfig {
    const result = clusterConfigSchema.safeParse(o);
    if (!result.success) {
      throw new ErrorWithMeta(
        `Invalid cluster config: ${result.error.message}`,
      );
    }
    return ClusterConfig.fromSerialised(result.data, readOptions);
  }

  public toJSON() {
    return this.toSerialised();
  }

  public static fromSerialised(
    serialised: ClusterConfig.Serialised,
    readOptions?: ClusterConfig.ReadOptions,
  ): ClusterConfig {
    const config = new ClusterConfig({ serialised });

    if (readOptions?.eagerFilepathExistence) {
      const base = readOptions.baseDirectory ?? process.cwd();
      const filePaths: string[] = [];

      if (serialised.talos?.secrets) {
        filePaths.push(serialised.talos.secrets);
      }

      const patches = serialised.talos?.["config-patch"];
      if (patches) {
        if (patches.worker) filePaths.push(...patches.worker);
        if (patches["control-plane"])
          filePaths.push(...patches["control-plane"]);
        if (patches.all) filePaths.push(...patches.all);
      }

      const nodes = serialised.talos?.nodes;
      if (nodes) {
        if (nodes.all?.["config-patch"])
          filePaths.push(...nodes.all["config-patch"]);
        if (nodes["control-plane"]?.["config-patch"])
          filePaths.push(...nodes["control-plane"]["config-patch"]);
        if (nodes.worker?.["config-patch"])
          filePaths.push(...nodes.worker["config-patch"]);
      }

      for (const fp of filePaths) {
        if (!fs.existsSync(node_path.resolve(base, fp))) {
          throw new ErrorWithMeta(`File does not exist`, { path: fp });
        }
      }
    }

    return config;
  }

  public toSerialised(): ClusterConfig.Serialised {
    return this.serialised;
  }
}
