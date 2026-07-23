import { describe, expect, it, vi } from "vitest";
import { pnwCanCloseEditorDrawer } from "./pnwEditorDrawer.js";

describe("pnwCanCloseEditorDrawer", () => {
  it("allows clean editors without invoking the guard", async () => {
    const guard = vi.fn(() => false);

    await expect(
      pnwCanCloseEditorDrawer({ mode: "view", dirty: false }, guard),
    ).resolves.toBe(true);
    expect(guard).not.toHaveBeenCalled();
  });

  it("uses a synchronous guard for dirty editors", async () => {
    const context = {
      editorId: "function-detail",
      tabId: "function-list",
      resourceKey: 42,
      mode: "edit" as const,
      dirty: true,
    };
    const guard = vi.fn(() => false);

    await expect(pnwCanCloseEditorDrawer(context, guard)).resolves.toBe(false);
    expect(guard).toHaveBeenCalledWith(context);
  });

  it("awaits an asynchronous close decision", async () => {
    await expect(
      pnwCanCloseEditorDrawer(
        { mode: "create", dirty: true },
        async () => true,
      ),
    ).resolves.toBe(true);
  });
});
