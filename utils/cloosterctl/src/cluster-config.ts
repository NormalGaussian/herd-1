import { RefinementFunctionType } from "@normed/refinements";
import { ErrorWithMeta, JSONish_leaves, readYaml } from "./utils";
import { refineSerialisedClusterConfig } from "./refinements/refineSerialisedClusterConfig";
import fs from "fs";
import node_path from "path";
import "@normed/json-types";
import path from "path";

export namespace ClusterConfig {
  export type Serialised = RefinementFunctionType<
    typeof refineSerialisedClusterConfig
  >;
  export type TalosConfig = Serialised["talos"];
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

  /**
   * Creates a ClusterConfig from a loosely typed (e.g. JSON/yaml) config.
   *
   * readOptions allow setting verifications on the config itself - e.g. checking files
   *   references exist.
   *
   * @param o the JSON/yaml data
   * @param readOptions
   * @returns ClusterConfig
   */
  public static fromJSON(
    o: JSONishObject,
    readOptions?: ClusterConfig.ReadOptions,
  ): ClusterConfig {
    const serialised = refineSerialisedClusterConfig([], o);
    if (serialised instanceof Error) {
      throw serialised;
    }
    return ClusterConfig.fromSerialised(serialised, readOptions);
  }

  public toJSON(): JSONishObject {
    return this.toSerialised();
  }

  /**
   * Processes a serialised (ie. structurally typed) config into a ClusterConfig
   *
   * readOptions allow setting verifications on the config itself - e.g. checking files
   *   references exist.
   *
   * @param serialised
   * @param readOptions
   * @returns ClusterConfig
   */
  public static fromSerialised(
    serialised: ClusterConfig.Serialised,
    readOptions?: ClusterConfig.ReadOptions,
  ): ClusterConfig {
    const config = new ClusterConfig({ serialised });

    if (readOptions) {
      if (readOptions.eagerFilepathExistence) {
        // Verify files actually exist
        const base = readOptions.baseDirectory ?? process.cwd();

        // talos.secrets
        // talos.config-patch
        const leaves = JSONish_leaves([], config.serialised);
        for (const { leaf, path } of leaves) {
          const path_asSingleString = path.join(".");
          if (
            ![
              "talos.secrets",
              "talos.nodes.all.config-patch",
              "talos.nodes.control-plane.config-patch",
              "talos.nodes.worker.config-patch",
            ].some((prefix) => path_asSingleString.startsWith(prefix))
          ) {
            continue;
          }
          if (path_asSingleString === "talos.secrets" && leaf === undefined) {
            // Secrets are optional
            continue;
          }
          if (typeof leaf !== "string") {
            throw new ErrorWithMeta(
              `Refinement should have ensured that filepath was a string`,
              { path, leaf },
              `FilepathError`,
            );
          }
          if (!fs.existsSync(node_path.resolve(base, leaf))) {
            throw new ErrorWithMeta(
              `File does not exist`,
              { path, leaf },
              `FilepathError`,
            );
          }
        }
      }
    }

    return config;
  }

  public toSerialised(): ClusterConfig.Serialised {
    return this.serialised;
  }
}
