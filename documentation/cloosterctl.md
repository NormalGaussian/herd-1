# cloosterctl

TypeScript tool for managing Talos Linux cluster configs. Lives in `utils/cloosterctl/`.

## Running

From the repo root, use the wrapper script:

```bash
./utils/bin/cloosterctl <command> [options]
```

The wrapper handles SOPS decryption/encryption of `secrets/cluster.sops/` automatically via saggycli.

## Commands

### `cloosterctl generate`

Regenerates machine configs from `talos.yaml` and existing secrets. Writes configs back to the encrypted secrets directory.

```bash
./utils/bin/cloosterctl generate
```

### `cloosterctl apply [--insecure] [--bootstrap]`

Applies already-generated configs to cluster nodes (control-plane and workers in parallel).

```bash
# Normal apply
./utils/bin/cloosterctl apply

# First-time apply to unconfigured nodes
./utils/bin/cloosterctl apply --insecure --bootstrap
```

Flags:
- `--insecure` — allow insecure connections to nodes that don't yet have a config
- `--bootstrap` — after applying, run the full bootstrap sequence: wait for nodes, bootstrap etcd on the first control-plane node, download kubeconfig

### `cloosterctl sync [--insecure] [--bootstrap]`

Runs `generate` then `apply`. The most common command for day-to-day use.

```bash
# Regenerate and push config changes
./utils/bin/cloosterctl sync

# First-time cluster setup
./utils/bin/cloosterctl sync --insecure --bootstrap
```

## Config File — talos.yaml

`talos.yaml` at the repo root defines the cluster topology:

- Cluster name and endpoint
- Node IPs and roles (control-plane vs worker)
- Config patches to apply (referencing files in `talos/config-patch/`)

## How It Works

The wrapper script (`utils/bin/cloosterctl`) decrypts `secrets/cluster.sops/` via saggycli and passes the decrypted path to the TypeScript tool as `--secretsdir`. For `generate` and `sync`, changes are written back (`-w` flag) so regenerated configs are re-encrypted. For `apply`, secrets are decrypted read-only.
