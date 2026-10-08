import { describe, expect, it, vi } from "vitest";
import type {
  PnwRecentWorkspaceEntry,
  PnwWorkspaceDescriptor,
  PnwWorkspaceLifecycleParticipant,
  PnwWorkspaceTransitionContext,
} from "../types/PnwWorkspace.js";
import {
  PnwWorkspaceError,
  pnwCreateWorkspaceController,
  pnwCreateWorkspaceResourceRef,
  pnwNormalizeRecentWorkspaces,
  pnwNormalizeWorkspaceDescriptor,
  pnwNormalizeWorkspaceRelativePath,
} from "./pnwWorkspace.js";

const PNW_WORKSPACE_A: PnwWorkspaceDescriptor = {
  workspaceId: "workspace-a",
  workspaceTypeId: "code",
  name: "Project A",
  rootPath: "/workspaces/project-a",
  readonly: false,
  capabilities: ["read", "write", "watch"],
};

const PNW_WORKSPACE_B: PnwWorkspaceDescriptor = {
  workspaceId: "workspace-b",
  name: "Project B",
  rootPath: "/workspaces/project-b",
  readonly: false,
  capabilities: ["read", "write"],
};

function pnwDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("Pnw Workspace contract", () => {
  it("normalizes descriptors, recent MRU, and workspace-relative resources", () => {
    expect(pnwNormalizeWorkspaceDescriptor({
      ...PNW_WORKSPACE_A,
      workspaceId: " workspace-a ",
      workspaceTypeId: " CODE ",
      name: " Project A ",
      capabilities: ["read", "write", "watch", "read"],
    })).toEqual({ ...PNW_WORKSPACE_A, rootUri: undefined });

    const recent: PnwRecentWorkspaceEntry[] = [
      { ...PNW_WORKSPACE_A, availability: "available" },
      { ...PNW_WORKSPACE_A, name: "duplicate", availability: "unknown" },
      { ...PNW_WORKSPACE_B, availability: "missing" },
    ];
    expect(pnwNormalizeRecentWorkspaces(recent, 2).map((item) => item.workspaceId))
      .toEqual(["workspace-a", "workspace-b"]);
    expect(pnwNormalizeRecentWorkspaces(recent, 2)[0]?.workspaceTypeId).toBe("code");
    expect(pnwNormalizeWorkspaceRelativePath(" ./reports\\summary.json "))
      .toBe("reports/summary.json");
    expect(pnwCreateWorkspaceResourceRef(PNW_WORKSPACE_A, "data/input.txt"))
      .toMatchObject({ workspace: PNW_WORKSPACE_A, relativePath: "data/input.txt" });
  });

  it.each(["../outside.txt", "/tmp/outside.txt", "C:\\outside.txt", "."])(
    "rejects unsafe resource path %s before a Host call",
    (value) => {
      expect(() => pnwNormalizeWorkspaceRelativePath(value)).toThrow(PnwWorkspaceError);
    },
  );

  it("opens, remembers, switches, and closes through one controlled controller", async () => {
    const events: string[] = [];
    const saved: PnwRecentWorkspaceEntry[][] = [];
    const participant: PnwWorkspaceLifecycleParticipant = {
      id: "session",
      async prepare(context) { events.push(`prepare:${context.kind}`); },
      async commit(context) { events.push(`commit:${context.kind}:${context.target?.workspaceId ?? "closed"}`); },
      async rollback(context) { events.push(`rollback:${context.kind}`); },
    };
    const close = vi.fn(async () => undefined);
    const controller = pnwCreateWorkspaceController({
      host: {
        async open(request) {
          return request.rootPath.endsWith("project-b") ? PNW_WORKSPACE_B : PNW_WORKSPACE_A;
        },
        close,
      },
      participants: [participant],
      recentStore: {
        async load() { return []; },
        async save(entries) { saved.push([...entries]); },
      },
      now: () => new Date("2026-08-16T00:00:00.000Z"),
    });

    await controller.initialize();
    expect(await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath }))
      .toMatchObject({ status: "opened", workspace: PNW_WORKSPACE_A });
    expect(controller.getSnapshot()).toMatchObject({
      current: PNW_WORKSPACE_A,
      phase: "open",
      recent: [{
        workspaceId: "workspace-a",
        workspaceTypeId: "code",
        lastOpenedAt: "2026-08-16T00:00:00.000Z",
      }],
    });

    expect(await controller.requestSwitch({
      rootPath: PNW_WORKSPACE_B.rootPath,
      expectedWorkspaceId: "workspace-b",
    })).toMatchObject({ status: "switched", workspace: PNW_WORKSPACE_B, previous: PNW_WORKSPACE_A });
    expect(close).toHaveBeenCalledWith(PNW_WORKSPACE_A, expect.any(AbortSignal));
    expect(controller.getSnapshot().recent.map((item) => item.workspaceId))
      .toEqual(["workspace-b", "workspace-a"]);

    expect(await controller.requestClose()).toMatchObject({ status: "closed", previous: PNW_WORKSPACE_B });
    expect(controller.getSnapshot()).toMatchObject({ phase: "closed", current: undefined });
    expect(events).toEqual([
      "prepare:open", "commit:open:workspace-a",
      "prepare:switch", "commit:switch:workspace-b",
      "prepare:close", "commit:close:closed",
    ]);
    expect(saved).toHaveLength(2);
  });

  it("keeps the current Workspace and rolls participants back when target open fails", async () => {
    const events: string[] = [];
    const controller = pnwCreateWorkspaceController({
      host: {
        async open(request) {
          if (request.rootPath.endsWith("broken")) throw new Error("not readable");
          return PNW_WORKSPACE_A;
        },
      },
      participants: [{
        id: "resources",
        async prepare(context) { events.push(`prepare:${context.kind}`); },
        async commit(context) { events.push(`commit:${context.kind}`); },
        async rollback(context) { events.push(`rollback:${context.kind}`); },
      }],
    });
    expect((await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath })).status).toBe("opened");
    events.length = 0;

    expect(await controller.requestSwitch({ rootPath: "/workspaces/broken" })).toMatchObject({
      status: "rejected",
      workspace: PNW_WORKSPACE_A,
      error: { code: "host-failure", message: "not readable" },
    });
    expect(controller.getSnapshot()).toMatchObject({ current: PNW_WORKSPACE_A, phase: "open" });
    expect(events).toEqual(["prepare:switch", "rollback:switch"]);
  });

  it("collapses queued transitions to the latest request and rejects stale callbacks", async () => {
    const firstStarted = pnwDeferred<void>();
    const firstResult = pnwDeferred<PnwWorkspaceDescriptor>();
    const closed: string[] = [];
    const controller = pnwCreateWorkspaceController({
      host: {
        async open(request) {
          if (request.rootPath.endsWith("project-a")) {
            firstStarted.resolve();
            return firstResult.promise;
          }
          return PNW_WORKSPACE_B;
        },
        async close(workspace) { closed.push(workspace.workspaceId); },
      },
    });

    const first = controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath });
    await firstStarted.promise;
    const second = controller.requestOpen({ rootPath: PNW_WORKSPACE_B.rootPath });
    firstResult.resolve(PNW_WORKSPACE_A);

    expect((await first).status).toBe("superseded");
    expect(await second).toMatchObject({ status: "opened", workspace: PNW_WORKSPACE_B });
    expect(controller.getSnapshot().current).toEqual(PNW_WORKSPACE_B);
    expect(closed).toContain("workspace-a");
  });

  it("reports an aborted stale Host request as superseded rather than a Host failure", async () => {
    const firstStarted = pnwDeferred<void>();
    const controller = pnwCreateWorkspaceController({
      host: {
        async open(request) {
          if (request.rootPath.endsWith("project-a")) {
            firstStarted.resolve();
            return new Promise<PnwWorkspaceDescriptor>((_resolve, reject) => {
              request.signal?.addEventListener("abort", () => reject(new Error("aborted by Host")), {
                once: true,
              });
            });
          }
          return PNW_WORKSPACE_B;
        },
      },
    });

    const first = controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath });
    await firstStarted.promise;
    const second = controller.requestOpen({ rootPath: PNW_WORKSPACE_B.rootPath });
    expect((await first).status).toBe("superseded");
    expect((await second).status).toBe("opened");
  });

  it("honors a participant rejection without opening the target", async () => {
    const open = vi.fn(async () => PNW_WORKSPACE_A);
    const rollback = vi.fn(async () => undefined);
    const controller = pnwCreateWorkspaceController({
      host: { open },
      participants: [{
        id: "dirty-view",
        async prepare() { return { allowed: false, reason: "unsaved changes" }; },
        rollback,
      }],
    });

    expect(await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath })).toMatchObject({
      status: "rejected",
      error: { code: "participant-rejected", participantId: "dirty-view" },
    });
    expect(open).not.toHaveBeenCalled();
    expect(rollback).toHaveBeenCalledOnce();
  });

  it("keeps transitions isolated from a failing state subscriber", async () => {
    const failures: string[] = [];
    const controller = pnwCreateWorkspaceController({
      host: { async open() { return PNW_WORKSPACE_A; } },
      onError(failure) { failures.push(failure.code); },
    });
    controller.subscribe(() => { throw new Error("consumer render failed"); });

    await expect(controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath }))
      .resolves.toMatchObject({ status: "opened" });
    expect(controller.getSnapshot().current).toEqual(PNW_WORKSPACE_A);
    expect(failures.length).toBeGreaterThanOrEqual(3);
    expect(failures.every((code) => code === "subscriber-failure")).toBe(true);
  });

  it("treats repeated close as an idempotent no-op", async () => {
    const controller = pnwCreateWorkspaceController({
      host: { async open() { return PNW_WORKSPACE_A; } },
    });
    await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath });
    expect((await controller.requestClose()).status).toBe("closed");
    expect((await controller.requestClose()).status).toBe("unchanged");
  });
});


