# Future Networking Options

## Context

The cluster needs both internal (home LAN) and external (internet) access to services. There is a single home WAN IP behind NAT. MetalLB BGP is now working for internal access from the home network.

## Current State

MetalLB BGP delivers traffic from the home network to cluster services via `10.1.64.1` (Traefik VIP). This works for devices on the home LAN. External (internet) access is not yet configured.

## Option 1: Traditional NAT Port Forwarding

```
Internet → Home pfsense :443 → Cluster pfsense nginx → Traefik (10.1.64.1)
```

- Simple, low latency for both LAN and WAN
- Exposes home IP, needs DDNS
- Ties up port 443 on the single WAN IP
- Two reverse proxies in the chain (nginx → Traefik)

## Option 2: Cloudflare Tunnel (External) + Split DNS (Internal)

Run `cloudflared` as a k8s pod connecting outbound to Cloudflare's edge.

- No ports opened at home, home IP hidden, DDoS protection
- Internal: split-horizon DNS resolves domains to MetalLB VIP directly
- **Problem**: devices using DNS-over-HTTPS (DoH) bypass local DNS, causing all traffic to hairpin through Cloudflare — adds latency and depends on internet for local services

## Option 3: Cloudflare Tunnel + Tailscale

**External access**: Cloudflare Tunnel (`cloudflared` pod) → Traefik ClusterIP
**Internal access**: Tailscale subnet router (pod) advertising cluster IPs

- External: no open ports, Cloudflare handles TLS and DDoS
- Internal: Tailscale's MagicDNS installs a local DNS stub that intercepts queries before DoH — solves the split-DNS problem
- Both run as k8s deployments
- Tailscale free tier supports 100 devices
- Tailscale client needed on each home device (available on all platforms)

### Why Tailscale solves the DoH problem

Regular split DNS fails because DoH sends queries directly to external resolvers (1.1.1.1, 8.8.8.8), bypassing local DNS. Tailscale installs a local DNS agent that intercepts queries for tailnet domains _before_ the system resolver or DoH — so internal resolution works regardless of the device's DNS configuration.

### Architecture

```
External users:
  Internet → Cloudflare Tunnel → cloudflared pod → Traefik ClusterIP → services

Home devices (with Tailscale):
  Device → MagicDNS → WireGuard → subnet router pod → Traefik ClusterIP → services

Home devices (without Tailscale):
  Device → MetalLB VIP (10.1.64.1) directly via BGP-routed path
```

## Other Considerations

- Cloudflare requires paid plans for non-HTTP protocols — Jellyfin streaming over HTTPS is fine
- Let's Encrypt config in Traefik becomes optional if Cloudflare handles external TLS
- The cluster pfsense nginx proxy could be bypassed entirely for k8s traffic with these tunnel approaches
- MetalLB BGP already handles internal access — tunnels are only needed for external access and DoH-aware DNS resolution
