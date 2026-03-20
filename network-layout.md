# Network Layout

## Overview

```
Internet
  └─ Home pfsense router (LAN 192.168.2.1)
       └─ Proxmox cluster pfsense (10.1.0.1, runs nginx reverse proxy + FRR BGP)
            └─ Proxmox hosts
                 ├─ Other VMs (e.g., postgres, home-assistant, monitor)
                 └─ Talos VMs (k8s nodes)
                      ├─ 10.1.3.1/16 (talos-f3i-22w)
                      └─ 10.1.3.2/16 (talos-fu9-1ez)
                           └─ MetalLB VIPs: 10.1.64.0/24 (advertised via BGP)
```

**Important**: The cluster pfsense is on its own machine, upstream of the Proxmox hosts. It is NOT on the same bridge/VLAN as the Talos VMs — it routes to them at L3.

## Network Segments

| Segment | Range | Purpose |
|---|---|---|
| Home LAN | 192.168.x.x | Home network, single WAN IP to internet |
| Proxmox cluster | 10.0.0.0/8 | All Proxmox VMs and infrastructure |
| Talos nodes | 10.1.3.1-2/16 | Kubernetes node IPs on eth0 |
| Pod network | 10.244.x.x/24 | Flannel CNI pod CIDR |
| Service CIDR | 10.96.x.x | Kubernetes ClusterIP services |
| MetalLB pool | 10.1.64.0/24 | LoadBalancer VIPs (BGP-advertised to cluster pfsense) |

## Routing Path (home → cluster services)

1. Laptop sends traffic to 10.1.64.1 (Traefik VIP)
2. Home pfsense (192.168.2.1) forwards to cluster pfsense (192.168.2.3)
3. Cluster pfsense has BGP-learned route for 10.1.64.0/24 → Talos node
4. kube-proxy (nftables) DNATs to Traefik pod

## BGP Configuration

| Peer | ASN | Role |
|---|---|---|
| Cluster pfsense (10.1.0.1) | 64512 | Route receiver (FRR) |
| MetalLB speakers (10.1.3.1, 10.1.3.2) | 64513 | Route advertiser |

MetalLB advertises `10.1.64.0/24` VIP routes to the cluster pfsense. Pfsense installs these as routes pointing to the announcing Talos node.

## Key Infrastructure

- **Home pfsense (192.168.2.1)**: NAT gateway to internet, forwards certain traffic to cluster pfsense
- **Cluster pfsense (192.168.2.3 / 10.1.0.1)**: Gateway for all Proxmox traffic, runs nginx reverse proxy and FRR BGP
- **Proxmox hosts**: sheep-1, sheep-3, sheep-5 — hypervisors running Talos VMs and other VMs
- **Single home WAN IP**: Only one public IP, so NAT is required for any internet-facing services

## DNS

- Domain: `*.herd-1.herdwick.oatmealstuffing.com`
- Cloudflare manages DNS for `oatmealstuffing.com`