describe("Pnw Workspace cancellation boundaries", () => {
  it.each(["prepare", "commit"] as const)("checks cancellation after the final %s and rolls back with a fresh signal", async (boundary) => {
    const abort = new AbortController();
    const close = vi.fn(async () => undefined);
    const rollback = vi.fn(async (context: PnwWorkspaceTransitionContext) => { expect(context.signal.aborted).toBe(false); });
    const controller = pnwCreateWorkspaceController({
      host: { open: async () => PNW_WORKSPACE_A, close },
      participants: [{ id: "session", [boundary]: async () => { abort.abort(); }, rollback }],
    });
    expect((await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath, signal: abort.signal })).status).toBe("cancelled");
    expect(rollback).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().current).toBeUndefined();
    expect(close).toHaveBeenCalledTimes(boundary === "commit" ? 1 : 0);
  });

  it("includes a partially prepared participant in reverse rollback and exposes rollback failure despite cancellation", async () => {
    const abort = new AbortController();
    const events: string[] = [];
    const controller = pnwCreateWorkspaceController({
      host: { open: async () => PNW_WORKSPACE_A },
      participants: [
        { id: "first", rollback: async () => { events.push("first"); } },
        { id: "partial", prepare: async () => { abort.abort(); throw new Error("partial prepare"); },
          rollback: async (context) => { expect(context.signal.aborted).toBe(false); events.push("partial"); throw new Error("restore failed"); } },
      ],
    });
    expect(await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath, signal: abort.signal }))
      .toMatchObject({ status: "rejected", error: { message: "restore failed", participantId: "partial" } });
    expect(events).toEqual(["partial", "first"]);
  });

  it.each(["switch", "close"] as const)("waits for injected fresh recovery before a superseding request during %s", async (kind) => {
    const entered = pnwDeferred<void>();
    const release = pnwDeferred<void>();
    const recovering = pnwDeferred<void>();
    const restored = pnwDeferred<void>();
    const live = new Set<string>();
    const events: string[] = [];
    let block = true;
    const controller = pnwCreateWorkspaceController({
      host: {
        open: async (request) => {
          const workspace = request.rootPath === PNW_WORKSPACE_A.rootPath ? PNW_WORKSPACE_A : PNW_WORKSPACE_B;
          events.push("open:" + workspace.workspaceId);
          live.add(workspace.workspaceId);
          return workspace;
        },
        close: async (workspace, signal) => {
          expect(signal).toBeInstanceOf(AbortSignal);
          live.delete(workspace.workspaceId);
          if (workspace.workspaceId === PNW_WORKSPACE_A.workspaceId && block) {
            block = false; entered.resolve(); await release.promise;
          }
        },
        recover: async (context) => {
          expect(context.signal.aborted).toBe(false);
          recovering.resolve(); await restored.promise;
          live.add(context.current!.workspaceId);
          events.push("restored");
        },
      },
    });
    await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath });
    const pending = kind === "close" ? controller.requestClose() : controller.requestSwitch({ rootPath: PNW_WORKSPACE_B.rootPath });
    await entered.promise;
    const next = controller.requestSwitch({ rootPath: PNW_WORKSPACE_B.rootPath });
    release.resolve(); await recovering.promise;
    const count = events.length;
    await Promise.resolve(); expect(events).toHaveLength(count);
    restored.resolve();
    expect((await pending).status).toBe("superseded");
    expect((await next).status).toBe("switched");
    expect(events.lastIndexOf("restored")).toBeLessThan(events.lastIndexOf("open:workspace-b"));
    expect([...live]).toEqual([PNW_WORKSPACE_B.workspaceId]);
  });

  it.each(["recover", "cleanup"] as const)("does not hide %s failures after cancellation", async (boundary) => {
    const abort = new AbortController();
    const controller = pnwCreateWorkspaceController({ host: {
      open: async (request) => request.rootPath === PNW_WORKSPACE_A.rootPath ? PNW_WORKSPACE_A : PNW_WORKSPACE_B,
      close: async (workspace) => {
        if (workspace.workspaceId === PNW_WORKSPACE_A.workspaceId) { abort.abort(); }
        else if (boundary === "cleanup") { throw new Error("cleanup failed"); }
      },
      recover: async (context) => {
        expect(context.signal.aborted).toBe(false);
        if (boundary === "recover") throw new Error("recover failed");
      },
    } });
    await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath });
    expect(await controller.requestSwitch({ rootPath: PNW_WORKSPACE_B.rootPath, signal: abort.signal }))
      .toMatchObject({ status: "rejected", error: { message: boundary + " failed" } });
    expect(controller.getSnapshot().current?.workspaceId).toBe(boundary === "recover" ? undefined : PNW_WORKSPACE_A.workspaceId);
  });
});


describe("Pnw Workspace Host recovery contract", () => {
  it.each([true, false])("rejects a partially closed Host with recover=%s", async (hasRecovery) => {
    let live = false;
    const recover = vi.fn(async (context: PnwWorkspaceTransitionContext) => {
      expect(context.signal.aborted).toBe(false);
      live = true;
    });
    const controller = pnwCreateWorkspaceController({ host: {
      open: async () => { live = true; return PNW_WORKSPACE_A; },
      close: async () => { live = false; throw new Error("partial close"); },
      recover: hasRecovery ? recover : undefined,
    } });
    await controller.requestOpen({ rootPath: PNW_WORKSPACE_A.rootPath });
    expect((await controller.requestClose()).status).toBe("rejected");
    expect(live).toBe(hasRecovery);
    expect(controller.getSnapshot().current?.workspaceId).toBe(hasRecovery ? PNW_WORKSPACE_A.workspaceId : undefined);
  });
});
