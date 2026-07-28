import { createSSRApp, defineComponent, h, type Component, type Slots } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { PnwNavigationNode } from "../types/PnwWorkbenchWeb.js";
import PnwIcon from "../components/PnwIcon.vue";
import PnwPhoenixWingMark from "../components/PnwPhoenixWingMark.vue";
import PnwActivityBar from "./PnwActivityBar.vue";
import PnwActivityTree from "./PnwActivityTree.vue";
import PnwRibbon from "./PnwRibbon.vue";
import PnwRibbonTabBar from "./PnwRibbonTabBar.vue";
import PnwWorkbenchFooter from "./PnwWorkbenchFooter.vue";
import PnwWorkbenchHeader from "./PnwWorkbenchHeader.vue";
import PnwWorkbenchLayout from "./PnwWorkbenchLayout.vue";
import PnwWorkbenchShell from "./PnwWorkbenchShell.vue";

const PNW_SSR_NAVIGATION = [
  {
    id: "module",
    label: "模块",
    shortLabel: "模",
    children: [{
      id: "group",
      label: "分组",
      children: [{ id: "page", label: "页面", icon: "◆" }],
    }],
  },
  {
    id: "other-module",
    label: "其他模块",
    children: [{ id: "other-page", label: "其他页面" }],
  },
] as const satisfies readonly PnwNavigationNode[];

async function pnwRenderComponent(
  component: Component,
  props: Record<string, unknown>,
  slots: Slots = {},
): Promise<string> {
  return renderToString(createSSRApp({
    render: () => h(component, props, slots),
  }));
}

