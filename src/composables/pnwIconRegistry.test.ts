import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import {
  pnwRegisterIconNamespace,
  pnwResolveIcon,
} from "./pnwIconRegistry.js";

describe("Pnw 图标命名空间注册与解析", () => {
  it.each([
    "dashboard",
    "list",
    "document",
    "history",
    "report",
    "folder",
  ] as const)("解析已由真实 manifest 采用的 pnw:%s 语义 ID", (name) => {
    expect(pnwResolveIcon(`pnw:${name}`)).toEqual({
      kind: "pnw",
      name,
      requestedId: `pnw:${name}`,
      fallback: false,
    });
  });

  it("解析 Wing 语义 ID、Host 白名单和旧组件/文本", () => {
    const PnwHostIcon = defineComponent({
      name: "PnwHostIcon",
      render: () => h("svg", { "data-host-icon": "folder" }),
    });
    const unregister = pnwRegisterIconNamespace("cool", {
      folder: PnwHostIcon,
      home: PnwHostIcon,
      doc: "document",
    });

    try {
      expect(pnwResolveIcon("pnw:dashboard")).toMatchObject({
        kind: "pnw",
        name: "dashboard",
        requestedId: "pnw:dashboard",
        fallback: false,
      });
      expect(pnwResolveIcon("dashboard")).toMatchObject({
        kind: "pnw",
        name: "dashboard",
        fallback: false,
      });
      expect(pnwResolveIcon("home")).toMatchObject({
        kind: "pnw",
        name: "home",
        requestedId: "home",
        fallback: false,
      });
      expect(pnwResolveIcon("cool:home")).toMatchObject({
        kind: "component",
        component: PnwHostIcon,
        requestedId: "cool:home",
      });
      expect(pnwResolveIcon("cool:folder")).toMatchObject({
        kind: "component",
        component: PnwHostIcon,
        requestedId: "cool:folder",
      });
      expect(pnwResolveIcon("cool:doc")).toMatchObject({
        kind: "pnw",
        name: "document",
        requestedId: "cool:doc",
        fallback: false,
      });
      expect(pnwResolveIcon(PnwHostIcon)).toMatchObject({
        kind: "component",
        component: PnwHostIcon,
      });
      expect(pnwResolveIcon("◆")).toEqual({
        kind: "text",
        text: "◆",
        fallback: false,
      });
      expect(pnwResolveIcon(7)).toEqual({
        kind: "text",
        text: "7",
        fallback: false,
      });
    } finally {
      unregister();
    }
  });

  it("把无效或未知 ID 归一为可见 fallback，不返回空组件", () => {
    expect(pnwResolveIcon("folder-opened")).toEqual({
      kind: "pnw",
      name: "unknown",
      requestedId: "folder-opened",
      fallback: true,
    });
    expect(pnwResolveIcon("cool:missing", "document")).toEqual({
      kind: "pnw",
      name: "document",
      requestedId: "cool:missing",
      fallback: true,
    });
    expect(pnwResolveIcon("pnw:missing")).toEqual({
      kind: "pnw",
      name: "unknown",
      requestedId: "pnw:missing",
      fallback: true,
    });
    expect(pnwResolveIcon(undefined)).toEqual({
      kind: "pnw",
      name: "unknown",
      requestedId: undefined,
      fallback: true,
    });
  });

  it("拒绝保留/非法命名空间和非白名单别名", () => {
    expect(() => pnwRegisterIconNamespace("pnw", { folder: "folder" }))
      .toThrow("reserved");
    expect(() => pnwRegisterIconNamespace("Cool UI", { folder: "folder" }))
      .toThrow("Invalid Pnw icon namespace");
    expect(() => pnwRegisterIconNamespace("cool", { "bad/name": "folder" }))
      .toThrow("Invalid Pnw icon local name");
    expect(() => pnwRegisterIconNamespace("cool", { folder: "folder-opened" as "folder" }))
      .toThrow("Invalid Pnw icon alias");
  });
});
