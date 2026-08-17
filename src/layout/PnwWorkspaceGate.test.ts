// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { PnwWorkspaceState } from "../types/PnwWorkspace.js";
import PnwWorkspaceRailAction from "../components/PnwWorkspaceRailAction.vue";
import { pnwResolveWorkspaceGate } from "../utils/pnwWorkspaceGate.js";
import PnwWorkspaceGate from "./PnwWorkspaceGate.vue";

const PNW_CLOSED_STATE: PnwWorkspaceState = {
  recent: [],
  phase: "closed",
  revision: 1,
};

const PNW_OPEN_STATE: PnwWorkspaceState = {
  current: {
    workspaceId: "workspace-alpha",
    name: "Engineering Alpha",
    rootPath: "/workspace/engineering-alpha",
    readonly: false,
    capabilities: ["read", "write"],
  },
  recent: [],
  phase: "open",
  revision: 2,
};

describe("PnwWorkspaceGate", () => {
  it("纯解析契约区分 required 与 optional，不接管 Host 状态", () => {
    expect(pnwResolveWorkspaceGate({
      state: PNW_CLOSED_STATE,
      policy: "required",
      requestedMode: "workbench",
    })).toMatchObject({
      mode: "welcome",
      canEnterWorkbench: false,
      forcedWelcome: true,
    });

    expect(pnwResolveWorkspaceGate({
      state: PNW_CLOSED_STATE,
      policy: "optional",
      requestedMode: "workbench",
    })).toMatchObject({
      mode: "workbench",
      canEnterWorkbench: true,
      forcedWelcome: false,
    });
  });

  it("required 在没有 Workspace 时固定显示 Wing Welcome 外壳", () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_CLOSED_STATE, policy: "required" },
      slots: { workbench: "WORKBENCH" },
    });

    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("welcome");
    expect(wrapper.find(".pnw-welcome").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("WORKBENCH");
    expect(wrapper.find(".pnw-workspace-gate-entry-action").exists()).toBe(false);
  });

  it("把受控主题传给 Workbench 外层的 Welcome theme root", () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_CLOSED_STATE, colorScheme: "dark" },
    });

    const welcome = wrapper.get("[data-pnw-workspace-welcome]");
    expect(welcome.classes()).toContain("pnw-workbench-theme-root");
    expect(welcome.attributes("data-pnw-color-scheme")).toBe("dark");
  });

  it("optional 允许用户显式无 Workspace 继续进入", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_CLOSED_STATE, policy: "optional" },
      slots: { workbench: "WORKBENCH" },
    });

    const action = wrapper.get(".pnw-workspace-gate-entry-action");
    expect(action.text()).toBe("不打开工作空间，继续进入");
    await action.trigger("click");

    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("workbench");
    expect(wrapper.text()).toContain("WORKBENCH");
    expect(wrapper.emitted("continueWithoutWorkspace")).toEqual([[]]);
    expect(wrapper.emitted("update:mode")?.at(-1)).toEqual(["workbench"]);
  });

  it("已有 Workspace 可从 Welcome 返回；关闭后统一回 Welcome", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_OPEN_STATE, policy: "required" },
      slots: { workbench: "WORKBENCH" },
    });

    const actions = wrapper.findAll(".pnw-workspace-gate-entry-action");
    expect(actions.map((action) => action.text())).toEqual(["返回工作空间", "关闭当前工作空间"]);
    await actions[0]?.trigger("click");
    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("workbench");

    await wrapper.setProps({ state: { ...PNW_CLOSED_STATE, revision: 3 } });
    await nextTick();
    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("welcome");
    expect(wrapper.emitted("update:mode")?.at(-1)).toEqual(["welcome"]);
  });

  it("Welcome 中的关闭动作只发出 Host 请求，不自行清理 Workspace", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_OPEN_STATE },
    });

    await wrapper.findAll(".pnw-workspace-gate-entry-action")[1]?.trigger("click");
    expect(wrapper.emitted("closeWorkspace")).toEqual([[]]);
    expect(wrapper.props("state").current?.workspaceId).toBe("workspace-alpha");
    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("welcome");
  });

  it("生命周期动作默认随 Rail 自动换位，仍发出同一 Gate 意图", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_OPEN_STATE, showRail: false },
    });

    expect(wrapper.find('[data-pnw-workspace-gate-actions="rail"]').exists()).toBe(false);
    const headActions = wrapper.get('[data-pnw-workspace-gate-actions="head"]');
    expect(headActions.text()).toContain("返回工作空间");
    expect(headActions.text()).toContain("关闭当前工作空间");

    await headActions.get(".pnw-workspace-gate-entry-action--close").trigger("click");
    expect(wrapper.emitted("closeWorkspace")).toEqual([[]]);
    expect(wrapper.props("state").current?.workspaceId).toBe("workspace-alpha");
  });

  it("Rail 按打开、次级动作、生命周期分组排列并保持统一动作外壳", () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_OPEN_STATE },
      slots: {
        "secondary-actions": () => h(PnwWorkspaceRailAction, {
          label: "界面巡游",
          icon: "search",
        }),
      },
    });

    const stack = wrapper.get(".pnw-workspace-welcome-action-stack");
    expect(stack.element.children).toHaveLength(3);
    expect(stack.element.children[0]?.classList).toContain("pnw-workspace-welcome-open");
    expect(stack.element.children[1]?.hasAttribute("data-pnw-workspace-secondary-actions"))
      .toBe(true);
    expect(stack.element.children[2]?.hasAttribute("data-pnw-workspace-legacy-actions"))
      .toBe(true);
    expect(stack.get(".pnw-workspace-rail-action").text()).toBe("界面巡游");
    expect(stack.get('[data-pnw-workspace-gate-actions="rail"]').text())
      .toContain("关闭当前工作空间");
  });

  it("允许消费者隐藏默认动作投影并从 scoped slot 调用统一关闭命令", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_OPEN_STATE, actionPlacement: "none" },
      slots: {
        "head-actions": ({ closeWorkspace }: { closeWorkspace: () => void }) => h(
          "button",
          { class: "consumer-close", onClick: closeWorkspace },
          "CUSTOM CLOSE",
        ),
      },
    });

    expect(wrapper.find("[data-pnw-workspace-gate-actions]").exists()).toBe(false);
    await wrapper.get(".consumer-close").trigger("click");
    expect(wrapper.emitted("closeWorkspace")).toEqual([[]]);
  });

  it("从 Gate 发起打开后，仅在受控 Workspace 成功时进入 Workbench", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_CLOSED_STATE },
      slots: { workbench: "WORKBENCH" },
    });

    await wrapper.get(".pnw-workspace-welcome-open").trigger("click");
    expect(wrapper.emitted("openWorkspace")).toEqual([[]]);
    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("welcome");

    await wrapper.setProps({ state: PNW_OPEN_STATE });
    await nextTick();
    expect(wrapper.attributes("data-pnw-workspace-gate-mode")).toBe("workbench");
  });

  it("允许隐藏左 Rail 并完全改写右侧内容，但不能替换 Wing 外壳", () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: { state: PNW_CLOSED_STATE, showRail: false },
      slots: {
        "welcome-main": ({ gate }: { gate: { forcedWelcome: boolean } }) => h(
          "section",
          { class: "consumer-welcome-main" },
          `CUSTOM:${String(gate.forcedWelcome)}`,
        ),
      },
    });

    expect(wrapper.find(".pnw-welcome").exists()).toBe(true);
    expect(wrapper.find(".pnw-welcome--without-rail").exists()).toBe(true);
    expect(wrapper.find(".pnw-welcome-rail").exists()).toBe(false);
    expect(wrapper.get(".consumer-welcome-main").text()).toBe("CUSTOM:false");
    expect(wrapper.find(".pnw-workspace-welcome-recent").exists()).toBe(false);
  });

  it("把最近列表的受控折叠意图透传给 Host", async () => {
    const wrapper = mount(PnwWorkspaceGate, {
      props: {
        state: PNW_OPEN_STATE,
        recentCollapsible: true,
        recentOpen: false,
      },
    });

    const toggle = wrapper.get(".pnw-workspace-welcome-recent-toggle");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(wrapper.emitted("update:recentOpen")).toEqual([[true]]);
    expect(toggle.attributes("aria-expanded")).toBe("false");
  });

  it("SSR 保持单一 Gate 与 Welcome 语义结构", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwWorkspaceGate, { state: PNW_CLOSED_STATE }),
    }));

    expect(html).toContain("data-pnw-workspace-gate");
    expect(html).toContain("data-pnw-workspace-gate-mode=\"welcome\"");
    expect(html).toContain("data-pnw-workspace-welcome");
  });
});
