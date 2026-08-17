import { describe, expect, it, vi } from "vitest";
import type { PnwViewPresentationRuntimeTargets } from "../types/PnwViewPresentation.js";
import { pnwCreateViewPresentationRecord } from "./pnwViewPresentation.js";
import { pnwCreateViewPresentationLeaseRegistry } from "./pnwViewPresentationLease.js";

const PNW_TARGETS = {
  viewInstanceId: "view-a",
  revision: 1,
  headerTarget: {} as HTMLElement,
  mainTarget: {} as HTMLElement,
} satisfies PnwViewPresentationRuntimeTargets;

describe("Pnw View presentation lease registry", () => {
  it("Header/Main 同 revision 后才 commit，release 归零延迟 rollback", () => {
    const recoveries: Array<() => void> = [];
    const listener = vi.fn();
    const registry = pnwCreateViewPresentationLeaseRegistry({
      scheduleRecovery: (callback) => recoveries.push(callback),
    });
    registry.subscribe(listener);
    const lease = registry.acquire({ viewInstanceId: "view-a", revision: 1 });

    expect(lease.commit({ ...PNW_TARGETS, mainTarget: undefined as never })).toBe(false);
    expect(lease.commit(PNW_TARGETS)).toBe(true);
    expect(registry.snapshot()[0]).toMatchObject({ committed: true, leaseCount: 1 });
    lease.release();
    lease.release();
    expect(listener).not.toHaveBeenCalled();
    recoveries.shift()?.();
    expect(listener).toHaveBeenCalledWith({
      type: "orphaned",
      viewInstanceId: "view-a",
      revision: 1,
      recovery: "rollback",
    });
  });

  it("正常 reparent 在恢复检查前重新 acquire，不误销毁空宿主", () => {
    const recoveries: Array<() => void> = [];
    const listener = vi.fn();
    const registry = pnwCreateViewPresentationLeaseRegistry({
      scheduleRecovery: (callback) => recoveries.push(callback),
    });
    registry.subscribe(listener);
    const oldLease = registry.acquire({ viewInstanceId: "view-a", revision: 1 });
    expect(oldLease.commit(PNW_TARGETS)).toBe(true);
    oldLease.release();

    const replacement = registry.acquire({ viewInstanceId: "view-a", revision: 1 });
    expect(replacement.commit(PNW_TARGETS)).toBe(true);
    recoveries.shift()?.();
    expect(listener).not.toHaveBeenCalled();
    expect(registry.snapshot()[0]?.leaseCount).toBe(1);
  });

  it("陈旧 generation release 不影响新 Dialog，owner 关闭后才 dispose", () => {
    const recoveries: Array<() => void> = [];
    const listener = vi.fn();
    const registry = pnwCreateViewPresentationLeaseRegistry({
      scheduleRecovery: (callback) => recoveries.push(callback),
    });
    registry.subscribe(listener);
    const stale = registry.acquire({ viewInstanceId: "view-a", revision: 1 });
    const current = registry.acquire({ viewInstanceId: "view-a", revision: 2 });
    expect(current.commit({ ...PNW_TARGETS, revision: 2 })).toBe(true);
    stale.release();
    expect(registry.snapshot()[0]).toMatchObject({ revision: 2, leaseCount: 1 });

    registry.reconcileOwners([]);
    current.release();
    recoveries.shift()?.();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ recovery: "dispose" }));
  });

  it("reconcileOwners 保留仍存在的 owner 身份", () => {
    const registry = pnwCreateViewPresentationLeaseRegistry();
    const lease = registry.acquire({ viewInstanceId: "view-a", revision: 1 });
    registry.reconcileOwners([pnwCreateViewPresentationRecord({
      rendererId: "fixture",
      viewInstanceId: "view-a",
      ownerTabId: "tab-a",
      instanceKey: "fixture-a",
    })]);
    expect(registry.snapshot()[0]?.ownerAlive).toBe(true);
    lease.release();
  });
});
