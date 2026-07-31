import { readFileSync } from "node:fs";
import { createSSRApp, defineComponent, h, type Component, type Slots } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { PnwNavigationNode } from "../types/PnwWorkbenchWeb.js";
import {
  PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
  PNW_DEFAULT_RIBBON_APPEARANCE,
} from "../utils/pnwWorkbenchWeb.js";
import PnwIcon from "../components/PnwIcon.vue";
import PnwPhoenixWingMark from "../components/PnwPhoenixWingMark.vue";
import PnwActivityBar from "./PnwActivityBar.vue";
import PnwActivityTree from "./PnwActivityTree.vue";
import PnwLogBlock from "./PnwLogBlock.vue";
import PnwPageHeader from "./PnwPageHeader.vue";
import PnwProblemsBlock from "./PnwProblemsBlock.vue";
import PnwRibbon from "./PnwRibbon.vue";
import PnwRibbonTabBar from "./PnwRibbonTabBar.vue";
import PnwWorkbenchFooter from "./PnwWorkbenchFooter.vue";
import PnwWorkbenchDisplaySettingsPanel from "./PnwWorkbenchDisplaySettingsPanel.vue";
import PnwWorkbenchDisplaySettingsSection from "./PnwWorkbenchDisplaySettingsSection.vue";
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

const PNW_WORKBENCH_FOOTER_SOURCE = readFileSync(
  new URL("./PnwWorkbenchFooter.vue", import.meta.url),
  "utf8",
);

