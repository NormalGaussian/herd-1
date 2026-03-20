# CLAUDE.md

## Project

Kubernetes homelab cluster (`herd-1`) running on Talos Linux in Proxmox.

## Key Commands

- `./kubectl <args>` — kubectl via saggycli (auto-decrypts SOPS kubeconfig)
- `./helm <args>` — helm via saggycli
- `./talosctl <args>` — talosctl via saggycli (auto-decrypts SOPS talosconfig)
- `./apply-dir.sh charts/<component>` — apply all manifests in a component directory

## saggycli

- `saggycli encrypt <file>` — encrypts file to `<file>.sops` (or `.sops.yaml`)
- `saggycli encrypt <dir>` — encrypts directory to `<dir>.sops/`
- `saggycli with <file-or-dir.sops> -- <command>` — decrypt to temp, run command with `{}` as placeholder for temp path, clean up
- `saggycli with <target> -w -- <command>` — same but encrypts changes back after command completes

## Reference Documents

- [repo-structure.md](repo-structure.md) — Repository layout, conventions, and how manifests are organized
- [k8s-cluster.md](k8s-cluster.md) — What's running on the cluster, known issues, and undeployed components
- [network-layout.md](network-layout.md) — Network topology from internet to cluster (pfsense, Proxmox, Talos)
- [networking-options.md](networking-options.md) — Options for exposing services externally (CF Tunnel + Tailscale)
- [storage-situation.md](storage-situation.md) — Storage: NFS is placeholder, migrating to LINSTOR/DRBD
- [talos-cluster.md](talos-cluster.md) — Talos cluster management, secrets, and config
