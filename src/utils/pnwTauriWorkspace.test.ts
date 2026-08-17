import { describe, expect, it, vi } from "vitest";
import type { PnwWorkspaceDescriptor } from "../types/PnwWorkspace.js";
import { PnwWorkspaceError } from "./pnwWorkspace.js";
import {
  pnwCreateTauriWorkspaceAdapter,
  type PnwTauriWorkspaceInvoke,
} from "./pnwTauriWorkspace.js";

const PNW_WRITABLE_WORKSPACE: PnwWorkspaceDescriptor = {
  workspaceId: "workspace-demo",
  name: "Engineering Demo",
  rootPath: "/workspaces/engineering-demo",
  readonly: false,
  capabilities: ["read", "write", "native-directory-picker"],
};

describe("Pnw Tauri Workspace adapter", () => {
  it("uses injected Tauri transport without importing Tauri into Wing", async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const invoke: PnwTauriWorkspaceInvoke = async <T>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      calls.push({ command, args });
      if (command === "pnw_workspace_open") return PNW_WRITABLE_WORKSPACE as T;
      if (command === "pnw_workspace_read_resource") {
        return { relativePath: "data/input.dat", data: [1, 2, 3], mediaType: "application/octet-stream" } as T;
      }
      if (command === "pnw_workspace_pick_save_target") return "reports/result.json" as T;
      return undefined as T;
    };
    const adapter = pnwCreateTauriWorkspaceAdapter({
      invoke,
      async pickDirectory() { return "/workspaces/engineering-demo"; },
    });

    expect(await adapter.host.pickDirectory?.({})).toEqual({
      status: "selected",
      rootPath: "/workspaces/engineering-demo",
    });
    expect(await adapter.host.open({ rootPath: "/workspaces/engineering-demo" }))
      .toEqual(PNW_WRITABLE_WORKSPACE);
    expect(await adapter.resources.read({
      workspace: PNW_WRITABLE_WORKSPACE,
      relativePath: "data/input.dat",
      format: "bytes",
    })).toMatchObject({ relativePath: "data/input.dat", data: new Uint8Array([1, 2, 3]) });
    await adapter.resources.write({
      workspace: PNW_WRITABLE_WORKSPACE,
      relativePath: "reports/result.json",
      data: "{}",
      overwrite: true,
    });
    expect(await adapter.resources.pickSaveTarget?.({
      workspace: PNW_WRITABLE_WORKSPACE,
      suggestedRelativePath: "reports/result.json",
    })).toBe("reports/result.json");
    expect(calls.map((item) => item.command)).toEqual([
      "pnw_workspace_open",
      "pnw_workspace_read_resource",
      "pnw_workspace_write_resource",
      "pnw_workspace_pick_save_target",
    ]);
  });

  it("rejects unsafe and readonly writes before invoking the Host", async () => {
    const invokeSpy = vi.fn();
    const invoke: PnwTauriWorkspaceInvoke = async <T>(
      command: string,
      args?: Record<string, unknown>,
    ): Promise<T> => {
      invokeSpy(command, args);
      return undefined as T;
    };
    const adapter = pnwCreateTauriWorkspaceAdapter({ invoke, commands: { close: false, validate: false } });
    await expect(adapter.resources.write({
      workspace: PNW_WRITABLE_WORKSPACE,
      relativePath: "../outside.txt",
      data: "unsafe",
    })).rejects.toMatchObject({ code: "invalid-relative-path" });
    const readonly = { ...PNW_WRITABLE_WORKSPACE, readonly: true, capabilities: ["read"] as const };
    await expect(adapter.resources.write({
      workspace: readonly,
      relativePath: "inside.txt",
      data: "blocked",
    })).rejects.toMatchObject({ code: "readonly" });
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it("rejects an unsafe save target returned by a compromised transport", async () => {
    const adapter = pnwCreateTauriWorkspaceAdapter({
      async invoke<T>(command: string): Promise<T> {
        if (command === "pnw_workspace_pick_save_target") return "../outside.json" as T;
        return undefined as T;
      },
    });
    await expect(adapter.resources.pickSaveTarget?.({ workspace: PNW_WRITABLE_WORKSPACE }))
      .rejects.toBeInstanceOf(PnwWorkspaceError);
  });

  it("honors AbortSignal before invoking the injected transport", async () => {
    const invokeSpy = vi.fn();
    const invoke: PnwTauriWorkspaceInvoke = async <T>(): Promise<T> => {
      invokeSpy();
      return PNW_WRITABLE_WORKSPACE as T;
    };
    const adapter = pnwCreateTauriWorkspaceAdapter({ invoke });
    const controller = new AbortController();
    controller.abort();

    await expect(adapter.host.open({
      rootPath: "/workspaces/engineering-demo",
      signal: controller.signal,
    })).rejects.toMatchObject({ code: "cancelled" });
    expect(invokeSpy).not.toHaveBeenCalled();
  });
});