async function pnwRenderComponent(
  component: Component,
  props: Record<string, unknown>,
  slots: Slots = {},
): Promise<string> {
  const context: SSRContext = {};
  const html = await renderToString(createSSRApp({
    render: () => h(component, props, slots),
  }), context);
  return html + Object.values(context.teleports ?? {}).join("");
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
    expect(railHtml).toContain('data-pnw-activity-tree-collapsed-mode="leaf-rail"');
    expect(railHtml).toContain('role="toolbar"');
    expect(railHtml).toContain("无");
    expect(railHtml).not.toContain('role="treeitem"');
  });

  it("Tree 展开和收起外观独立受控且不复制导航树", async () => {
    const adminHtml = await pnwRenderComponent(PnwActivityTree, {
      nodes: PNW_SSR_NAVIGATION,
      activeNodeId: "page",
      expandedNodeIds: ["module", "group"],
      treeAppearance: { expanded: "admin-menu", collapsed: "leaf-rail" },
    });
    const rootRailHtml = await pnwRenderComponent(PnwActivityTree, {
      nodes: PNW_SSR_NAVIGATION,
      activeNodeId: "page",
      collapsed: true,
      treeAppearance: { expanded: "outline", collapsed: "root-flyout" },
    });

    expect(adminHtml).toContain('data-pnw-activity-tree-expanded-mode="admin-menu"');
    expect(adminHtml).toContain("pnw-activity-tree--expanded-admin-menu");
    expect(rootRailHtml).toContain('data-pnw-activity-tree-rail-mode="root-flyout"');
    expect(rootRailHtml).toContain('aria-label="模块"');
    expect(rootRailHtml).not.toContain('aria-label="页面"');
    expect(rootRailHtml).toContain('aria-haspopup="tree"');
  });

  it("第一层显示配置中心始终提供目录展开与收起外观", async () => {
    const html = await pnwRenderComponent(PnwWorkbenchDisplaySettingsPanel, {
      open: true,
      position: { x: 24, y: 56 },
      presentation: "ribbon",
      appearance: {
        mode: "ribbon",
        compact: { iconSize: 24, showTitles: true, showGroupLabels: false },
        ribbon: { iconSize: 36, showTitles: true, showGroupLabels: true },
      },
      treeAppearance: { expanded: "outline", collapsed: "leaf-rail" },
      colorScheme: "light",
      showLayoutSettings: true,
    });

    expect(html).toContain("目录展开外观");
    expect(html).toContain("紧凑大纲树");
    expect(html).toContain("Admin 菜单");
    expect(html).toContain("目录收起外观");
    expect(html).toContain("所有叶子图标");
    expect(html).toContain("一级菜单 + 子菜单浮层");
    expect(html).toContain("View 标签位置");
    expect(html).toContain("Editor 底部");
    expect(html).toContain("pnw-workbench-display-full-done");
    expect(html).toMatch(/>\s*完成\s*<\/button>/u);
    expect(html).not.toContain("before-navigation");
  });

  it("consumer 扩展区复用公共折叠段，不复制配置中心结构样式", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchDisplaySettingsSection,
      { title: "产品显示扩展", summary: "consumer", defaultOpen: true },
      { default: () => [h("label", "产品开关")] },
    );

    expect(html).toContain("pnw-workbench-display-settings-section");
    expect(html).toContain("产品显示扩展");
    expect(html).toContain("产品开关");
    expect(html).toContain(" open");
  });

  it("所有叶子隐藏后只归一化派生树，空目录不会进入 Tree 或 Ribbon", async () => {
    const nodes = [
      { id: "empty", label: "空目录", children: [] },
      {
        id: "restricted",
        label: "无权限目录",
        children: [{ id: "restricted-page", label: "无权限页面", hidden: true }],
      },
      {
        id: "visible",
        label: "可见目录",
        children: [{ id: "visible-page", label: "可见页面" }],
      },
    ] as const satisfies readonly PnwNavigationNode[];

    const treeHtml = await pnwRenderComponent(PnwActivityTree, {
      nodes,
      activeNodeId: "visible-page",
      expandedNodeIds: ["visible"],
    });
    const ribbonHtml = await pnwRenderComponent(PnwRibbon, {
      nodes,
      activeNodeId: "visible-page",
    });

    expect(treeHtml).toContain("可见页面");
    expect(treeHtml).not.toContain("空目录");
    expect(treeHtml).not.toContain("无权限目录");
    expect(ribbonHtml).toContain("可见页面");
    expect(ribbonHtml).not.toContain("空目录");
    expect(ribbonHtml).not.toContain("无权限目录");
    expect(nodes[0]).not.toHaveProperty("hidden");
    expect(nodes[1]).not.toHaveProperty("hidden");
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

  it("ActivityBar 独立入口与 Workbench 第一层都只保留一个显示设置实例", async () => {
    const ribbonHtml = await pnwRenderComponent(PnwActivityBar, {
      nodes: PNW_SSR_NAVIGATION,
      presentation: "ribbon",
      activeNodeId: "page",
    });
    const treeHtml = await pnwRenderComponent(PnwActivityBar, {
      nodes: PNW_SSR_NAVIGATION,
      presentation: "tree",
      activeNodeId: "page",
    });
    const shellHtml = await pnwRenderComponent(
      PnwWorkbenchShell,
      {
        nodes: PNW_SSR_NAVIGATION,
        presentation: "ribbon",
        activeNodeId: "page",
      },
      { default: () => [h("div", "Editor")] },
    );

    expect(ribbonHtml.match(/data-pnw-display-trigger="ribbon"/g)).toHaveLength(1);
    expect(treeHtml.match(/data-pnw-display-trigger="tree"/g)).toHaveLength(1);
    expect(ribbonHtml.match(/aria-label="工作台显示设置"/g)).toHaveLength(1);
    expect(treeHtml.match(/aria-label="工作台显示设置"/g)).toHaveLength(1);
    expect(shellHtml.match(/data-pnw-display-trigger="ribbon"/g)).toHaveLength(1);
    expect(shellHtml.match(/aria-label="工作台显示设置"/g)).toHaveLength(1);
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

  it("面板开关图标为三组独立 on/off SVG 且 on 区域使用 currentColor 实心填充", async () => {
    const pairs = [
      ["panel-left", "panel-left-active", "left"],
      ["panel-bottom", "panel-bottom-active", "bottom"],
      ["panel-right", "panel-right-active", "right"],
    ] as const;

    for (const [offName, onName, panel] of pairs) {
      const offHtml = await pnwRenderComponent(PnwIcon, { name: offName, size: 16 });
      const onHtml = await pnwRenderComponent(PnwIcon, { name: onName, size: 16 });

      expect(offHtml).not.toContain("pnw-icon-panel-fill");
      expect(onHtml).toContain('class="pnw-icon-panel-fill"');
      expect(onHtml).toContain(`data-pnw-panel-fill="${panel}"`);
      expect(onHtml).toContain('fill="currentColor"');
      expect(onHtml).toContain('stroke="none"');
      expect(onHtml).not.toBe(offHtml);
    }
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

  it("窄屏完整设置解释当前 Ribbon 与宽屏 Tree 偏好的区别", async () => {
    const html = await pnwRenderComponent(PnwWorkbenchDisplaySettingsPanel, {
      open: true,
      position: { x: 12, y: 12 },
      presentation: "tree",
      responsiveNarrow: true,
      appearance: PNW_DEFAULT_RIBBON_APPEARANCE,
      treeAppearance: PNW_DEFAULT_ACTIVITY_TREE_APPEARANCE,
      colorScheme: "light",
    });

    expect(html).toContain("窄屏固定使用顶部 Ribbon");
    expect(html).toContain("导航结构暂不可切换");
    expect(html).toContain("恢复宽屏后使用原偏好：侧面目录树");
    expect(html).toContain('disabled title="窄屏固定使用顶部 Ribbon"');
    expect(html).toContain('aria-pressed="true" disabled');
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

  it("业务 View Header 兼容紧凑标题并可追加分类、摘要、说明与操作", async () => {
    const html = await pnwRenderComponent(
      PnwPageHeader,
      {
        eyebrow: "工程工具",
        title: "代码生成",
        subtitle: "Foo.cpp",
        summary: "READY",
        description: "View 自己持有标题和操作；工作台 Header 不重复业务标题。",
      },
      {
        actions: () => [h("button", { type: "button" }, "执行")],
        help: () => [h("button", { type: "button", "aria-label": "帮助" }, "?")],
      },
    );

    expect(html).toContain("pnw-head-eyebrow");
    expect(html).toContain("工程工具");
    expect(html).toContain("代码生成");
    expect(html).toContain("Foo.cpp");
    expect(html).toContain("READY");
    expect(html).toContain("工作台 Header 不重复业务标题");
    expect(html.indexOf("代码生成")).toBeLessThan(html.indexOf("执行"));
    expect(html.indexOf("执行")).toBeLessThan(html.indexOf("帮助"));
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

  it("同一 View TabBar 可受控移动到三个连续壳层位置且始终只渲染一次", async () => {
    const placements = [
      "header",
      "after-navigation",
      "editor-bottom",
    ] as const;
    const rendered = await Promise.all(placements.map((tabBarPlacement) => (
      pnwRenderComponent(
        PnwWorkbenchShell,
        {
          nodes: PNW_SSR_NAVIGATION,
          activeNodeId: "page",
          tabs: [{ id: "page", pageId: "page", title: "页面", dirty: false }],
          activeTabId: "page",
          tabBarPlacement,
        },
        { default: () => [h("div", "Editor")] },
      )
    )));

    rendered.forEach((html, index) => {
      expect(html).toContain(`data-pnw-tab-bar-placement="${placements[index]}"`);
      expect(html.match(/aria-label="已打开页面"/g)).toHaveLength(1);
    });
    expect(rendered[0]).toContain("pnw-workbench-header-pages");
    expect(rendered[1]).toContain("pnw-workbench-view-tabs--editor-top");
    expect(rendered[2]).toContain("pnw-workbench-view-tabs--editor-bottom");

    const treeAfterHtml = await pnwRenderComponent(
      PnwWorkbenchShell,
      {
        nodes: PNW_SSR_NAVIGATION,
        presentation: "tree",
        tabs: [{ id: "page", pageId: "page", title: "页面", dirty: false }],
        activeTabId: "page",
        tabBarPlacement: "after-navigation",
      },
      { default: () => [h("div", "Editor")] },
    );
    expect(treeAfterHtml).toContain("pnw-workbench-view-tabs--editor-top");
    expect(treeAfterHtml.match(/aria-label="已打开页面"/g)).toHaveLength(1);
    expect(treeAfterHtml).not.toContain('aria-label="模块"');
    expect(treeAfterHtml).toContain('data-pnw-activity-presentation="tree"');
    expect(treeAfterHtml).toContain('data-pnw-preferred-activity-presentation="tree"');
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

  it("Footer 始终输出三个仅图标开关且禁用当前 View 未贡献的 Block", async () => {
    const html = await pnwRenderComponent(
      PnwWorkbenchFooter,
      {
        contributions: { primary: true, bottom: true },
        visibility: { primary: true, bottom: false, secondary: false },
      },
      { default: () => [h("span", "Consumer status")] },
    );

    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain("Consumer status");
    expect(html).toContain('aria-label="显示/隐藏 Primary Block"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("pnw-workbench-footer-toggle--active");
    expect(html).toContain('data-pnw-panel-fill="left"');
    expect(html).not.toContain('data-pnw-panel-fill="bottom"');
    expect(html).not.toContain('data-pnw-panel-fill="right"');
    expect(html).toContain('title="当前 View 未提供 Secondary Block"');
    expect(html).toMatch(/disabled[^>]*aria-label="显示\/隐藏 Secondary Block"/);
  });

  it("Footer 随受控 visibility 切换三组 on/off 图形且禁用项始终保持 off", async () => {
    const html = await pnwRenderComponent(PnwWorkbenchFooter, {
      contributions: { primary: true, bottom: true, secondary: false },
      visibility: { primary: false, bottom: true, secondary: true },
    });

    expect(html).not.toContain('data-pnw-panel-fill="left"');
    expect(html).toContain('data-pnw-panel-fill="bottom"');
    expect(html).not.toContain('data-pnw-panel-fill="right"');
    expect(html).toContain('aria-label="显示/隐藏 Primary Block" aria-pressed="false"');
    expect(html).toContain('aria-label="显示/隐藏 Bottom Panel" aria-pressed="true"');
    expect(html).not.toContain("pnw-workbench-footer-toggle--active");
    expect(html).toMatch(/disabled[^>]*aria-label="显示\/隐藏 Secondary Block"[^>]*aria-pressed="false"/);
  });

  it("Footer on 状态保持扁平并保留 hover 与键盘焦点反馈", () => {
    expect(PNW_WORKBENCH_FOOTER_SOURCE).not.toContain("pnw-workbench-footer-toggle--active");
    expect(PNW_WORKBENCH_FOOTER_SOURCE).toMatch(
      /\.pnw-workbench-footer-toggle:hover,[\s\S]*?background:/u,
    );
    expect(PNW_WORKBENCH_FOOTER_SOURCE).toMatch(
      /\.pnw-workbench-footer-toggle:focus-visible\s*\{[\s\S]*?border-color:/u,
    );
    expect(PNW_WORKBENCH_FOOTER_SOURCE).toContain(".pnw-workbench-footer-toggle:disabled");
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
    expect(html.match(/pnw-workbench-footer-toggle/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html.match(/disabled/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("只有 consumer 显式关闭时才不渲染 Footer", async () => {
    const html = await pnwRenderComponent(PnwWorkbenchLayout, {
      showFooter: false,
    });

    expect(html).not.toContain("pnw-workbench-footer");
  });

  it("无 slot 时不生成空 Block，Bottom 始终嵌在 Editor 栈内", async () => {
    const emptyHtml = await pnwRenderComponent(PnwWorkbenchLayout, {
      contributions: { primary: true, bottom: true, secondary: true },
      visibility: { primary: true, bottom: true, secondary: true },
      colorScheme: "dark",
    });
    expect(emptyHtml).toContain('data-pnw-color-scheme="dark"');
    expect(emptyHtml).not.toContain("pnw-primary-block");
    expect(emptyHtml).toContain("pnw-workbench-footer");
    expect(emptyHtml.match(/disabled/g)?.length).toBeGreaterThanOrEqual(3);

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

  it("紧凑 Problems / Log Block 输出过滤工具栏、结构化行与空态", async () => {
    const logHtml = await pnwRenderComponent(PnwLogBlock, {
      entries: [{
        id: "log-1",
        timestamp: 1_700_000_000_000,
        level: "error",
        channel: "pnw.workbench",
        source: "fixture",
        message: "ActivityBar 切换失败",
      }],
    });
    expect(logHtml).toContain('role="log"');
    expect(logHtml).toContain('aria-label="日志频道"');
    expect(logHtml).toContain('aria-label="过滤日志"');
    expect(logHtml).toContain("pnw.workbench");
    expect(logHtml).toContain("ActivityBar 切换失败");
    expect(logHtml).not.toContain("BOTTOM · VIEW CONTRIBUTION");

    const problemsHtml = await pnwRenderComponent(PnwProblemsBlock, {
      items: [{
        id: "problem-1",
        ownerId: "fixture",
        severity: "warning",
        message: "缺少 End 标记",
        source: "codegen",
        code: "marker.missing-end",
        resource: "Foo.cpp",
        line: 128,
      }],
    });
    expect(problemsHtml).toContain('role="list"');
    expect(problemsHtml).toContain('aria-label="问题来源"');
    expect(problemsHtml).toContain("marker.missing-end");
    expect(problemsHtml).toContain("Foo.cpp:128");

    const emptyHtml = await pnwRenderComponent(PnwProblemsBlock, { items: [] });
    expect(emptyHtml).toContain("未检测到问题");
  });
});
