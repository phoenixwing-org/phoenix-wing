import { describe, expect, it } from "vitest";
import type { PnwDockableToolDefinition } from "../types/PnwDockableTool.js";
import {
  PNW_DEFAULT_DOCKABLE_TOOL_STATE,
  pnwIsDockableToolVisible,
  pnwNormalizeDockableToolState,
  pnwReduceDockableToolState,
} from "./pnwDockableTool.js";

const PNW_APPLICATION_TOOL = {
  id: "diagnostics",
  title: "诊断工具",
  scope: "application",
} as const satisfies PnwDockableToolDefinition;

const PNW_VIEW_TOOL = {
  id: "inspection",
  title: "检查工具",
  scope: "view",
  ownerViewId: "bom.parts",
} as const satisfies PnwDockableToolDefinition;

describe("Pnw 可停靠工具状态机", () => {
  it("floating / primary / closed 互斥切换且保留坐标、位置与折叠状态", () => {
    let state = pnwNormalizeDockableToolState({
      mode: "floating",
      floatingPosition: { x: 108, y: 72 },
      primaryPlacement: "first",
      primaryExpanded: false,
    });
    state = pnwReduceDockableToolState(state, { type: "dock-primary" });
    expect(state).toEqual({
      mode: "primary",
      floatingPosition: { x: 108, y: 72 },
      floatingSize: { width: 640, height: 480 },
      primaryPlacement: "first",
      primaryExpanded: false,
    });
    state = pnwReduceDockableToolState(state, { type: "close" });
    state = pnwReduceDockableToolState(state, { type: "open-floating" });
    expect(state.mode).toBe("floating");
    expect(state.floatingPosition).toEqual({ x: 108, y: 72 });
    expect(state.primaryPlacement).toBe("first");
    expect(state.primaryExpanded).toBe(false);
  });

  it("分别更新受控坐标、Primary 首尾与展开状态", () => {
    let state = pnwReduceDockableToolState(PNW_DEFAULT_DOCKABLE_TOOL_STATE, {
      type: "set-floating-position",
      position: { x: 320, y: 96 },
    });
    state = pnwReduceDockableToolState(state, {
      type: "set-primary-placement",
      placement: "first",
    });
    state = pnwReduceDockableToolState(state, {
      type: "set-primary-expanded",
      expanded: false,
    });
    expect(state).toMatchObject({
      floatingPosition: { x: 320, y: 96 },
      primaryPlacement: "first",
      primaryExpanded: false,
    });
  });

  it("归一化持久化坏值并提供稳定默认值", () => {
    expect(pnwNormalizeDockableToolState({
      mode: "invalid" as never,
      floatingPosition: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
      primaryPlacement: "middle" as never,
    })).toEqual(PNW_DEFAULT_DOCKABLE_TOOL_STATE);
  });

  it("application 工具跨 View 可见", () => {
    const state = pnwReduceDockableToolState(PNW_DEFAULT_DOCKABLE_TOOL_STATE, {
      type: "open-floating",
    });
    expect(pnwIsDockableToolVisible(PNW_APPLICATION_TOOL, state, "dashboard")).toBe(true);
    expect(pnwIsDockableToolVisible(PNW_APPLICATION_TOOL, state, "bom.parts")).toBe(true);
  });

  it("view 工具离开 owner View 只暂时隐藏，返回后恢复原状态", () => {
    const state = pnwNormalizeDockableToolState({
      mode: "primary",
      floatingPosition: { x: 51, y: 73 },
      primaryPlacement: "first",
      primaryExpanded: false,
    });
    expect(pnwIsDockableToolVisible(PNW_VIEW_TOOL, state, "bom.parts")).toBe(true);
    expect(pnwIsDockableToolVisible(PNW_VIEW_TOOL, state, "dashboard")).toBe(false);
    expect(pnwIsDockableToolVisible(PNW_VIEW_TOOL, state, "bom.parts")).toBe(true);
    expect(state).toEqual({
      mode: "primary",
      floatingPosition: { x: 51, y: 73 },
      floatingSize: { width: 640, height: 480 },
      primaryPlacement: "first",
      primaryExpanded: false,
    });
  });

  it("closed 工具在任何作用域都不呈现", () => {
    expect(pnwIsDockableToolVisible(
      PNW_APPLICATION_TOOL,
      PNW_DEFAULT_DOCKABLE_TOOL_STATE,
      "dashboard",
    )).toBe(false);
    expect(pnwIsDockableToolVisible(
      PNW_VIEW_TOOL,
      PNW_DEFAULT_DOCKABLE_TOOL_STATE,
      "bom.parts",
    )).toBe(false);
  });
});
