// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import PnwWorkbenchDisplaySettings from "./PnwWorkbenchDisplaySettings.vue";

const PNW_APPEARANCE = {
  mode: "ribbon",
  compact: { iconSize: 24, showTitles: true, showGroupLabels: false },
  ribbon: { iconSize: 36, showTitles: true, showGroupLabels: true },
} as const;

let pnwWrapper: VueWrapper | undefined;

afterEach(() => {
  pnwWrapper?.unmount();
  pnwWrapper = undefined;
  document.body.innerHTML = "";
});

describe("PnwWorkbenchDisplaySettings viewport 安全区域", () => {
  it("受控旧坐标在打开时自动避让同一 Workbench Header", async () => {
    const pnwLayout = document.createElement("div");
    pnwLayout.className = "pnw-workbench-layout";
    const pnwHeader = document.createElement("header");
    pnwHeader.className = "pnw-workbench-header";
    pnwHeader.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      right: 1000,
      bottom: 94,
      left: 0,
      width: 1000,
      height: 94,
      toJSON: () => ({}),
    });
    const pnwMountPoint = document.createElement("div");
    pnwLayout.append(pnwHeader, pnwMountPoint);
    document.body.append(pnwLayout);

    pnwWrapper = mount(PnwWorkbenchDisplaySettings, {
      attachTo: pnwMountPoint,
      props: {
        presentation: "ribbon",
        appearance: PNW_APPEARANCE,
        treeAppearance: { expanded: "outline", collapsed: "leaf-rail" },
        colorScheme: "dark",
        triggerVariant: "ribbon",
        positions: {
          quick: { x: 16, y: 72 },
          full: { x: 8, y: 8 },
        },
      },
    });

    await pnwWrapper.get(".pnw-workbench-display-trigger").trigger("click");
    await nextTick();
    await nextTick();

    const pnwUpdates = pnwWrapper.emitted("update:positions") ?? [];
    expect(pnwUpdates.some(([positions]) => (
      (positions as { quick: { y: number } }).quick.y === 102
    ))).toBe(true);
    const pnwPanel = document.querySelector<HTMLElement>(".pnw-workbench-display-panel");
    expect(pnwPanel?.style.getPropertyValue("--pnw-floating-panel-available-height"))
      .toContain("110px");
  });
});
