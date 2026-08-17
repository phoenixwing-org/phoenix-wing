import { describe, expect, it } from "vitest";
import {
  pnwCreatePresentationBoundsSnapshot,
  pnwResolvePresentationFrameDefinition,
} from "./pnwPresentationFrame.js";

describe("Pnw presentation frame 声明", () => {
  it("View 与 Tool 使用同一能力结构但保持不同关闭语义", () => {
    expect(pnwResolvePresentationFrameDefinition(undefined, "view")).toMatchObject({
      ownerKind: "view",
      movable: true,
      resizable: "both",
      recommendedSize: { width: 760, height: 560 },
      rememberBounds: true,
      closeBehavior: "reattach",
    });
    expect(pnwResolvePresentationFrameDefinition(undefined, "tool")).toMatchObject({
      ownerKind: "tool",
      recommendedSize: { width: 640, height: 480 },
      closeBehavior: "close",
    });
  });

  it("解析显式移动、轴向 resize 与尺寸边界", () => {
    expect(pnwResolvePresentationFrameDefinition({
      ownerKind: "tool",
      movable: false,
      resizable: "horizontal",
      recommendedSize: { width: 720, height: 420 },
      minSize: { width: 400, height: 260 },
      maxSize: { width: 1000, height: 760 },
      rememberBounds: false,
      closeBehavior: "close",
    }, "tool")).toEqual({
      ownerKind: "tool",
      movable: false,
      resizable: "horizontal",
      recommendedSize: { width: 720, height: 420 },
      minSize: { width: 400, height: 260 },
      maxSize: { width: 1000, height: 760 },
      rememberBounds: false,
      closeBehavior: "close",
    });
  });

  it("拒绝把 Tool/View 的 owner 与关闭生命周期混用", () => {
    expect(() => pnwResolvePresentationFrameDefinition({
      ownerKind: "tool",
    }, "view")).toThrow("ownerKind");
    expect(() => pnwResolvePresentationFrameDefinition({
      ownerKind: "view",
      closeBehavior: "close",
    }, "view")).toThrow("closeBehavior");
  });

  it("仅在 rememberBounds 开启时生成无运行时对象的持久化快照", () => {
    const bounds = {
      position: { x: 32, y: 48 },
      size: { width: 720, height: 520 },
    };
    expect(pnwCreatePresentationBoundsSnapshot(bounds, {
      ownerKind: "tool",
      rememberBounds: true,
    }, "tool")).toEqual(bounds);
    expect(pnwCreatePresentationBoundsSnapshot(bounds, {
      ownerKind: "view",
      rememberBounds: false,
    }, "view")).toBeUndefined();
  });
});
