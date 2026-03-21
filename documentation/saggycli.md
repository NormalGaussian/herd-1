# saggycli

CLI tool for managing SOPS-encrypted files and directories using age encryption. Used throughout the repo to transparently encrypt/decrypt secrets.

## Location

Binary at `utils/bin/saggycli`. The repo-root symlinks (`./kubectl`, `./helm`, `./talosctl`) all use saggycli under the hood.

## Environment Variables

- `SOPS_AGE_KEY_FILE` — Path to the age private key (e.g. `secrets/age.key`)
- `PUBLIC_KEYFILE` — Path to the public age keys JSON (e.g. `secrets/public-age-keys.json`)

## Commands

### `saggycli encrypt <file>`

Encrypts a file in place, producing `<file>.sops` (or `.sops.<suffix>` for files with extensions).

```bash
saggycli encrypt herd-1/talos-secrets.yaml
# produces herd-1/talos-secrets.sops.yaml
```

### `saggycli encrypt <dir>`

Encrypts a directory recursively, producing `<dir>.sops/` with all contents encrypted.

```bash
saggycli encrypt herd-1/talos
# produces herd-1/talos.sops/
```

### `saggycli with <target.sops> -- <command>`

Decrypts the target (file or directory) to a temp location, runs `<command>` with `{}` replaced by the temp path, then cleans up.

```bash
# Decrypt kubeconfig, run kubectl with it, clean up
saggycli with secrets/cluster.sops/kubeconfig.sops -- kubectl --kubeconfig {} get nodes

# Decrypt a directory, use a file within it
saggycli with secrets/cluster.sops/talos.sops -- talosctl --talosconfig "{}/talosconfig" get members
```

### `saggycli with <target.sops> -w -- <command>`

Same as above, but after the command completes, encrypts any changes back to the original encrypted target. Used when a command modifies the decrypted files.

```bash
# Decrypt, regenerate configs, encrypt changes back
saggycli with secrets/cluster.sops -w -- some-script '{}'
```

## How the Wrapper Scripts Use saggycli

| Wrapper | Encrypted Source | Command |
|---|---|---|
| `./kubectl` | `secrets/cluster.sops/kubeconfig.sops` | `kubectl --kubeconfig {}` |
| `./helm` | `secrets/cluster.sops/kubeconfig.sops` | `helm --kubeconfig {}` |
| `./talosctl` | `secrets/cluster.sops/talos.sops/` | `talosctl --talosconfig {}/talosconfig` |
