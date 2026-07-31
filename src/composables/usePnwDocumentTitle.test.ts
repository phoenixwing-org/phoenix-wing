import { computed, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePnwDocumentTitle } from "./usePnwDocumentTitle.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePnwDocumentTitle", () => {
  it("接受 consumer 的只读 computed，并在依赖变化后同步标题", async () => {
    vi.stubGlobal("document", { title: "" });
    const workspacePath = ref("/workspaces/phoenix");
    const page = ref("参数代码");

    usePnwDocumentTitle({
      workspaceShort: computed(() => workspacePath.value.split("/").at(-1) ?? ""),
      workspacePath: computed(() => workspacePath.value),
      pageLabel: computed(() => page.value || undefined),
      appTitle: "Desk Tools",
    });

    expect(document.title).toBe("Desk Tools - phoenix · 参数代码");

    workspacePath.value = "";
    page.value = "欢迎";
    await nextTick();
    expect(document.title).toBe("Desk Tools");
  });

  it("也接受普通 getter，避免 consumer 创建无意义的中间 Ref", () => {
    vi.stubGlobal("document", { title: "" });

    usePnwDocumentTitle({
      workspaceShort: () => "Phoenix",
      workspacePath: () => "/workspaces/Phoenix",
      pageLabel: () => "模型目录",
    });

    expect(document.title).toBe("Phoenix - Phoenix · 模型目录");
  });
});
