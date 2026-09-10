// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import {
  computed,
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
import { pnwProvideViewPresentationContext } from "../composables/usePnwViewPresentationContext.js";
import PnwPageHeader from "../layout/PnwPageHeader.vue";
import PnwViewPresentationPortal from "./PnwViewPresentationPortal.vue";

const PNW_VIEW_PRESENTATION_PORTAL_SOURCE = readFileSync(
  "src/components/PnwViewPresentationPortal.vue",
  "utf8",
);
const PNW_PAGE_HEADER_SOURCE = readFileSync(
  "src/layout/PnwPageHeader.vue",
  "utf8",
);

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
  it("冻结单行浮窗 chrome 的高度、gap 与 padding token", () => {
    expect(PNW_VIEW_PRESENTATION_PORTAL_SOURCE)
      .toContain("--pnw-view-presentation-header-min-height, 40px");
    expect(PNW_VIEW_PRESENTATION_PORTAL_SOURCE)
      .toContain("--pnw-view-presentation-header-gap, 8px");
    expect(PNW_VIEW_PRESENTATION_PORTAL_SOURCE)
      .toContain("--pnw-view-presentation-header-padding-inline, 8px");
    expect(PNW_VIEW_PRESENTATION_PORTAL_SOURCE).not.toMatch(
      /pnw-view-presentation-dialog[^}]+min-height:\s*0;[^}]+gap:\s*0;/u,
    );
  });

  it("在 760px、480px 与最小 360px 浮窗保持三段式 Header，并只在中区收纳完整业务动作", async () => {
    expect(PNW_VIEW_PRESENTATION_PORTAL_SOURCE).toMatch(
      /pnw-view-presentation-dialog__header-target\s*\{[^}]*flex:\s*1 1 0;[^}]*width:\s*0;[^}]*overflow:\s*hidden;/su,
    );
    expect(PNW_PAGE_HEADER_SOURCE).toContain(
      "--pnw-page-header-title-min-width, 112px",
    );
    expect(PNW_PAGE_HEADER_SOURCE).toMatch(
      /pnw-head-middle\s*\{[^}]*grid-column:\s*2;[^}]*min-width:\s*0;[^}]*overflow-x:\s*auto;/su,
    );
    expect(PNW_PAGE_HEADER_SOURCE).toMatch(
      /pnw-head-actions\s*>\s*\*,[\s\S]*?pnw-head-help\s*>\s*\*\s*\{\s*flex:\s*0 0 auto;/u,
    );
    expect(PNW_PAGE_HEADER_SOURCE).toContain("justify-content: safe center");
    expect(PNW_PAGE_HEADER_SOURCE).toContain("justify-content: safe flex-end");

    for (const width of [760, 480, 360]) {
      const identity = {
        ...PNW_IDENTITY,
        viewInstanceId: `fixture.view:${width}`,
        instanceKey: `fixture-view-${width}`,
      };
      const Harness = defineComponent({
        setup() {
          const record = ref(pnwCreateViewPresentationRecord(identity, {
            dialogSize: { width, height: 560 },
          }));
          pnwProvideViewPresentationContext({
            mode: computed(() => record.value.mode),
            detach: () => {
              record.value = pnwReduceViewPresentationRecord(record.value, { type: "detach" });
            },
            reattach: () => {
              record.value = pnwReduceViewPresentationRecord(record.value, { type: "reattach" });
            },
          });
          return () => h(PnwViewPresentationPortal, {
            record: record.value,
            title: "Host fallback title",
            "onUpdate:record": (next: PnwViewPresentationRecord) => {
              record.value = next;
            },
          }, {
            main: () => h(PnwPageHeader, {
              title: "功能列表",
              actionsAlign: width === 480 ? "end" : "center",
            }, {
              actions: () => [
                h("input", { class: "fixture-filter-wide", style: "width:300px" }),
                h("select", { class: "fixture-filter-medium", style: "width:150px" }),
                h("button", { class: "fixture-refresh" }, "刷新"),
                h("button", { class: "fixture-archive" }, "归档当前筛选结果"),
                h("button", { class: "fixture-add" }, "添加"),
              ],
            }),
          });
        },
      });
      const wrapper = mount(Harness, { attachTo: document.body });
      await wrapper.get(".pnw-head-presentation-action").trigger("click");
      await pnwFlushPresentation();

      const chrome = document.body.querySelector(".pnw-floating-panel__header");
      expect(chrome?.querySelector(".pnw-page-title")?.textContent).toBe("功能列表");
      expect(chrome?.querySelectorAll(".pnw-head-actions > *")).toHaveLength(5);
      expect(chrome?.querySelector(".pnw-head-row")?.getAttribute("data-pnw-actions-align"))
        .toBe(width === 480 ? "end" : "center");
      expect(chrome?.querySelector(".fixture-archive")?.textContent)
        .toBe("归档当前筛选结果");
      expect([...(chrome?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
        .map((button) => button.className)).toEqual([
          "fixture-refresh",
          "fixture-archive",
          "fixture-add",
          "pnw-floating-panel__reset-size",
          "pnw-view-presentation-dialog__reattach",
        ]);
      const archive = chrome?.querySelector<HTMLButtonElement>(".fixture-archive");
      archive?.focus();
      expect(document.activeElement).toBe(archive);
      expect(document.body.querySelector<HTMLElement>(".pnw-floating-panel")?.style.getPropertyValue(
        "--pnw-floating-panel-width",
      )).toBe(`${width}px`);
      wrapper.unmount();
    }
  });

  it("将同一 PageHeader 的标题、leading 与业务 actions 单行迁入浮窗 chrome", async () => {
    const search = vi.fn();
    let headerChannel: ReturnType<typeof pnwProvideViewPresentationContext>["headerChannel"]
      | undefined;
    const Harness = defineComponent({
      setup() {
        const record = ref(pnwCreateViewPresentationRecord(PNW_IDENTITY));
        const context = pnwProvideViewPresentationContext({
          mode: computed(() => record.value.mode),
          detach: () => {
            record.value = pnwReduceViewPresentationRecord(record.value, { type: "detach" });
          },
          reattach: () => {
            record.value = pnwReduceViewPresentationRecord(record.value, { type: "reattach" });
          },
        });
        headerChannel = context.headerChannel;
        return () => {
          return h(PnwViewPresentationPortal, {
            record: record.value,
            title: "Host fallback title",
            "onUpdate:record": (next: PnwViewPresentationRecord) => {
              record.value = next;
            },
          }, {
            header: () => h("strong", { class: "fixture-fallback-title" }, "Host fallback title"),
            main: () => h("div", { class: "fixture-view" }, [
              h(PnwPageHeader, {
                title: "业务列表",
                eyebrow: "不进入单行 Header",
                description: "长说明留给 main",
              }, {
                leading: () => h("button", { class: "fixture-back" }, "返回"),
                actions: () => h("button", {
                  class: "fixture-search",
                  onClick: search,
                }, "搜索"),
              }),
              h("p", { class: "fixture-description" }, "长说明留给 main"),
            ]),
          });
        };
      },
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await nextTick();

    expect(headerChannel?.registeredCount.value).toBe(1);
    expect(wrapper.find(".pnw-view-presentation-portal__main-anchor .pnw-page-head").exists())
      .toBe(true);
    expect(wrapper.text()).not.toContain("不进入单行 Header");
    expect(wrapper.find(".fixture-description").text()).toBe("长说明留给 main");

    await wrapper.get(".pnw-head-presentation-action").trigger("click");
    await pnwFlushPresentation();

    const chrome = document.body.querySelector(".pnw-floating-panel__header");
    expect(chrome?.querySelectorAll(".pnw-page-head--floating")).toHaveLength(1);
    expect(chrome?.querySelectorAll(".pnw-page-title")).toHaveLength(1);
    expect(chrome?.textContent).toContain("业务列表");
    expect(chrome?.textContent).toContain("返回");
    expect(chrome?.textContent).toContain("搜索");
    expect(chrome?.textContent).not.toContain("Host fallback title");
    expect(document.body.querySelector(
      "[data-pnw-view-presentation-main-target] .pnw-page-head",
    )).toBeNull();
    expect(document.body.querySelector(
      "[data-pnw-view-presentation-main-target] .fixture-description",
    )?.textContent).toBe("长说明留给 main");
    expect([...(chrome?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .map((button) => button.className)).toEqual([
        "fixture-back",
        "fixture-search",
        "pnw-floating-panel__reset-size",
        "pnw-view-presentation-dialog__reattach",
      ]);
    await (chrome?.querySelector<HTMLButtonElement>(".fixture-search"))?.click();
    expect(search).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(headerChannel?.registeredCount.value).toBe(0);
  });

  it("无业务 actions 时仍只渲染一个贡献标题与 Host chrome actions", async () => {
    const Harness = defineComponent({
      setup() {
        const record = ref(pnwCreateViewPresentationRecord(PNW_IDENTITY));
        pnwProvideViewPresentationContext({
          mode: computed(() => record.value.mode),
          detach: () => {
            record.value = pnwReduceViewPresentationRecord(record.value, { type: "detach" });
          },
          reattach: () => {
            record.value = pnwReduceViewPresentationRecord(record.value, { type: "reattach" });
          },
        });
        return () => h(PnwViewPresentationPortal, {
          record: record.value,
          title: "Host fallback title",
          "onUpdate:record": (next: PnwViewPresentationRecord) => {
            record.value = next;
          },
        }, {
          main: () => h(PnwPageHeader, { title: "无操作详情" }),
        });
      },
    });
    const wrapper = mount(Harness, { attachTo: document.body });
    await wrapper.get(".pnw-head-presentation-action").trigger("click");
    await pnwFlushPresentation();

    const chrome = document.body.querySelector(".pnw-floating-panel__header");
    expect(chrome?.querySelectorAll(".pnw-page-title")).toHaveLength(1);
    expect(chrome?.textContent).toContain("无操作详情");
    expect(chrome?.textContent).not.toContain("Host fallback title");
    expect(chrome?.querySelector(".pnw-head-actions")).toBeNull();
    expect([...(chrome?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
      .map((button) => button.className)).toEqual([
        "pnw-floating-panel__reset-size",
        "pnw-view-presentation-dialog__reattach",
      ]);
    wrapper.unmount();
  });

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

    document.body.querySelector<HTMLButtonElement>(
      ".pnw-view-presentation-dialog__reattach",
    )?.click();
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

  it("默认只显示明确收回动作，不显示有歧义的 X", async () => {
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

    expect(document.body.querySelector(".pnw-floating-panel__close")).toBeNull();
    const reattach = document.body.querySelector<HTMLButtonElement>(
      ".pnw-view-presentation-dialog__reattach",
    );
    const resetSize = document.body.querySelector<HTMLButtonElement>(
      ".pnw-floating-panel__reset-size",
    );
    expect(reattach?.getAttribute("aria-label")).toBe("收回到 Editor");
    expect(reattach?.getAttribute("title")).toBe("收回到 Editor");
    expect(resetSize?.getAttribute("aria-label")).toBe("恢复推荐尺寸");
    expect(resetSize?.getAttribute("title")).toBe("恢复推荐尺寸");
    expect(resetSize?.disabled).toBe(true);
    expect(reattach?.querySelector("svg")?.innerHTML)
      .not.toBe(resetSize?.querySelector("svg")?.innerHTML);
    expect([...document.body.querySelectorAll<HTMLButtonElement>(
      ".pnw-floating-panel__header > button",
    )].map((button) => button.className)).toEqual([
      "pnw-floating-panel__reset-size",
      "pnw-view-presentation-dialog__reattach",
    ]);
    await reattach?.click();
    await pnwFlushPresentation();
    expect(wrapper.get(".pnw-view-presentation-portal").attributes(
      "data-pnw-view-presentation-mode",
    )).toBe("embedded");
    expect(document.body.querySelector(".pnw-floating-panel")).toBeNull();
    wrapper.unmount();
  });

  it("显式启用 X 时只发出 requestClose，交由 Host 保存守卫决定关闭", async () => {
    const record = ref(pnwCreateViewPresentationRecord(PNW_IDENTITY));
    const Harness = defineComponent({
      setup() {
        return () => h(PnwViewPresentationPortal, {
          record: record.value,
          title: "可关闭完整 View",
          showCloseAction: true,
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

    const close = document.body.querySelector<HTMLButtonElement>(".pnw-floating-panel__close");
    expect(close?.getAttribute("aria-label")).toBe("关闭 View");
    expect([...document.body.querySelectorAll<HTMLButtonElement>(
      ".pnw-floating-panel__header > button",
    )].map((button) => button.className)).toEqual([
      "pnw-floating-panel__reset-size",
      "pnw-view-presentation-dialog__reattach",
      "pnw-floating-panel__close",
    ]);
    close?.click();
    await nextTick();
    expect(wrapper.findComponent(PnwViewPresentationPortal).emitted("requestClose")?.[0])
      .toEqual([PNW_IDENTITY.viewInstanceId]);
    expect(record.value.mode).toBe("floating");
    expect(document.body.querySelector(".pnw-view-presentation-dialog")).not.toBeNull();
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
