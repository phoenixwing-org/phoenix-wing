import { describe, expect, it } from "vitest";
import {
  pnwClampFloatingPanelBounds,
  pnwClampFloatingPanelPosition,
  pnwNormalizeFloatingPanelInsets,
  pnwResizeFloatingPanelBounds,
} from "./pnwFloatingPanel.js";

describe("pnwClampFloatingPanelPosition", () => {
  const panel = { width: 400, height: 300 };
  const viewport = { width: 1000, height: 700 };

  it("保留已经完整可见的位置", () => {
    expect(pnwClampFloatingPanelPosition({ x: 120, y: 90 }, panel, viewport))
      .toEqual({ x: 120, y: 90 });
  });

  it("修正四边越界并保留 margin", () => {
    expect(pnwClampFloatingPanelPosition({ x: -40, y: -20 }, panel, viewport, 12))
      .toEqual({ x: 12, y: 12 });
    expect(pnwClampFloatingPanelPosition({ x: 900, y: 600 }, panel, viewport, 12))
      .toEqual({ x: 588, y: 388 });
  });

  it("面板大于视口时保留左上标题栏且处理非有限值", () => {
    expect(pnwClampFloatingPanelPosition(
      { x: Number.NaN, y: Number.POSITIVE_INFINITY },
      { width: 900, height: 800 },
      { width: 640, height: 480 },
    )).toEqual({ x: 8, y: 8 });
  });

  it("避让 Host Header 与 Dock 安全区域", () => {
    expect(pnwClampFloatingPanelPosition(
      { x: 2, y: 8 },
      panel,
      viewport,
      8,
      { top: 94, right: 12, bottom: 24, left: 16 },
    )).toEqual({ x: 24, y: 102 });

    expect(pnwClampFloatingPanelPosition(
      { x: 900, y: 600 },
      panel,
      viewport,
      8,
      { top: 94, right: 12, bottom: 24, left: 16 },
    )).toEqual({ x: 580, y: 368 });
  });

  it("安全区域缺省、负数与非有限值统一归一化", () => {
    expect(pnwNormalizeFloatingPanelInsets({
      top: Number.NaN,
      right: -12,
      bottom: Number.POSITIVE_INFINITY,
      left: 16,
    })).toEqual({ top: 0, right: 0, bottom: 0, left: 16 });
  });
});

describe("PnwFloatingPanel resize bounds", () => {
  const viewport = { width: 1000, height: 700 };
  const constraints = { minWidth: 360, minHeight: 240 };

  it("同时钳制受控尺寸与位置并避让安全区域", () => {
    expect(pnwClampFloatingPanelBounds(
      {
        position: { x: -20, y: 12 },
        size: { width: 1400, height: 900 },
      },
      viewport,
      constraints,
      8,
      { top: 40, right: 12, bottom: 20, left: 16 },
    )).toEqual({
      position: { x: 24, y: 48 },
      size: { width: 956, height: 624 },
    });
  });

  it("右下缩放保持左上位置并受 viewport 限制", () => {
    expect(pnwResizeFloatingPanelBounds(
      {
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
      },
      { x: 200, y: 200 },
      "south-east",
      viewport,
      constraints,
    )).toEqual({
      position: { x: 100, y: 100 },
      size: { width: 700, height: 592 },
    });
  });

  it("左上缩放同步更新位置并保持相反边不动", () => {
    expect(pnwResizeFloatingPanelBounds(
      {
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
      },
      { x: 100, y: 80 },
      "north-west",
      viewport,
      constraints,
    )).toEqual({
      position: { x: 200, y: 180 },
      size: { width: 400, height: 320 },
    });
  });

  it("缩小不能越过最小尺寸", () => {
    expect(pnwResizeFloatingPanelBounds(
      {
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
      },
      { x: 1000, y: 1000 },
      "north-west",
      viewport,
      constraints,
    )).toEqual({
      position: { x: 240, y: 260 },
      size: { width: 360, height: 240 },
    });
  });
});
