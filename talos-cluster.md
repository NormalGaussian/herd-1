# Talos Cluster Management

## Secrets

Two categories of Talos secrets are encrypted with SOPS + age:

- **`secrets/talos-secrets.sops.yaml`** — Cluster identity secrets (CA certs, keys, bootstrap token). Used when generating new machine configs with `talosctl gen config`.
- **`secrets/talos.sops/`** — Operational configs (talosconfig, controlplane.yaml, worker.yaml). Used day-to-day by `./talosctl` to talk to the cluster.

Both are encrypted/decrypted via saggycli. The kubeconfig remains separate at `secrets/kubeconfig.sops`.

## ./talosctl wrapper

`./talosctl` is a symlink to `utils/bin/talosctl`, which:
1. Decrypts `secrets/talos.sops/` to a temp directory
2. Runs `talosctl --talosconfig {tempdir}/talosconfig` with your arguments
3. Cleans up the temp directory

```bash
./talosctl version
./talosctl get members
./talosctl -n 10.1.3.1 dashboard
```

## Cluster Definition — talos.yaml

`talos.yaml` defines the cluster topology: node IPs, config patches to apply, and grouping (control-plane vs worker). This is a cloosterctl config format — used when generating or regenerating machine configs.

## Config Patches — config-patch/

Talos machine config patches in `config-patch/` are referenced by `talos.yaml` and applied when generating machine configs:

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

## Regenerating Machine Configs

To regenerate from secrets + patches (using cloosterctl or manually):

```bash
# Manual approach
./utils/bin/saggycli with secrets/talos-secrets.sops.yaml -- \
  talosctl gen config herd-1 https://10.1.3.1:6443 \
    --with-secrets {} \
    --config-patch @config-patch/dhcp.yaml \
    --config-patch @config-patch/install-disk.yaml \
    --config-patch @config-patch/interface-names.yaml \
    --config-patch @config-patch/kubelet-certificates.yaml \
    --config-patch @config-patch/virtual-ip.yaml \
    --config-patch-control-plane @config-patch/allow-controlplane-workloads.yaml
```

The generated `controlplane.yaml`, `worker.yaml`, and `talosconfig` should then be placed in `secrets/talos/` and encrypted with `./utils/bin/saggycli encrypt secrets/talos`.
