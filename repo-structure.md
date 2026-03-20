# Repository Structure

## Overview

Infrastructure-as-code repository for the `herd-1` Kubernetes cluster. Contains raw Kubernetes/Helm manifests applied via `apply-dir.sh`. The cluster runs on Talos Linux VMs in Proxmox.

## Directory Layout

```
.
├── apply-dir.sh           # Applies all YAML files in a directory sequentially (2s delay between)
├── kubectl                # Symlink → utils/bin/kubectl
├── helm                   # Symlink → utils/bin/helm
├── talosctl               # Symlink → utils/bin/talosctl
├── talos.yaml             # Cluster definition (node IPs, config patches)
├── config-patch/          # Talos machine config patches (DHCP, VIP, install disk, etc.)
├── image-config/          # Talos image customization (extensions, overlays)
├── charts/                # Kubernetes manifests, organized by component
│   ├── argocd/            # ArgoCD GitOps controller (~60 manifest files)
│   ├── jellyfin/          # Media server (not deployed, needs storage)
│   ├── kube-proxy/        # kube-proxy configmap (not used — Talos manages kube-proxy directly)
│   ├── metallb/           # MetalLB load balancer — BGP peer + IP pool config
│   ├── metricserver/      # Kubernetes metrics server
│   ├── nfs/               # NFS CSI driver + test StorageClass/PVC (being replaced by LINSTOR)
│   ├── traefik/           # Traefik ingress controller, services, IngressRoutes
│   └── whoami/            # Demo app (not deployed)
├── secrets/               # Encrypted secrets
│   ├── age.key            # age encryption key
│   └── cluster.sops/      # Encrypted cluster secrets directory
│       ├── kubeconfig.sops           # SOPS-encrypted kubeconfig
│       ├── talos-secrets.sops.yaml   # Cluster identity secrets (CA certs, keys)
│       └── talos.sops/               # Talos operational configs
│           ├── talosconfig.sops
│           ├── controlplane.sops.yaml
│           └── worker.sops.yaml
└── utils/
    ├── bin/               # kubectl, helm binaries + saggycli wrapper
    └── split_def/         # TypeScript tool to split multi-document YAML
```

## Conventions

- **Numbered manifests**: Files prefixed with numbers for apply ordering (`01-namespace.yaml`, `02-config.yaml`, `03-deployment.yaml`)
- **One component per directory**: Each `charts/` subdirectory is a self-contained set of manifests for one component
- **apply-dir.sh**: Standard way to apply a component — iterates YAML files in order with delays
- **saggycli wrapper**: `./kubectl`, `./helm`, and `./talosctl` are symlinks that go through saggycli, which decrypts SOPS-encrypted files/directories and passes them to the underlying tool

## Secrets Management

- **SOPS + age**: Kubeconfig is encrypted at rest with SOPS using age keys
- The `saggycli` tool handles decryption transparently when running kubectl/helm
- `.gitignore` excludes raw kubeconfig files

## Domain

`*.herd-1.herdwick.oatmealstuffing.com` — Cloudflare-managed DNS
