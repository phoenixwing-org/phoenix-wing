import { describe, expect, it } from "vitest";
import { pnwCreateViewPresentationRecord } from "./pnwViewPresentation.js";
import {
  pnwArrangeFloatingViewBounds,
  pnwArrangeViewPresentationRecords,
  type PnwFloatingViewArrangementItem,
} from "./pnwFloatingViewArrangement.js";

const PNW_TEST_AREA = {
  position: { x: 100, y: 80 },
  size: { width: 1200, height: 800 },
} as const;

function pnwExpectInsideArea(item: PnwFloatingViewArrangementItem): void {
  expect(item.bounds.position.x).toBeGreaterThanOrEqual(PNW_TEST_AREA.position.x);
  expect(item.bounds.position.y).toBeGreaterThanOrEqual(PNW_TEST_AREA.position.y);
  expect(item.bounds.position.x + item.bounds.size.width)
    .toBeLessThanOrEqual(PNW_TEST_AREA.position.x + PNW_TEST_AREA.size.width);
  expect(item.bounds.position.y + item.bounds.size.height)
    .toBeLessThanOrEqual(PNW_TEST_AREA.position.y + PNW_TEST_AREA.size.height);
}

function pnwOverlaps(
  left: PnwFloatingViewArrangementItem,
  right: PnwFloatingViewArrangementItem,
): boolean {
  return left.bounds.position.x < right.bounds.position.x + right.bounds.size.width
    && left.bounds.position.x + left.bounds.size.width > right.bounds.position.x
    && left.bounds.position.y < right.bounds.position.y + right.bounds.size.height
    && left.bounds.position.y + left.bounds.size.height > right.bounds.position.y;
}

describe("pnwArrangeFloatingViewBounds", () => {
  const targets = Array.from({ length: 5 }, (_, index) => ({
    id: `view-${index + 1}`,
    preferredSize: { width: 940, height: 640 },
    constraints: { minWidth: 320, minHeight: 260 },
  }));

  it("五窗平铺为上三下二，最后一行占满且互不重叠", () => {
    const arranged = pnwArrangeFloatingViewBounds({
      mode: "tile",
      area: PNW_TEST_AREA,
      targets,
      gap: 8,
    });

    expect(arranged.map((item) => item.id)).toEqual(targets.map((target) => target.id));
    expect(arranged.slice(0, 3).map((item) => item.bounds.position.y))
      .toEqual([arranged[0].bounds.position.y, arranged[0].bounds.position.y, arranged[0].bounds.position.y]);
    expect(arranged[3].bounds.position.y).toBeGreaterThan(arranged[0].bounds.position.y);
    expect(arranged[3].bounds.size.width).toBeGreaterThan(arranged[0].bounds.size.width);
    expect(arranged[3].bounds.position.x).toBe(108);
    expect(arranged[4].bounds.position.x + arranged[4].bounds.size.width).toBe(1292);
    for (const item of arranged) pnwExpectInsideArea(item);
    for (let left = 0; left < arranged.length; left += 1) {
      for (let right = left + 1; right < arranged.length; right += 1) {
        expect(pnwOverlaps(arranged[left], arranged[right])).toBe(false);
      }
    }
  });

  it("窄区域优先保持边界与不重叠，并报告低于最小尺寸", () => {
    const area = {
      position: { x: 0, y: 0 },
      size: { width: 280, height: 220 },
    };
    const arranged = pnwArrangeFloatingViewBounds({
      mode: "tile",
      area,
      targets,
      gap: 8,
    });

    expect(arranged).toHaveLength(5);
    expect(arranged.every((item) => item.compressedBelowMinimum)).toBe(true);
    expect(arranged.every((item) => item.effectiveMinSize.width <= item.bounds.size.width)).toBe(true);
    expect(arranged.every((item) => item.effectiveMinSize.height <= item.bounds.size.height)).toBe(true);
    for (let index = 1; index < arranged.length; index += 1) {
      expect(arranged[index].bounds.position.y).toBeGreaterThan(
        arranged[index - 1].bounds.position.y + arranged[index - 1].bounds.size.height,
      );
    }
    for (const item of arranged) {
      expect(item.bounds.position.x).toBeGreaterThanOrEqual(area.position.x);
      expect(item.bounds.position.y).toBeGreaterThanOrEqual(area.position.y);
      expect(item.bounds.position.x + item.bounds.size.width).toBeLessThanOrEqual(area.size.width);
      expect(item.bounds.position.y + item.bounds.size.height).toBeLessThanOrEqual(area.size.height);
    }
  });

  it("极小区域会收敛内部间距，仍不让平铺结果越界", () => {
    const area = {
      position: { x: 4, y: 6 },
      size: { width: 10, height: 10 },
    };
    const arranged = pnwArrangeFloatingViewBounds({
      mode: "tile",
      area,
      targets,
      gap: 8,
    });

    expect(arranged).toHaveLength(5);
    for (const item of arranged) {
      expect(item.bounds.position.x).toBeGreaterThanOrEqual(area.position.x);
      expect(item.bounds.position.y).toBeGreaterThanOrEqual(area.position.y);
      expect(item.bounds.position.x + item.bounds.size.width)
        .toBeLessThanOrEqual(area.position.x + area.size.width);
      expect(item.bounds.position.y + item.bounds.size.height)
        .toBeLessThanOrEqual(area.position.y + area.size.height);
    }
  });

  it("行数超过整像素高度时使用亚像素压缩且不越界", () => {
    const area = {
      position: { x: 0, y: 0 },
      size: { width: 10, height: 2 },
    };
    const arranged = pnwArrangeFloatingViewBounds({
      mode: "tile",
      area,
      targets: Array.from({ length: 3 }, (_, index) => ({
        id: `compressed-${index}`,
        constraints: { minWidth: 10, minHeight: 10 },
      })),
      gap: 8,
    });

    expect(arranged).toHaveLength(3);
    expect(arranged.every((item) => item.compressedBelowMinimum)).toBe(true);
    expect(arranged.every((item) => item.bounds.size.height < 1)).toBe(true);
    for (const item of arranged) {
      expect(item.bounds.position.y).toBeGreaterThanOrEqual(area.position.y);
      expect(item.bounds.position.y + item.bounds.size.height)
        .toBeLessThanOrEqual(area.position.y + area.size.height);
    }
  });

  it("按输入顺序层叠并把全部窗口限制在可用区域", () => {
    const arranged = pnwArrangeFloatingViewBounds({
      mode: "cascade",
      area: PNW_TEST_AREA,
      targets,
      gap: 8,
      cascadeOffset: 32,
    });

    expect(arranged.map((item) => item.order)).toEqual([0, 1, 2, 3, 4]);
    expect(arranged.map((item) => item.bounds.position)).toEqual([
      { x: 108, y: 88 },
      { x: 140, y: 120 },
      { x: 172, y: 152 },
      { x: 204, y: 184 },
      { x: 236, y: 216 },
    ]);
    expect(arranged[0].bounds.size).toEqual({ width: 940, height: 640 });
    for (const item of arranged) pnwExpectInsideArea(item);
  });

  it("拒绝重复目标，确保确定顺序不会被覆盖", () => {
    expect(() => pnwArrangeFloatingViewBounds({
      mode: "tile",
      area: PNW_TEST_AREA,
      targets: [{ id: "same" }, { id: "same" }],
    })).toThrow("duplicate floating View arrangement id");
  });
});

