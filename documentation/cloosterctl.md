# cloosterctl

TypeScript tool for automating Talos Linux cluster bootstrap and management. Lives in `utils/cloosterctl/`.

## Running

From the repo root, use the wrapper script:

```bash
./utils/bin/cloosterctl <command> [options]
```

The wrapper script sets up SOPS environment variables and handles saggycli decryption automatically. It invokes `yarn cloosterctl` inside `utils/cloosterctl/`.

You can also run directly (but you'll need to manage secrets decryption yourself):

```bash
cd utils/cloosterctl && yarn cloosterctl --basedir <path> <command> [options]
```

## Commands

### `cloosterctl apply -c <config> [--insecure]`

Full cluster bootstrap/update pipeline:

1. Generates secrets (`talosctl gen secrets`) if none exist yet
2. Generates machine configs (`talosctl gen config`) with all patches from the config file
3. Applies configs to all control-plane and worker nodes (in parallel)
4. Waits 60s, then bootstraps Kubernetes on the first control-plane node
5. Sets endpoints and nodes in talosconfig
6. Downloads kubeconfig

Use `--insecure` for first-time apply to nodes that don't yet have a config.

```bash
./utils/bin/cloosterctl apply -c talos.yaml --insecure
```

### `cloosterctl regenerate -c <config> --secrets <path> --talosdir <path>`

Regenerates machine configs from existing secrets without applying them. Used by the wrapper script with saggycli to decrypt secrets, regenerate, and re-encrypt.

```bash
# Via the wrapper (handles decryption/encryption automatically):
./utils/bin/cloosterctl regenerate -c talos.yaml

# The wrapper decrypts secrets/cluster.sops, passes the decrypted paths
# to cloosterctl, and encrypts changes back with -w
```

### `cloosterctl install`

Installs `talosctl` via the official install script if not already present.

## Config File — talos.yaml

`talos.yaml` at the repo root defines the cluster topology in cloosterctl format:

- Cluster name and endpoint
- Node IPs and roles (control-plane vs worker)
- Config patches to apply (referencing files in `talos/config-patch/`)

## Output

cloosterctl writes generated files to a `<cluster-name>/` directory (i.e. `./herd-1/`) relative to cwd. This directory is gitignored. After generation, encrypt the outputs into `secrets/cluster.sops/`:

```bash
# Encrypt talos-secrets if newly generated
saggycli encrypt herd-1/talos-secrets.yaml
mv herd-1/talos-secrets.sops.yaml secrets/cluster.sops/talos-secrets.sops.yaml

# Encrypt operational configs
saggycli encrypt herd-1/talos
mv herd-1/talos.sops/* secrets/cluster.sops/talos.sops/
```
