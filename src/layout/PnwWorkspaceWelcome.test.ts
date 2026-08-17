// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import type {
  PnwRecentWorkspaceEntry,
  PnwWorkspaceState,
} from "../types/PnwWorkspace.js";
import PnwRecentWorkspaceList from "../components/PnwRecentWorkspaceList.vue";
import PnwWorkspaceRailAction from "../components/PnwWorkspaceRailAction.vue";
import PnwWorkspaceTypeSelect from "../components/PnwWorkspaceTypeSelect.vue";
import PnwWorkspaceWelcome from "./PnwWorkspaceWelcome.vue";

const PNW_WORKSPACE_WELCOME_SOURCE = readFileSync(
  resolve(process.cwd(), "src/layout/PnwWorkspaceWelcome.vue"),
  "utf8",
);
const PNW_WORKBENCH_THEME_SOURCE = readFileSync(
  resolve(process.cwd(), "src/styles/pnwWorkbenchTheme.css"),
  "utf8",
);
const PNW_WORKSPACE_GATE_SOURCE = readFileSync(
  resolve(process.cwd(), "src/layout/PnwWorkspaceGate.vue"),
  "utf8",
);
const PNW_RECENT_WORKSPACE_LIST_SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/PnwRecentWorkspaceList.vue"),
  "utf8",
);

