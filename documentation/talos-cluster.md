# Talos Cluster Management

## Secrets

All cluster secrets live under `secrets/cluster.sops/`, encrypted with SOPS + age:

- **`kubeconfig.sops`** — Kubernetes kubeconfig, used by `./kubectl` and `./helm`.
- **`talos-secrets.sops.yaml`** — Cluster identity secrets (CA certs, keys, bootstrap token). Used when generating new machine configs.
- **`talos.sops/`** — Operational configs (talosconfig, controlplane.yaml, worker.yaml). Used day-to-day by `./talosctl` to talk to the cluster.

All are encrypted/decrypted via saggycli.

## ./talosctl wrapper

`./talosctl` is a symlink to `utils/bin/talosctl`, which:
1. Decrypts `secrets/cluster.sops/talos.sops/` to a temp directory
2. Runs `talosctl --talosconfig {tempdir}/talosconfig` with your arguments
3. Cleans up the temp directory

```bash
./talosctl version
./talosctl get members
./talosctl -n 10.1.3.1 dashboard
```

## Cluster Definition — talos.yaml

`talos.yaml` defines the cluster topology in cloosterctl format: node IPs, config patches to apply, and grouping (control-plane vs worker). Used by cloosterctl when generating or applying machine configs.

## Config Patches — config-patch/

Talos machine config patches referenced by `talos.yaml` and applied when generating machine configs:

| File | Purpose |
|---|---|
| `dhcp.yaml` | Enable DHCP on eth0 |
| `install-disk.yaml` | Set install disk to `/dev/sda` |
| `interface-names.yaml` | Use classic interface names (`net.ifnames=0`) |
| `kubelet-certificates.yaml` | Enable kubelet cert rotation + metrics server |
| `virtual-ip.yaml` | Shared VIP on eth0 for HA control plane |
| `allow-controlplane-workloads.yaml` | Allow scheduling on control plane nodes |

## Image Config — image-config/

`image-config/proxmox-guest.yaml` defines the Talos image customization:
- Proxmox guest overlay (qemu-guest-agent)
- System extensions (iscsi-tools, util-linux-tools, amd-ucode)
- Used to generate image URLs from the Talos Image Factory

## cloosterctl

TypeScript tool in `utils/cloosterctl/` that automates Talos cluster operations. Run from the repo root via:

```bash
cd utils/cloosterctl && yarn cloosterctl <command> [options]
```

It uses `process.cwd()` as the base directory but is invoked via `yarn cloosterctl` (which runs from `utils/cloosterctl/`). Since `talos.yaml` and `config-patch/` are now at the repo root, run cloosterctl from the repo root by adjusting the config path or symlinking.

### Commands

**`cloosterctl apply -c <config> [--insecure]`** — Full cluster bootstrap/update pipeline:
1. Generates secrets (`talosctl gen secrets`) if none exist yet
2. Generates machine configs (`talosctl gen config`) with all patches from `talos.yaml`
3. Applies configs to all control-plane and worker nodes (in parallel)
4. Waits 60s, then bootstraps Kubernetes on the first control-plane node
5. Sets endpoints and nodes in talosconfig
6. Downloads kubeconfig

Use `--insecure` for first-time apply to nodes that don't yet have a config.

**`cloosterctl install`** — Installs talosctl via the official install script.

### Output

cloosterctl writes generated files to a `<cluster-name>/` directory (i.e. `./herd-1/`) relative to cwd. This directory is gitignored. After generation, encrypt the outputs into `secrets/cluster.sops/`:

```bash
# Encrypt the talos-secrets if newly generated
./utils/bin/saggycli encrypt herd-1/talos-secrets.yaml
mv herd-1/talos-secrets.sops.yaml secrets/cluster.sops/talos-secrets.sops.yaml

# Encrypt the operational configs
./utils/bin/saggycli encrypt herd-1/talos
mv herd-1/talos.sops/* secrets/cluster.sops/talos.sops/
```

## Regenerating Machine Configs

### Using cloosterctl (recommended)

The full pipeline handles config generation, applying to nodes, and bootstrapping. For disaster recovery, this is the path to use — see `cloosterctl apply` above.

For just regenerating configs without applying, cloosterctl doesn't currently support that as a standalone step. Use the manual approach below.

### Manual approach

Decrypt the cluster identity secrets, generate configs, then encrypt the results:

```bash
# Decrypt secrets to a temp location, generate configs
./utils/bin/saggycli with secrets/cluster.sops/talos-secrets.sops.yaml -- \
  talosctl gen config herd-1 https://10.1.3.1:6443 \
    --with-secrets {} \
    --config-patch @config-patch/dhcp.yaml \
    --config-patch @config-patch/install-disk.yaml \
    --config-patch @config-patch/interface-names.yaml \
    --config-patch @config-patch/kubelet-certificates.yaml \
    --config-patch @config-patch/virtual-ip.yaml \
    --config-patch-control-plane @config-patch/allow-controlplane-workloads.yaml \
    --output herd-1/talos \
    --force

# Encrypt and move back
./utils/bin/saggycli encrypt herd-1/talos
cp herd-1/talos.sops/* secrets/cluster.sops/talos.sops/
```

## Disaster Recovery

Full cluster rebuild from encrypted secrets:

1. Boot Talos nodes from image (see `image-config/proxmox-guest.yaml` for the factory image URL)
2. Run `cloosterctl apply -c ../../talos.yaml --insecure` from `utils/cloosterctl/` (or adjust paths)
3. Encrypt the generated configs back into `secrets/cluster.sops/`
4. Verify with `./talosctl get members` and `./kubectl get nodes`

If the cluster identity secrets (`talos-secrets.sops.yaml`) are lost, cloosterctl will generate new ones — but this means a completely fresh cluster (new CAs, new bootstrap token).
