# CLAUDE.md

## Project

Kubernetes homelab cluster (`herd-1`) running on Talos Linux in Proxmox.

## Key Commands

- `./kubectl <args>` — kubectl via saggycli (auto-decrypts SOPS kubeconfig)
- `./helm <args>` — helm via saggycli
- `./talosctl <args>` — talosctl via saggycli (auto-decrypts SOPS talosconfig)
- `./apply-dir.sh charts/<component>` — wraps kubectl, applies all manifests in a component directory

## saggycli

- `saggycli encrypt <file>` — encrypts file to `<file>.sops` (or `.sops.<suffix>`)
- `saggycli encrypt <dir>` — encrypts directory to `<dir>.sops/` and everything recursively inside of it
- `saggycli with <file-or-dir.sops> -- <command>` — decrypt to temp, run command with `{}` as placeholder for temp path, clean up
- `saggycli with <target> -w -- <command>` — same but encrypts changes back after command completes

## Reference Documents

- `documentation/repo-structure.md` — Repository layout, conventions, and how manifests are organized
- `documentation/k8s-cluster.md` — What's running on the cluster, known issues, and undeployed components
- `documentation/network-layout.md` — Network topology from internet to cluster (pfsense, Proxmox, Talos)
- `documentation/networking-options.md` — Options for exposing services externally (CF Tunnel + Tailscale)
- `documentation/storage-situation.md` — Storage: NFS is placeholder, migrating to LINSTOR/DRBD
- `documentation/talos-cluster.md` — Talos cluster management, secrets, and config
