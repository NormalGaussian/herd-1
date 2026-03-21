# Kubernetes Cluster: herd-1

## Nodes

Two Talos Linux control-plane nodes running as Proxmox VMs. Kubernetes v1.31.2, cluster age ~465 days.

| Node | IP | Role |
|---|---|---|
| talos-f3i-22w | 10.1.3.1 | control-plane |
| talos-fu9-1ez | 10.1.3.2 | control-plane |

## Running Workloads

| Namespace | Component | Purpose | Status |
|---|---|---|---|
| traefik | Traefik v3.2 | Ingress controller, LB at 10.1.64.1 via BGP | Running |
| metallb-system | MetalLB v0.14.8 | Load balancer (BGP mode, peering with cluster pfsense FRR) | Running |
| argocd | ArgoCD | GitOps continuous deployment (7 pods) | Running |
| kube-system | CoreDNS | Cluster DNS | Running |
| kube-system | NFS CSI v4.9.0 | Storage driver (StorageClass applied but NFS server not configured — see storage-situation.md) | Running |
| kube-system | Metrics Server | Resource monitoring | Running |
| kube-system | kube-proxy | nftables mode (not IPVS despite repo configmap) | Running |
| kube-system | Flannel | CNI networking | Running |

## Not Deployed

These are defined in `kubernetes/charts/` but not running on the cluster:

- **Jellyfin** - Media server (needs working storage — see storage-situation.md)
- **whoami** - Test/demo application

## Ingress

Traefik handles ingress via IngressRoute CRDs. Both HTTP and HTTPS entrypoints are active.

| Route | Host | Entrypoint | Status |
|---|---|---|---|
| traefik | traefik.herd-1.herdwick.oatmealstuffing.com | web | Working |
| traefik-secure | traefik.herd-1.herdwick.oatmealstuffing.com | websecure | Working (staging TLS) |
| argo-cd | argocd.herd-1.herdwick.oatmealstuffing.com | web | Working |
| argo-cd-secure | argocd.herd-1.herdwick.oatmealstuffing.com | websecure | Working (staging TLS) |

## Known Issues

- Let's Encrypt still pointed at **staging** CA server — certs are untrusted
- Cloudflare API credentials hardcoded in Traefik deployment (should be a Secret)
- NFS StorageClass points to non-existent NFS server (10.1.1.3:/kubernetes) — need to switch to LINSTOR
- kube-proxy runs nftables mode; the `kubernetes/charts/kube-proxy/configmap.yaml` (IPVS) is not applied/used by Talos
- ICMP (ping) to MetalLB VIPs does not work — this is expected with nftables kube-proxy (only TCP/UDP are proxied)