describe("pnwArrangeViewPresentationRecords", () => {
  it("只更新既有 record 的 bounds，重复排列保持 identity、revision 与实例记录", () => {
    const frame = {
      ownerKind: "view" as const,
      recommendedSize: { width: 940, height: 640 },
      minSize: { width: 320, height: 260 },
      rememberBounds: true,
      closeBehavior: "reattach" as const,
    };
    const records = ["alpha", "beta", "gamma"].map((id, index) => (
      pnwCreateViewPresentationRecord(
        {
          rendererId: "fixture",
          viewInstanceId: id,
          ownerTabId: id,
          instanceKey: "default",
        },
        {
          mode: "floating",
          frame,
          dialogPosition: { x: 20 + index * 10, y: 30 + index * 10 },
        },
      )
    ));
    const first = pnwArrangeViewPresentationRecords({
      mode: "tile",
      area: PNW_TEST_AREA,
      targets: records.map((record) => ({ record, frame })),
    });
    const second = pnwArrangeViewPresentationRecords({
      mode: "tile",
      area: PNW_TEST_AREA,
      targets: first.map(({ record, frame: effectiveFrame }) => ({
        record,
        frame: effectiveFrame,
      })),
    });

    expect(first.map((item) => item.viewInstanceId)).toEqual(["alpha", "beta", "gamma"]);
    first.forEach((item, index) => {
      expect(item.record.identity).toBe(records[index].identity);
      expect(item.record.mode).toBe("floating");
      expect(item.record.revision).toBe(records[index].revision);
      expect(item.record.dialogPosition).toEqual(item.bounds.position);
      expect(item.record.dialogSize).toEqual(item.bounds.size);
      expect(second[index].record).toBe(item.record);
    });
  });
});
