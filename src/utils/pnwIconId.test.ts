import { describe, expect, expectTypeOf, it } from "vitest";
import type { PnwIconId } from "../types/PnwIcon.js";
import {
  pnwBuiltinIconId,
  pnwCreateIconId,
  pnwIsIconId,
} from "./pnwIconId.js";

describe("Pnw 规范持久化图标 ID", () => {
  it("要求 Wing 与 Host 图标都带显式 namespace", () => {
    expect(pnwBuiltinIconId("dashboard")).toBe("pnw:dashboard");
    expect(pnwCreateIconId("cool", "folder")).toBe("cool:folder");
    expect(pnwIsIconId("pnw:dashboard")).toBe(true);
    expect(pnwIsIconId("cool:folder")).toBe(true);
    expect(pnwIsIconId("cool:home")).toBe(true);
    expect(pnwIsIconId("pnw:home")).toBe(true);
    expect(pnwIsIconId("home")).toBe(false);
    expect(pnwIsIconId("dashboard")).toBe(false);
    expect(pnwIsIconId("pnw:missing")).toBe(false);
    expectTypeOf(pnwCreateIconId("app", "report")).toMatchTypeOf<PnwIconId>();
  });

  it("拒绝会造成持久化歧义或无法解析的 ID", () => {
    expect(() => pnwCreateIconId("Cool UI", "folder")).toThrow("Invalid Pnw icon ID");
    expect(() => pnwCreateIconId("pnw", "folder-opened")).toThrow("Invalid Pnw icon ID");
    expect(pnwIsIconId("cool:")).toBe(false);
    expect(pnwIsIconId("cool:folder:open")).toBe(false);
  });
});
