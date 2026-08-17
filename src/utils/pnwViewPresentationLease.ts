import type {
  PnwViewPresentationLeaseEvent,
  PnwViewPresentationLeaseHandle,
  PnwViewPresentationLeaseRegistry,
  PnwViewPresentationLeaseSnapshot,
  PnwViewPresentationRecord,
  PnwViewPresentationRuntimeTargets,
} from "../types/PnwViewPresentation.js";

export interface PnwViewPresentationLeaseRegistryOptions {
  /** 默认延迟到 microtask 后的 animation frame，给正常 reparent/HMR 重建留出接管窗口。 */
  readonly scheduleRecovery?: (callback: () => void) => void;
}

interface PnwMutableViewPresentationLease {
  readonly viewInstanceId: string;
  readonly revision: number;
  ownerAlive: boolean;
  committed: boolean;
  leaseCount: number;
  recoveryScheduled: boolean;
}

function pnwDefaultLeaseRecoveryScheduler(callback: () => void): void {
  queueMicrotask(() => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => callback());
      return;
    }
    queueMicrotask(callback);
  });
}

function pnwValidateLeaseIdentity(viewInstanceId: string, revision: number): void {
  if (!viewInstanceId.trim()) throw new TypeError("viewInstanceId must not be empty");
  if (!Number.isInteger(revision) || revision < 0) {
    throw new TypeError("revision must be a non-negative integer");
  }
}

/**
 * 创建 renderer 内 presentation lease registry。
 * 它以 generation/revision 而不是 DOM childCount 判断空宿主，避免正常 Teleport/reparent
 * 的瞬时空态误触发销毁。
 */
export function pnwCreateViewPresentationLeaseRegistry(
  options: PnwViewPresentationLeaseRegistryOptions = {},
): PnwViewPresentationLeaseRegistry {
  const entries = new Map<string, PnwMutableViewPresentationLease>();
  const listeners = new Set<(event: PnwViewPresentationLeaseEvent) => void>();
  const scheduleRecovery = options.scheduleRecovery ?? pnwDefaultLeaseRecoveryScheduler;

  function emit(event: PnwViewPresentationLeaseEvent): void {
    for (const listener of listeners) listener(event);
  }

  function schedule(entry: PnwMutableViewPresentationLease): void {
    if (entry.recoveryScheduled) return;
    entry.recoveryScheduled = true;
    scheduleRecovery(() => {
      const current = entries.get(entry.viewInstanceId);
      if (current !== entry) return;
      entry.recoveryScheduled = false;
      if (entry.leaseCount > 0) return;
      entries.delete(entry.viewInstanceId);
      emit({
        type: "orphaned",
        viewInstanceId: entry.viewInstanceId,
        revision: entry.revision,
        recovery: entry.ownerAlive ? "rollback" : "dispose",
      });
    });
  }

  return {
    acquire(input) {
      pnwValidateLeaseIdentity(input.viewInstanceId, input.revision);
      const current = entries.get(input.viewInstanceId);
      const entry = !current || input.revision > current.revision
        ? {
            viewInstanceId: input.viewInstanceId,
            revision: input.revision,
            ownerAlive: input.ownerAlive !== false,
            committed: false,
            leaseCount: 1,
            recoveryScheduled: false,
          }
        : current;
      const currentGeneration = !current || input.revision > current.revision;
      if (currentGeneration) entries.set(input.viewInstanceId, entry);
      else if (input.revision === entry.revision) {
        entry.leaseCount += 1;
        entry.ownerAlive = input.ownerAlive !== false;
      }

      let released = false;
      const liveGeneration = input.revision === entry.revision;
      return {
        viewInstanceId: input.viewInstanceId,
        revision: input.revision,
        commit(targets: PnwViewPresentationRuntimeTargets) {
          if (
            released
            || !liveGeneration
            || entries.get(input.viewInstanceId) !== entry
            || targets.viewInstanceId !== input.viewInstanceId
            || targets.revision !== input.revision
            || !targets.headerTarget
            || !targets.mainTarget
          ) return false;
          entry.committed = true;
          return true;
        },
        release() {
          if (released) return;
          released = true;
          if (!liveGeneration || entries.get(input.viewInstanceId) !== entry) return;
          entry.leaseCount = Math.max(0, entry.leaseCount - 1);
          if (entry.leaseCount === 0) schedule(entry);
        },
      };
    },
    setOwnerAlive(viewInstanceId, ownerAlive) {
      const entry = entries.get(viewInstanceId);
      if (!entry) return;
      entry.ownerAlive = ownerAlive;
      if (entry.leaseCount === 0) schedule(entry);
    },
    reconcileOwners(records: readonly PnwViewPresentationRecord[]) {
      const owners = new Set(records.map((record) => record.identity.viewInstanceId));
      for (const entry of entries.values()) {
        entry.ownerAlive = owners.has(entry.viewInstanceId);
        if (entry.leaseCount === 0) schedule(entry);
      }
    },
    snapshot(): readonly PnwViewPresentationLeaseSnapshot[] {
      return [...entries.values()].map((entry) => ({
        viewInstanceId: entry.viewInstanceId,
        revision: entry.revision,
        ownerAlive: entry.ownerAlive,
        committed: entry.committed,
        leaseCount: entry.leaseCount,
      }));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const PNW_DOCUMENT_VIEW_PRESENTATION_LEASE_REGISTRIES = new WeakMap<
  Document,
  PnwViewPresentationLeaseRegistry
>();

/** 同一 Document 的默认 lease registry；跨 Webview/Tauri 由 Host adapter 显式注入。 */
export function pnwGetDocumentViewPresentationLeaseRegistry(
  ownerDocument: Document,
): PnwViewPresentationLeaseRegistry {
  const current = PNW_DOCUMENT_VIEW_PRESENTATION_LEASE_REGISTRIES.get(ownerDocument);
  if (current) return current;
  const created = pnwCreateViewPresentationLeaseRegistry();
  PNW_DOCUMENT_VIEW_PRESENTATION_LEASE_REGISTRIES.set(ownerDocument, created);
  return created;
}