describe("Pnw Web 工作台 SSR 无障碍语义", () => {
  it("Phoenix Wing 标志保留品牌渐变并支持可访问与装饰语义", async () => {
    const accessibleHtml = await pnwRenderComponent(PnwPhoenixWingMark, {
      title: "Phoenix 工作台",
    });
    expect(accessibleHtml).toContain('role="img"');
    expect(accessibleHtml).toContain('aria-label="Phoenix 工作台"');
    expect(accessibleHtml).toContain("pnw-phoenix-wing-mark-left-wing");

    const decorativeHtml = await pnwRenderComponent(PnwPhoenixWingMark, {
      decorative: true,
    });
    expect(decorativeHtml).toContain('aria-hidden="true"');
    expect(decorativeHtml).not.toContain('role="img"');
    expect(decorativeHtml).not.toContain("<title");
  });

  it("Tree 输出受控展开、选中与 treeitem 语义", async () => {
    const html = await pnwRenderComponent(PnwActivityTree, {
      nodes: PNW_SSR_NAVIGATION,
      activeNodeId: "page",
      expandedNodeIds: ["module", "group"],
    });

    expect(html).toContain('role="tree"');
    expect(html.match(/role="treeitem"/g)).toHaveLength(4);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-current="page"');

    const railHtml = await pnwRenderComponent(PnwActivityTree, {
      nodes: [...PNW_SSR_NAVIGATION, { id: "plain", label: "无图标工具" }],
      activeNodeId: "page",
      collapsed: true,
    });
    expect(railHtml).toContain('data-pnw-activity-tree-collapsed="true"');
    expect(railHtml).toContain('role="toolbar"');
    expect(railHtml).toContain("无");
    expect(railHtml).not.toContain('role="treeitem"');
  });

  it("Ribbon 只提供一个可访问的工作台显示设置入口并呈现合法尺寸", async () => {
    const html = await pnwRenderComponent(PnwRibbon, {
      nodes: PNW_SSR_NAVIGATION,
      activeNodeId: "page",
      appearance: {
        mode: "ribbon",
        compact: { iconSize: 24, showTitles: true, showGroupLabels: false },
        ribbon: { iconSize: 36, showTitles: true, showGroupLabels: true },
      },
    });

    expect(html.match(/aria-label="工作台显示设置"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="页面"');
    expect(html).toContain('data-pnw-ribbon-display-mode="large"');
    expect(html).toContain('data-pnw-ribbon-icon-size="36"');
    expect(html).toContain('--pnw-ribbon-natural-height:85px');
    expect(html).not.toContain("其他页面");
    expect(html).not.toContain("pnw-ribbon-module-label");

    const externallyConfiguredHtml = await pnwRenderComponent(PnwRibbon, {
      nodes: PNW_SSR_NAVIGATION,
      showAppearanceMenu: false,
      appearance: {
        mode: "compact",
        compact: { iconSize: 16, showTitles: false, showGroupLabels: true },
        ribbon: { iconSize: 36, showTitles: true, showGroupLabels: true },
      },
    });
    expect(externallyConfiguredHtml).not.toContain('aria-label="工作台显示设置"');
    expect(externallyConfiguredHtml).toContain('--pnw-ribbon-natural-height:28px');
    expect(externallyConfiguredHtml).toContain('data-pnw-ribbon-group-labels="false"');
  });

  it("Tree 在目录末尾提供不属于导航数据的工作台显示设置入口", async () => {
    const html = await pnwRenderComponent(PnwActivityBar, {
      nodes: PNW_SSR_NAVIGATION,
      presentation: "tree",
      activeNodeId: "page",
    });

    expect(html).toContain('data-pnw-display-trigger="tree"');
    expect(html).toContain('aria-label="工作台显示设置"');
    expect(html.indexOf("工作台显示设置")).toBeGreaterThan(html.indexOf('role="tree"'));
  });

  it("公共图标在指定尺寸下保持 SVG 与可访问语义", async () => {
    const html = await pnwRenderComponent(PnwIcon, {
      name: "settings",
      size: 64,
      decorative: false,
      title: "显示设置",
    });
    expect(html).toContain('width="64"');
    expect(html).toContain('height="64"');
    expect(html).toContain('aria-label="显示设置"');
    expect(html).toMatch(/<title[^>]*>显示设置<\/title>/u);
  });

  it("工作台显示快捷预设使用四个独立公共矢量图标", async () => {
    const iconNames = [
      "navigation-tree",
      "compact-toolbar",
      "compact-toolbar-title",
      "ribbon",
    ] as const;
    const rendered = await Promise.all(iconNames.map((name) => pnwRenderComponent(PnwIcon, {
      name,
      size: 18,
      decorative: false,
    })));

    rendered.forEach((html, index) => {
      expect(html).toContain('width="18"');
      expect(html).toContain(`aria-label="${iconNames[index]}"`);
      expect(html).not.toContain("<image");
    });
    expect(new Set(rendered).size).toBe(iconNames.length);
  });

  it("Header 以固定插槽顺序容纳品牌、模块、打开页签和单一操作区", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchHeader,
      { ariaLabel: "测试工作台页眉" },
      {
        brand: () => [h("span", "Brand")],
        modules: () => [h("span", "Modules")],
        pages: () => [h("span", "Pages")],
        actions: () => [h("button", { "aria-label": "设置" }, "Settings")],
      },
    );

    expect(html).toContain('aria-label="测试工作台页眉"');
    expect(html.indexOf("Brand")).toBeLessThan(html.indexOf("Modules"));
    expect(html.indexOf("Modules")).toBeLessThan(html.indexOf("Pages"));
    expect(html.indexOf("Pages")).toBeLessThan(html.indexOf("Settings"));
  });

  it("无打开 View 时移除空页签区，Header 操作区仍保留", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchShell,
      {
        nodes: PNW_SSR_NAVIGATION,
        activeNodeId: "page",
        tabs: [],
      },
      {
        brand: () => [h("span", "Brand")],
        "header-actions": () => [h("button", { "aria-label": "设置" }, "Settings")],
        default: () => [h("div", "Editor")],
      },
    );

    expect(html).toContain("Brand");
    expect(html).toContain("Settings");
    expect(html).not.toContain("pnw-workbench-header-pages");
    expect(html).not.toContain('aria-label="已打开页面"');
  });

  it("WorkbenchShell 用一个组合入口装配受控 Header、ActivityBar 与 View Blocks", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchShell,
      {
        nodes: PNW_SSR_NAVIGATION,
        activeNodeId: "page",
        presentation: "ribbon",
        ribbonAppearance: {
          mode: "compact",
          compact: { iconSize: 16, showTitles: true, showGroupLabels: false },
          ribbon: { iconSize: 36, showTitles: true, showGroupLabels: true },
        },
        tabs: [{ id: "page", pageId: "page", title: "页面", dirty: false }],
        activeTabId: "page",
        contributions: { primary: true, bottom: true, secondary: true },
        visibility: { primary: true, bottom: true, secondary: true },
        colorScheme: "dark",
        showRibbonAppearanceMenu: false,
      },
      {
        brand: () => [h("span", "Brand")],
        "header-actions": () => [h("button", { "aria-label": "设置" }, "Settings")],
        default: () => [h("div", "Editor")],
        primary: () => [h("div", "Primary")],
        bottom: () => [h("div", "Bottom")],
        secondary: () => [h("div", "Secondary")],
        footer: () => [h("span", "Consumer status")],
      },
    );

    expect(html).toContain('data-pnw-color-scheme="dark"');
    expect(html).toContain('aria-label="模块"');
    expect(html).toContain(">模</button>");
    expect(html).toContain("Brand");
    expect(html).toContain("Editor");
    expect(html).toContain("Primary");
    expect(html).toContain("Bottom");
    expect(html).toContain("Secondary");
    expect(html).toContain("Consumer status");
    expect(html.match(/pnw-workbench-footer-toggle/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("WorkbenchShell 直接动态装配当前 View 提供的三个 Block 组件", async () => {
    const PnwSsrBlock = defineComponent({
      props: {
        label: { type: String, required: true },
        activeTabId: { type: String, default: "" },
      },
      setup: (props) => () => h("div", `${props.label}:${props.activeTabId}`),
    });
    const html = await pnwRenderComponent(
      PnwWorkbenchShell,
      {
        nodes: PNW_SSR_NAVIGATION,
        activeNodeId: "page",
        visibility: { primary: true, bottom: true, secondary: true },
        activeBottomTabId: "output",
        viewBlocks: {
          primary: { component: PnwSsrBlock, props: { label: "View Primary" } },
          bottom: {
            component: PnwSsrBlock,
            props: { label: "View Bottom" },
            tabs: [{ id: "output", label: "输出" }],
          },
          secondary: { component: PnwSsrBlock, props: { label: "View Secondary" } },
        },
      },
      { default: () => [h("div", "View Editor")] },
    );

    expect(html).toContain("View Editor");
    expect(html).toContain("View Primary:");
    expect(html).toContain("View Bottom:output");
    expect(html).toContain("View Secondary:");
    expect(html).toContain("输出");
    expect(html.match(/pnw-workbench-footer-toggle/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("默认品牌与受控空态可在 consumer 未提供 slot 时直接使用", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchShell,
      {
        nodes: PNW_SSR_NAVIGATION,
        tabs: [],
        showEmptyView: true,
        brandSubtitle: "fixture / public entry",
      },
      { default: () => [h("div", "不应保留的旧 View")] },
    );

    expect(html).toContain("Pnw Workbench");
    expect(html).toContain("fixture / public entry");
    expect(html).toContain("pnw-phoenix-wing-mark");
    expect(html).toContain("未打开任何 View");
    expect(html).not.toContain("不应保留的旧 View");
  });

  it("Header 大分组可显示短标签并保留完整可访问名称", async () => {
    const html = await pnwRenderComponent(PnwRibbonTabBar, {
      tabs: [{ id: "workspace", label: "工作", fullLabel: "工作空间" }],
      activeTab: "workspace",
    });

    expect(html).toContain(">工作</button>");
    expect(html).toContain('aria-label="工作空间"');
    expect(html).toContain('title="工作空间"');
  });

  it("Footer 仅为当前 View 的 contribution 输出仅图标开关", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchFooter,
      {
        contributions: { primary: true, bottom: true },
        visibility: { primary: true, bottom: false, secondary: false },
      },
      { default: () => [h("span", "Consumer status")] },
    );

    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).toContain("Consumer status");
    expect(html).toContain('aria-label="显示/隐藏 Primary Block"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Secondary Block");
  });

  it("consumer 可只贡献 Footer 内容而不声明 View Block", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchLayout,
      {},
      {
        default: () => [h("div", "Editor")],
        footer: () => [h("span", "连接状态：就绪")],
      },
    );

    expect(html).toContain("pnw-workbench-footer");
    expect(html).toContain("连接状态：就绪");
    expect(html).not.toContain("pnw-workbench-footer-toggle");
  });

  it("无 slot 时不生成空 Block，Bottom 始终嵌在 Editor 栈内", async () => {
    const emptyHtml = await pnwRenderComponent(PnwWorkbenchLayout, {
      contributions: { primary: true, bottom: true, secondary: true },
      visibility: { primary: true, bottom: true, secondary: true },
      colorScheme: "dark",
    });
    expect(emptyHtml).toContain('data-pnw-color-scheme="dark"');
    expect(emptyHtml).not.toContain("pnw-primary-block");
    expect(emptyHtml).not.toContain("pnw-workbench-footer");

    const fullHtml = await pnwRenderComponent(
      PnwWorkbenchLayout,
      {
        contributions: { primary: true, bottom: true, secondary: true },
        visibility: { primary: true, bottom: true, secondary: true },
      },
      {
        header: () => [h("div", "Header")],
        default: () => [h("div", "Editor")],
        primary: () => [h("div", "Primary")],
        bottom: () => [h("div", "Bottom")],
        secondary: () => [h("div", "Secondary")],
      },
    );
    const headerStart = fullHtml.indexOf("pnw-workbench-header-slot");
    const editorStackStart = fullHtml.indexOf("pnw-workbench-editor-stack");
    const bottomStart = fullHtml.indexOf("pnw-bottom-panel");
    const secondaryStart = fullHtml.indexOf("pnw-secondary-block");
    expect(headerStart).toBeGreaterThan(-1);
    expect(headerStart).toBeLessThan(editorStackStart);
    expect(editorStackStart).toBeGreaterThan(-1);
    expect(bottomStart).toBeGreaterThan(editorStackStart);
    expect(secondaryStart).toBeGreaterThan(bottomStart);
  });

  it("统一布局状态输出三条显式 separator，并让 Bottom 承载受控多 Tab", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchLayout,
      {
        contributions: { primary: true, bottom: true, secondary: true },
        layoutState: {
          visibility: { primary: true, bottom: true, secondary: true },
          sizes: { primaryWidth: 310, secondaryWidth: 290, bottomHeight: 220 },
        },
        bottomTabs: [
          { id: "problems", label: "问题", count: 2, tone: "warning" },
          { id: "output", label: "运行日志", count: 4 },
        ],
        activeBottomTabId: "output",
      },
      {
        default: () => [h("div", "Editor")],
        primary: () => [h("div", "Primary")],
        bottom: ({ activeTabId }: { activeTabId: string }) => [h("div", activeTabId)],
        secondary: () => [h("div", "Secondary")],
      },
    );

    expect(html.match(/role="separator"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="调节 Primary Block 宽度"');
    expect(html).toContain('aria-label="调节 Secondary Block 宽度"');
    expect(html).toContain('aria-label="调节 Bottom Panel 高度"');
    expect(html).toContain("width:310px");
    expect(html).toContain("width:290px");
    expect(html).toContain("height:220px");
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain(">output</div>");
  });
});
