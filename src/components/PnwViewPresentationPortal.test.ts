// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import {
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from "vue";
import type { PnwViewPresentationRecord } from "../types/PnwViewPresentation.js";
import {
  pnwCreateViewPresentationRecord,
  pnwReduceViewPresentationRecord,
} from "../utils/pnwViewPresentation.js";
import { pnwCreateViewPresentationLeaseRegistry } from "../utils/pnwViewPresentationLease.js";
import PnwViewPresentationPortal from "./PnwViewPresentationPortal.vue";

const PNW_IDENTITY = {
  rendererId: "fixture.renderer",
  viewInstanceId: "fixture.view:1",
  ownerTabId: "fixture.tab:1",
  instanceKey: "fixture-view-1",
} as const;

async function pnwFlushPresentation(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PnwViewPresentationPortal", () => {
  it("目标 ready 后原子迁移 Header/Main，收回不重建并保留输入状态", async () => {
    const lifecycle = {
      headerMounted: 0,
      headerUnmounted: 0,
      mainMounted: 0,
      mainUnmounted: 0,
    };
    const HeaderFrame = defineComponent({
      setup() {
        onMounted(() => { lifecycle.headerMounted += 1; });
        onBeforeUnmount(() => { lifecycle.headerUnmounted += 1; });
        return () => h("div", { class: "fixture-header-frame" }, "Fixture Header");
      },
    });
    const MainFrame = defineComponent({
      setup() {
        const contour = ref("7");
        onMounted(() => { lifecycle.mainMounted += 1; });
        onBeforeUnmount(() => { lifecycle.mainUnmounted += 1; });
        return () => h("label", { class: "fixture-main-frame" }, [
          "等高线",
          h("input", {
            value: contour.value,
            onInput: (event: Event) => {
              contour.value = (event.target as HTMLInputElement).value;
            },
          }),
        ]);
      },
    });
    const Harness = defineComponent({
      setup() {
        const record = ref(pnwCreateViewPresentationRecord(PNW_IDENTITY));
        return () => h(PnwViewPresentationPortal, {
          record: record.value,
          title: "Fixture 完整 View",
          colorScheme: "dark",
          "onUpdate:record": (next: PnwViewPresentationRecord) => {
            record.value = next;
          },
        }, {
          header: ({ detach }: { detach: () => void }) => h("div", [
            h("button", { class: "fixture-detach", onClick: detach }, "浮出"),
            h(HeaderFrame),
          ]),
          main: () => h(MainFrame),
        });
      },
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    expect(wrapper.find(".pnw-view-presentation-portal__header-anchor .fixture-header-frame").exists()).toBe(true);
    expect(wrapper.find(".pnw-view-presentation-portal__main-anchor .fixture-main-frame").exists()).toBe(true);
    expect(lifecycle).toMatchObject({ headerMounted: 1, mainMounted: 1 });

    await wrapper.get(".fixture-detach").trigger("click");
    await pnwFlushPresentation();

    expect(wrapper.get(".pnw-view-presentation-portal").attributes(
      "data-pnw-view-presentation-mode",
    )).toBe("floating");
    expect(document.body.querySelectorAll(
      "[data-pnw-view-presentation-header-target] .fixture-header-frame",
    )).toHaveLength(1);
    expect(document.body.querySelectorAll(
      "[data-pnw-view-presentation-main-target] .fixture-main-frame",
    )).toHaveLength(1);
    expect(wrapper.find(".pnw-view-presentation-portal__header-anchor .fixture-header-frame").exists()).toBe(false);
    expect(wrapper.find(".pnw-view-presentation-portal__main-anchor .fixture-main-frame").exists()).toBe(false);
    expect(document.body.querySelector(".pnw-floating-panel")?.getAttribute("aria-modal")).toBeNull();
    expect(document.body.querySelector(".pnw-overlay-theme-root")?.getAttribute("data-pnw-color-scheme")).toBe("dark");

    const input = document.body.querySelector<HTMLInputElement>(
      "[data-pnw-view-presentation-main-target] input",
    );
    expect(input).not.toBeNull();
    if (input) {
      input.value = "9";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await nextTick();

    document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__close")?.click();
    await pnwFlushPresentation();

    expect(wrapper.get(".pnw-view-presentation-portal").attributes(
      "data-pnw-view-presentation-mode",
    )).toBe("embedded");
    expect(document.body.querySelector(".pnw-view-presentation-dialog")).toBeNull();
    expect(wrapper.get<HTMLInputElement>(".pnw-view-presentation-portal__main-anchor input").element.value).toBe("9");
    expect(lifecycle).toEqual({
      headerMounted: 1,
      headerUnmounted: 0,
      mainMounted: 1,
      mainUnmounted: 0,
    });

    wrapper.unmount();
    expect(lifecycle.headerUnmounted).toBe(1);
    expect(lifecycle.mainUnmounted).toBe(1);
  });

  it("X 关闭走 reattaching，Editor 不生成浮出占位页", async () => {
    const Harness = defineComponent({
      setup() {
        const record = ref(pnwCreateViewPresentationRecord(PNW_IDENTITY));
        return () => h(PnwViewPresentationPortal, {
          record: record.value,
          title: "Fixture 完整 View",
          "onUpdate:record": (next: PnwViewPresentationRecord) => {
            record.value = next;
          },
        }, {
          header: ({ detach }: { detach: () => void }) => h("button", {
            class: "fixture-detach",
            onClick: detach,
          }, "浮出"),
          main: () => h("div", "Main"),
        });
      },
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await wrapper.get(".fixture-detach").trigger("click");
    await pnwFlushPresentation();

    expect(wrapper.find("[role='status']").exists()).toBe(false);

    await document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__close")?.click();
    await pnwFlushPresentation();
    expect(wrapper.get(".pnw-view-presentation-portal").attributes(
      "data-pnw-view-presentation-mode",
    )).toBe("embedded");
    expect(document.body.querySelector(".pnw-floating-panel")).toBeNull();
    wrapper.unmount();
  });

  it("受控陈旧 target-ready 不能推进新 revision", async () => {
    const initial = pnwCreateViewPresentationRecord(PNW_IDENTITY);
    const opening = pnwReduceViewPresentationRecord(initial, { type: "detach" });
    const newer = { ...opening, revision: opening.revision + 1 };
    const wrapper = mount(PnwViewPresentationPortal, {
      attachTo: document.body,
      props: { record: newer, title: "Fixture" },
      slots: { header: "Header", main: "Main" },
    });
    await pnwFlushPresentation();

    const emitted = wrapper.emitted("update:record")?.at(-1)?.[0] as PnwViewPresentationRecord;
    expect(emitted.mode).toBe("floating");
    expect(emitted.revision).toBe(newer.revision);
    expect(pnwReduceViewPresentationRecord(newer, {
      type: "targets-ready",
      revision: opening.revision,
    })).toBe(newer);
    wrapper.unmount();
  });

  it("HMR 后以 floating record 重建时重新建立 lease，不留下可见空 Dialog", async () => {
    const registry = pnwCreateViewPresentationLeaseRegistry();
    const record = pnwCreateViewPresentationRecord(PNW_IDENTITY, {
      mode: "floating",
      revision: 7,
    });
    const wrapper = mount(PnwViewPresentationPortal, {
      attachTo: document.body,
      props: {
        record,
        title: "恢复中的完整 View",
        leaseRegistry: registry,
      },
      slots: {
        header: () => h("div", { class: "fixture-restored-header" }, "Header"),
        main: () => h("div", { class: "fixture-restored-main" }, "Main"),
      },
    });
    await pnwFlushPresentation();

    const panel = document.body.querySelector(".pnw-view-presentation-dialog");
    expect(panel?.classList.contains("pnw-view-presentation-dialog--committed")).toBe(true);
    expect(panel?.getAttribute("style")).toContain(
      "--pnw-floating-panel-layer-z-index: 1600",
    );
    expect(panel?.querySelectorAll(".fixture-restored-header")).toHaveLength(1);
    expect(panel?.querySelectorAll(".fixture-restored-main")).toHaveLength(1);
    expect(registry.snapshot()).toEqual([expect.objectContaining({
      viewInstanceId: PNW_IDENTITY.viewInstanceId,
      revision: 7,
      committed: true,
      leaseCount: 1,
    })]);
    wrapper.unmount();
  });
});