function pnwHexLuminance(pnwHex: string): number {
  const pnwChannels = [1, 3, 5].map((pnwIndex) => (
    Number.parseInt(pnwHex.slice(pnwIndex, pnwIndex + 2), 16) / 255
  )).map((pnwChannel) => (
    pnwChannel <= 0.04045
      ? pnwChannel / 12.92
      : ((pnwChannel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * (pnwChannels[0] ?? 0))
    + (0.7152 * (pnwChannels[1] ?? 0))
    + (0.0722 * (pnwChannels[2] ?? 0));
}

function pnwContrastRatio(pnwFirst: string, pnwSecond: string): number {
  const [pnwLighter, pnwDarker] = [pnwHexLuminance(pnwFirst), pnwHexLuminance(pnwSecond)]
    .sort((pnwLeft, pnwRight) => pnwRight - pnwLeft);
  return ((pnwLighter ?? 0) + 0.05) / ((pnwDarker ?? 0) + 0.05);
}

function pnwThemeTokenValues(pnwToken: string): string[] {
  return [...PNW_WORKBENCH_THEME_SOURCE.matchAll(
    new RegExp(`${pnwToken}:\\s*(#[0-9a-fA-F]{6})`, "gu"),
  )].map((pnwMatch) => pnwMatch[1] ?? "#000000");
}

const PNW_RECENT: readonly PnwRecentWorkspaceEntry[] = [
  {
    workspaceId: "workspace-alpha",
    name: "Engineering Alpha",
    rootPath: "/workspace/engineering-alpha",
    availability: "available",
  },
  {
    workspaceId: "workspace-missing",
    name: "Archived Workspace",
    rootPath: "/workspace/archived",
    availability: "missing",
  },
];

const PNW_STATE: PnwWorkspaceState = {
  current: {
    workspaceId: "workspace-alpha",
    name: "Engineering Alpha",
    rootPath: "/workspace/engineering-alpha",
    readonly: false,
    capabilities: ["read", "write"],
  },
  recent: PNW_RECENT,
  phase: "open",
  revision: 3,
};

describe("PnwWorkspaceWelcome", () => {
  it("最近列表使用受控 Workspace 数据并区分当前、不可用和消费者动作", async () => {
    const wrapper = mount(PnwRecentWorkspaceList, {
      props: {
        entries: PNW_RECENT,
        currentWorkspaceId: "workspace-alpha",
      },
      slots: {
        actions: ({ entry }: { entry: PnwRecentWorkspaceEntry }) => h(
          "span",
          { class: "consumer-action" },
          `mode:${entry.workspaceId}`,
        ),
      },
    });

    const rows = wrapper.findAll(".pnw-recent-workspace-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.attributes("data-pnw-workspace-availability")).toBe("available");
    expect(rows[0]?.get(".pnw-recent-workspace-badge--current").text()).toBe("当前");
    expect(rows[0]?.get(".consumer-action").text()).toBe("mode:workspace-alpha");
    expect(rows[1]?.get(".pnw-recent-workspace-open").attributes()).toHaveProperty("disabled");
    expect(rows[1]?.text()).toContain("目录不存在");

    await rows[0]?.get(".pnw-recent-workspace-open").trigger("click");
    expect(wrapper.emitted("open")?.[0]?.[0]).toEqual(PNW_RECENT[0]);
    await rows[0]?.get(".pnw-recent-workspace-remove").trigger("click");
    expect(wrapper.emitted("remove")?.[0]?.[0]).toEqual(PNW_RECENT[0]);
  });

  it("类型选择、打开箭头与移除动作保持同一垂直中心线", () => {
    const wrapper = mount(PnwRecentWorkspaceList, {
      props: {
        entries: PNW_RECENT.slice(0, 1),
        currentWorkspaceId: "workspace-alpha",
      },
      slots: {
        actions: () => h(PnwWorkspaceTypeSelect, {
          modelValue: "lighting",
          size: "compact",
          types: [{
            typeId: "lighting",
            label: "Long lighting engineering workspace type",
            order: 10,
          }],
        }),
      },
    });

    expect(wrapper.find(".pnw-recent-workspace-actions .pnw-select--compact").exists()).toBe(true);
    expect(wrapper.find(".pnw-recent-workspace-open-icon").exists()).toBe(true);
    expect(wrapper.find(".pnw-recent-workspace-remove").exists()).toBe(true);
    expect(PNW_RECENT_WORKSPACE_LIST_SOURCE).toContain("align-items: center");
    expect(PNW_RECENT_WORKSPACE_LIST_SOURCE).toContain("--pnw-workspace-card-action-padding, 8px");
    expect(PNW_RECENT_WORKSPACE_LIST_SOURCE).not.toContain("align-items: stretch");
  });

  it("组合品牌、打开入口、当前 Workspace 与最近列表，并支持英文及 slot 扩展", async () => {
    const wrapper = mount(PnwWorkspaceWelcome, {
      props: {
        state: PNW_STATE,
        appTitle: "Engineering Workbench",
        productSubtitle: "Local tools",
        locale: "en-US",
      },
      slots: {
        "head-actions": "Preferences",
        "secondary-actions": () => h(PnwWorkspaceRailAction, {
          label: "Tour",
          icon: "search",
        }),
        "entry-badges": ({ entry }: { entry: PnwRecentWorkspaceEntry }) => h(
          "span",
          { class: "consumer-badge" },
          entry.workspaceId === "workspace-alpha" ? "CAD" : "All",
        ),
      },
    });

    expect(wrapper.attributes()).toHaveProperty("data-pnw-workspace-welcome");
    expect(wrapper.get(".pnw-welcome-title").text()).toBe("Welcome to Engineering Workbench");
    expect(wrapper.text()).toContain("Current workspace:");
    expect(wrapper.text()).toContain("/workspace/engineering-alpha");
    expect(wrapper.text()).toContain("Recent workspaces");
    expect(wrapper.text()).toContain("Preferences");
    expect(wrapper.text()).toContain("Tour");
    expect(wrapper.find("[data-pnw-workspace-secondary-actions]").exists()).toBe(true);
    expect(wrapper.find("[data-pnw-workspace-legacy-actions]").exists()).toBe(false);
    expect(wrapper.get(".consumer-badge").text()).toBe("CAD");

    await wrapper.get(".pnw-workspace-welcome-open").trigger("click");
    expect(wrapper.emitted("openWorkspace")).toEqual([[]]);
    await wrapper.findAll(".pnw-recent-workspace-open")[0]?.trigger("click");
    expect(wrapper.emitted("openRecent")?.[0]?.[0]).toEqual(PNW_RECENT[0]);
  });

  it("最近工作空间可折叠且支持受控/非受控开合", async () => {
    const wrapper = mount(PnwWorkspaceWelcome, {
      props: {
        state: PNW_STATE,
        recentCollapsible: true,
        recentDefaultOpen: false,
      },
    });

    const toggle = wrapper.get(".pnw-workspace-welcome-recent-toggle");
    const list = wrapper.get(".pnw-recent-workspace-list");
    const section = wrapper.get(".pnw-workspace-welcome-recent");
    expect(section.classes()).toContain("pnw-workspace-welcome-recent--collapsible");
    expect(list.classes()).toContain("pnw-recent-workspace-list--block");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-controls")).toBe(list.attributes("id"));
    expect(list.attributes("style")).toContain("display: none");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.emitted("update:recentOpen")).toEqual([[true]]);
    expect(list.attributes("style") ?? "").not.toContain("display: none");

    await wrapper.setProps({ recentOpen: false });
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.emitted("update:recentOpen")?.at(-1)).toEqual([true]);
    expect(PNW_WORKSPACE_WELCOME_SOURCE).toContain("--pnw-information-block-radius, 8px");
    expect(PNW_WORKSPACE_WELCOME_SOURCE).toContain("--pnw-workbench-surface");
    expect(PNW_RECENT_WORKSPACE_LIST_SOURCE).toContain(
      ".pnw-recent-workspace-list--block .pnw-recent-workspace-row",
    );
    expect(PNW_RECENT_WORKSPACE_LIST_SOURCE).toContain("border: 0");
  });

  it("切换期间统一禁用打开和删除，不在组件中选择持久化介质", async () => {
    const wrapper = mount(PnwWorkspaceWelcome, {
      props: {
        state: { ...PNW_STATE, phase: "opening-target" },
      },
    });

    expect(wrapper.get(".pnw-workspace-welcome-open").attributes()).toHaveProperty("disabled");
    expect(wrapper.get(".pnw-workspace-welcome-open").text()).toBe("正在打开…");
    expect(wrapper.findAll(".pnw-recent-workspace-open")[0]?.attributes()).toHaveProperty("disabled");
    expect(wrapper.findAll(".pnw-recent-workspace-remove")[0]?.attributes()).toHaveProperty("disabled");
  });

  it("作为 Workbench 外层全屏入口时携带受控主题根", () => {
    const wrapper = mount(PnwWorkspaceWelcome, {
      props: { state: PNW_STATE, colorScheme: "dark" },
    });

    expect(wrapper.classes()).toContain("pnw-workbench-theme-root");
    expect(wrapper.attributes("data-pnw-color-scheme")).toBe("dark");
  });

  it("打开、返回与关闭入口共享中性动作 CSS，并在明暗与 system 默认值下保持对比", () => {
    expect(PNW_WORKSPACE_WELCOME_SOURCE).toContain(
      "pnw-workspace-entry-action pnw-workspace-welcome-open",
    );
    expect(PNW_WORKSPACE_GATE_SOURCE.match(/pnw-workspace-entry-action/g)).toHaveLength(6);
    expect(PNW_WORKBENCH_THEME_SOURCE).toMatch(
      /\.pnw-workspace-entry-action\s*\{[\s\S]*?--pnw-workbench-surface[\s\S]*?--pnw-workbench-text/u,
    );
    expect(PNW_WORKBENCH_THEME_SOURCE).toMatch(
      /\.pnw-workspace-entry-action:hover:not\(:disabled\)\s*\{[\s\S]*?--pnw-control-hover-bg/u,
    );
    expect(PNW_WORKBENCH_THEME_SOURCE).toMatch(
      /\.pnw-workspace-entry-action:focus-visible\s*\{[\s\S]*?--pnw-focus-ring/u,
    );
    expect(PNW_WORKBENCH_THEME_SOURCE).toMatch(
      /\.pnw-workspace-entry-action:disabled\s*\{[\s\S]*?opacity:[\s\S]*?cursor:/u,
    );
    expect(PNW_WORKSPACE_WELCOME_SOURCE).not.toContain("--pnw-primary-");
    expect(PNW_WORKSPACE_WELCOME_SOURCE).not.toContain("--pnw-control-active-text");

    const pnwSurfaces = pnwThemeTokenValues("--pnw-workbench-default-surface");
    const pnwTexts = pnwThemeTokenValues("--pnw-workbench-default-text");
    expect(pnwSurfaces).toHaveLength(3);
    expect(pnwTexts).toHaveLength(3);
    for (const [pnwIndex, pnwText] of pnwTexts.entries()) {
      expect(pnwContrastRatio(pnwSurfaces[pnwIndex] ?? "#000000", pnwText))
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it("SSR 输出稳定结构，旧 WelcomeShell 升级为语义 token 与窄屏布局", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwWorkspaceWelcome, { state: PNW_STATE }),
    }));
    const source = readFileSync(resolve(process.cwd(), "src/layout/PnwWelcomeShell.vue"), "utf8");

    expect(html).toContain("data-pnw-workspace-welcome");
    expect(html).toContain("pnw-recent-workspace-row");
    expect(html).toContain("aria-current=\"true\"");
    expect(source).toContain("--pnw-workbench-surface");
    expect(source).toContain("--pnw-workbench-text");
    expect(source).toContain("@media (max-width: 760px)");
  });
});
