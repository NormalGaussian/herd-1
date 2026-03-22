# CLAUDE.md

## Project

Kubernetes homelab cluster (`herd-1`) running on Talos Linux in Proxmox.

## Key Commands

Top-level scripts are symlinks into `utils/bin/`.

- `./kubectl <args>` — kubectl via saggycli (auto-decrypts SOPS kubeconfig)
- `./helm <args>` — helm via saggycli
- `./talosctl <args>` — talosctl via saggycli (auto-decrypts SOPS talosconfig)
- `./apply-dir.sh kubernetes/charts/<component>` — wraps kubectl, applies all manifests in a component directory
- `./connectivity-check` — checks talosctl/kubectl connectivity and validates node counts against `talos.yaml`

## Reference Documents

- `documentation/repo-structure.md` — Repository layout, conventions, and how manifests are organized
- `documentation/k8s-cluster.md` — What's running on the cluster, known issues, and undeployed components
- `documentation/network-layout.md` — Network topology from internet to cluster (pfsense, Proxmox, Talos)
- `documentation/networking-options.md` — Options for exposing services externally (CF Tunnel + Tailscale)
- `documentation/storage-situation.md` — Storage: NFS is placeholder, migrating to LINSTOR/DRBD
- `documentation/talos-cluster.md` — Talos cluster management, secrets, and config
- `documentation/saggycli.md` — saggycli CLI for SOPS encryption/decryption of secrets
- `documentation/cloosterctl.md` — cloosterctl tool for Talos cluster bootstrap and management and connection regeneration
- `documentation/split-def.md` — split-def tool for splitting multi-document YAML files
