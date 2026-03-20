# Storage Situation

## Current State

The cluster has the **NFS CSI driver** (v4.9.0) deployed and a `nfs-csi` StorageClass applied, but it points to a non-existent NFS server (`10.1.1.3:/kubernetes`). PVC provisioning fails with "No such file or directory."

The NFS setup was a test. The intended storage backend is **DRBD/LINSTOR**, which is already running on the Proxmox cluster.

## LINSTOR on Proxmox

LINSTOR storage pools are visible in Proxmox:
- `linstor_storage (sheep-1)`
- `linstor_storage (sheep-3)`
- `crete-sp (sheep-1)`
- `crete-sp (sheep-3)`

This provides replicated block storage across Proxmox hosts via DRBD.

## What's Needed for Kubernetes

To use LINSTOR for Kubernetes PVCs:

1. **LINSTOR CSI driver** — deploy `linstor-csi-controller` and `linstor-csi-node` in the cluster
2. **LINSTOR controller API** — the CSI driver needs to reach the LINSTOR controller (need to determine IP/port)
3. **StorageClass** — a new StorageClass pointing to LINSTOR instead of NFS
4. **Talos as LINSTOR satellite** — the Talos VMs need to either:
   - Run as **diskless LINSTOR satellites** (mount DRBD volumes over the network from Proxmox hosts that hold replicas) — this is the typical approach for immutable OS nodes like Talos
   - Or have DRBD kernel modules available (difficult on Talos due to its immutable nature)

## Open Questions

- What IP/port is the LINSTOR controller accessible on?
- Are the Talos VMs already registered as LINSTOR satellites?
- Which LINSTOR storage pool should be used for k8s PVCs (`linstor_storage` or `crete-sp`)?
- What replication count is desired (1 = performance, 2+ = redundancy)?

## Cleanup

Once LINSTOR storage is working:
- Remove or update the `nfs-csi` StorageClass
- The NFS CSI driver pods can remain (harmless) or be removed
- Update `charts/jellyfin/` to use the new LINSTOR StorageClass
