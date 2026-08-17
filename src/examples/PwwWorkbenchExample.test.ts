import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PWW_WORKBENCH_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../examples/PwwWorkbenchWeb",
);

function pwwReadFile(relativePath: string): string {
  return fs.readFileSync(path.join(PWW_WORKBENCH_ROOT, relativePath), "utf8");
}

function pwwReadSourceTree(relativeDirectory: string): string {
  const directory = path.join(PWW_WORKBENCH_ROOT, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) return pwwReadSourceTree(relativePath);
      return /\.(?:ts|vue)$/u.test(entry.name) ? [pwwReadFile(relativePath)] : [];
    })
    .join("\n");
}

describe("PwwWorkbenchWeb 非发布 fixture 示例", () => {
  it("保留计划要求的独立目录且不形成 npm 包", () => {
    expect([
      "README.md",
      "index.html",
      "vite.config.ts",
      "tsconfig.json",
      "src/App.vue",
      "src/main.ts",
      "src/fixture/PwwFixtureNavigationLayoutView.vue",
      "src/fixture/PwwFixtureDisplaySettingsExtras.vue",
      "src/fixture/PwwFixtureWorkbenchView.vue",
      "src/fixture/PwwFixtureSummaryView.vue",
      "src/fixture/PwwFixtureCatalogView.vue",
      "src/fixture/PwwFixtureCodegenView.vue",
      "src/fixture/PwwFixtureInspectionView.vue",
      "src/fixture/PwwFixtureIssueView.vue",
      "src/fixture/PwwFixtureHomeView.vue",
      "src/fixture/PwwFixtureWorkspaceWelcome.vue",
      "src/fixture/PwwFixtureEditorView.ts",
      "src/fixture/PwwFixtureViewPrimary.vue",
      "src/fixture/PwwFixtureViewSecondary.vue",
      "src/fixture/PwwFixtureViewBottom.vue",
      "src/fixture/PwwFixtureViewBlockRegistry.ts",
      "src/fixture/PwwFixtureWorkbench.css",
      "src/fixture/PwwFixtureNavigation.ts",
      "src/fixture/PwwFixtureViewDefinitions.ts",
      "src/fixture/PwwFixturePresentationView.vue",
      "src/fixture/PwwFixtureDockableToolView.vue",
      "src/fixture/PwwFixtureDockableToolPrimary.vue",
      "src/fixture/PwwFixtureResourceToolState.ts",
      "src/fixture/PwwFixtureNavigationLayout.ts",
      "src/fixture/PwwFixtureWorkbenchStore.ts",
      "src/fixture/PwwFixtureWorkbenchController.ts",
      "src/fixture/PwwFixtureWorkbenchPreferences.ts",
    ].every((relativePath) => fs.existsSync(path.join(PWW_WORKBENCH_ROOT, relativePath))))
      .toBe(true);
    expect(fs.existsSync(path.join(PWW_WORKBENCH_ROOT, "package.json"))).toBe(false);

    expect(fs.readdirSync(path.join(PWW_WORKBENCH_ROOT, "src")).sort()).toEqual([
      "App.vue",
      "fixture",
      "main.ts",
    ]);
    const pwwFixtureFileNames = fs.readdirSync(path.join(PWW_WORKBENCH_ROOT, "src/fixture"));
    expect(pwwFixtureFileNames.every((name) => name.startsWith("PwwFixture"))).toBe(true);
  });

  it("只从 phoenix-wing 公共入口消费组件、类型和样式", () => {
    const sources = [
      pwwReadFile("src/App.vue"),
      pwwReadFile("src/fixture/PwwFixtureNavigationLayoutView.vue"),
      pwwReadFile("src/fixture/PwwFixtureDisplaySettingsExtras.vue"),
      pwwReadFile("src/fixture/PwwFixtureWorkbenchView.vue"),
      pwwReadFile("src/fixture/PwwFixtureViewBlockRegistry.ts"),
      pwwReadFile("src/fixture/PwwFixtureWorkbenchController.ts"),
      pwwReadFile("src/main.ts"),
      pwwReadFile("src/fixture/PwwFixtureNavigation.ts"),
      pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"),
      pwwReadFile("src/fixture/PwwFixturePresentationView.vue"),
      pwwReadFile("src/fixture/PwwFixtureDockableToolView.vue"),
      pwwReadFile("src/fixture/PwwFixtureHomeView.vue"),
      pwwReadFile("src/fixture/PwwFixtureWorkspaceWelcome.vue"),
    ].join("\n");

    expect(sources).toContain('from "phoenix-wing"');
    expect(sources).toContain('"phoenix-wing/style.css"');
    expect(sources).toContain("PnwWorkbenchShell");
    expect(sources).toContain('brand-subtitle="fixture / public entry"');
    expect(sources).toContain("PnwIcon");
    expect(pwwReadFile("src/App.vue")).not.toContain("PnwWorkbenchHeader");
    expect(pwwReadFile("src/App.vue")).not.toContain("PnwRibbonTabBar");
    expect(pwwReadFile("src/App.vue")).not.toContain("PnwWorkbenchTabBar");
    expect(pwwReadFile("src/App.vue")).toContain(':view-blocks="pwwFixture.view.blocks"');
    expect(pwwReadFile("src/App.vue"))
      .toContain(':default-bottom-block="pwwFixture.view.defaultBottom"');
    expect(pwwReadFile("src/App.vue")).toContain("reactive(usePwwFixtureWorkbenchController())");
    expect(pwwReadFile("src/App.vue")).not.toContain("#primary");
    expect(pwwReadFile("src/App.vue")).not.toContain("#secondary");
    expect(pwwReadFile("src/App.vue")).not.toContain("#bottom");
    expect(pwwReadFile("src/App.vue")).not.toContain("Fixture 关键字");
    const pwwFixtureView = pwwReadFile("src/fixture/PwwFixtureWorkbenchView.vue");
    expect(pwwFixtureView).toContain("usePnwViewContribution");
    expect(pwwFixtureView).toContain("PwwFixtureViewPrimary");
    expect(pwwFixtureView).toContain("PwwFixtureViewSecondary");
    expect(pwwFixtureView).toContain("PwwFixtureViewBottom");
    expect(pwwFixtureView).toContain("PwwFixtureSummaryView");
    expect(pwwFixtureView).toContain("PwwFixtureCatalogView");
    expect(pwwFixtureView).toContain("PwwFixtureCodegenView");
    expect(pwwFixtureView).toContain("PwwFixtureInspectionView");
    expect(pwwFixtureView).toContain("PwwFixtureIssueView");
    expect(pwwReadFile("src/fixture/PwwFixtureSummaryView.vue")).toContain("PnwPageLayout");
    for (const relativePath of [
      "src/fixture/PwwFixtureCatalogView.vue",
      "src/fixture/PwwFixtureCodegenView.vue",
      "src/fixture/PwwFixtureInspectionView.vue",
      "src/fixture/PwwFixtureIssueView.vue",
    ]) {
      expect(pwwReadFile(relativePath)).toContain("PnwPageHeader");
    }
    expect(pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"))
      .toContain("PNXTemplateBaseParam.json");
    expect(pwwReadFile("src/fixture/PwwFixtureCodegenView.vue"))
      .toContain("保存 JSON");
    expect(pwwReadFile("src/fixture/PwwFixtureNavigationLayoutView.vue"))
      .toContain("PnwPageHeader");
    expect(fs.existsSync(path.join(
      PWW_WORKBENCH_ROOT,
      "src/fixture/PwwFixtureViewHeader.vue",
    ))).toBe(false);
    expect(pwwReadFile("src/fixture/PwwFixtureWorkbenchPreferences.ts"))
      .toContain("visibility: { primary: true, bottom: true, secondary: false }");
    expect(pwwReadFile("src/fixture/PwwFixtureViewPrimary.vue")).toContain("当前 View");
    expect(pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"))
      .toContain("不为简单属性额外占用右侧宽度");
    expect(pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"))
      .toContain('kind: "codegen"');
    expect(pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"))
      .toContain('"result-preview"');
    expect(pwwReadFile("src/fixture/PwwFixturePresentationView.vue"))
      .toContain("PnwViewPresentationPortal");
    expect(pwwReadFile("src/fixture/PwwFixturePresentationView.vue"))
      .toContain(":presentation-detachable=\"pwwContribution.detachable\"");
    expect(pwwReadFile("src/fixture/PwwFixturePresentationView.vue"))
      .toContain("fixture.open-result-floating");
    expect(pwwReadFile("src/App.vue")).toContain("handleViewAction");
    expect(pwwReadFile("src/App.vue")).toContain("PwwFixtureWorkspaceWelcome");
    expect(pwwReadFile("src/App.vue")).toContain('template #workbench="{ showWelcome }"');
    expect(pwwReadFile("src/App.vue")).toContain('@click="showWelcome"');
    const pwwHomeView = pwwReadFile("src/fixture/PwwFixtureHomeView.vue");
    expect(pwwHomeView).toContain("PnwWorkbenchHome");
    expect(pwwHomeView).toContain("pwwHomeFeatures");
    expect(pwwHomeView).toContain("开始巡游");
    expect(pwwHomeView).toContain("消费者完全自定义区");
    expect(pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"))
      .toContain("pnwCreateWorkbenchHomeDefinition");
    expect(pwwReadFile("src/fixture/PwwFixtureViewDefinitions.ts"))
      .not.toContain('kind: "workspace-welcome"');
    expect(sources).not.toMatch(/(?:\.\.\/)+src\//u);
  });

  it("不连接 Router 或产品 API，并由 fixture consumer 选择偏好持久化", () => {
    const sources = pwwReadSourceTree("src");

    expect(sources).not.toMatch(/vue-router|\bfetch\s*\(|\baxios\b|sessionStorage/u);
    expect(sources).toContain("window.localStorage");
    expect(sources).toContain("pnwNormalizeWorkbenchDisplayPreferences");
    expect(sources).toContain("pwwWriteFixtureWorkbenchPreferences");
    expect(sources).toContain("PWW_FIXTURE_NAVIGATION");
    expect(sources).toContain("PWW_FIXTURE_VIEWS");
    expect(sources).toContain("PWW_FIXTURE_VIEW_BLOCK_REGISTRY");
    expect(sources).not.toContain(':show-ribbon-appearance-menu="false"');
    expect(sources).toContain('#display-settings-actions="{ emitAction }"');
    expect(sources).toContain("emitAction('fixture.log-display-state')");
    expect(sources).toContain('@display-settings-action="pwwFixture.actions.handleDisplaySettingsAction"');
    expect(sources).toContain("#display-settings-panel-extra");
    expect(sources).toContain("PwwFixtureDisplaySettingsExtras");
    expect(sources).toContain("Consumer 处理显示菜单动作");
    expect(sources).not.toContain("PwwFixtureWorkbenchSettingsPanel");
    expect(sources).toContain("Consumer 用户区域示例");
    expect(sources).toContain("pwwOpenTabs");
    expect(sources).toContain('v-model:tree-collapsed="pwwFixture.navigation.treeCollapsed"');
    expect(sources).toContain("pwwMoveExampleNavigationNode");
    expect(sources).toContain("pwwRestoreDefaultNavigation");
    expect(sources).toContain('v-model:layout-state="pwwFixture.layout.state"');
    expect(sources).toContain('v-model:display-settings-positions="pwwFixture.settings.displayPositions"');
    expect(sources).toContain('v-model:active-bottom-tab-id="pwwFixture.layout.activeBottomTabId"');
    expect(sources).toContain(':show-empty-view="pwwFixture.tabs.items.length === 0"');
    expect(sources).toContain('pwwActiveNodeId.value = ""');
    expect(sources).not.toContain("拖动顶边句柄调整高度");
    expect(sources).toContain("<table class=\"pww-navigation-layout-table\"");
    expect(sources).toContain("包含的工具 / View");
    expect(sources).toContain("移动到");
    expect(sources).toContain("全部恢复默认");
    expect(sources).toContain("恢复本模块");
    expect(sources).toContain("新建大分组");
    expect(sources).toContain("只定义一级大分组");
    expect(sources).toContain("内置分组");
    expect(sources).toContain("自定义分组");
    expect(sources).toContain("恢复定义");
    expect(sources).toContain("pwwUpdateNavigationRoot");
    expect(sources).toContain("pwwRestoreNavigationRootDefinition");
    expect(sources).toContain("当前分组树与小模块归属");
    expect(sources).toContain(":aria-expanded=\"!pwwRootCollapsed(root.id)\"");
    expect(sources).toContain("全部折叠");
    expect(sources).toContain("Ribbon / Tree 隐藏");
    expect(sources).toContain("max-height: min(58vh, 600px)");
    expect(sources).toContain('shortLabel: "工作"');
    expect(sources).toContain("PnwWorkbenchShell");
    expect(sources).toContain("PnwWorkbenchDisplaySettingsSection");
    expect(sources).toContain("PnwWorkspaceGate");
    expect(sources).toContain("PnwColorSchemeToggle");
    expect(sources).toContain("PnwInformationCardGroup");
    expect(sources).toContain("PnwWorkspaceTypeSelect");
    expect(sources).toContain("PnwWorkbenchHome");
    expect(sources).toContain('pwwGateMode = ref<PnwWorkspaceGateMode>("welcome")');
    expect(sources).toContain("关闭工作空间");
    expect(sources).toContain("必须先打开工作空间");
    expect(sources).toContain("允许无工作空间进入");
    expect(sources).toContain("default-open");
    expect(sources).toContain("Fixture 窄屏检查");
    expect(sources).toContain("公共 SVG 尺寸回归");
    expect(sources).toContain("PwwFixtureNavigationLayoutView");
    expect(sources).toContain("导航分组布局");
    expect(pwwReadFile("src/App.vue")).not.toContain("宿主导航布局 fixture");
  });
});
