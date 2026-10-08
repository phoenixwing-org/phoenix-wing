import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileStyle, parse } from "vue/compiler-sfc";

describe("workbench stacked scroll boundary", () => {
  it("gives the real PrimaryPanel body higher specificity than SidebarBlock regardless of stylesheet order", () => {
    const compile = (file: string) => {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      const { descriptor } = parse(source);
      return compileStyle({ source: descriptor.styles[0].content, filename: file, id: "data-v-test", scoped: true }).code;
    };
    const workbench = compile("./PnwWorkbenchLayout.vue");
    const sidebar = compile("./PnwSidebarBlock.vue");
    const primarySelector = workbench.match(/\.pnw-workbench-content[^,{}]*\.pnw-workbench-primary-region[^,{}]*\.pnw-sidebar-block\.pnw-sidebar-block--body-scroll\s*>\s*\.pnw-sidebar-block-body/)?.[0];
    const baseSelector = sidebar.match(/\.pnw-sidebar-block--body-scroll[^{}]*\.pnw-sidebar-block-body[^{}]*(?=\{\s*overflow: auto)/)?.[0];
    expect(primarySelector).toBeTruthy();
    expect(baseSelector).toBeTruthy();
    const specificity = (selector: string) => (selector.match(/\.[\w-]+|\[[^\]]+\]/g) ?? []).length;
    expect(specificity(primarySelector!)).toBeGreaterThan(specificity(baseSelector!));
    const primary = readFileSync(new URL("./PnwPrimaryPanel.vue", import.meta.url), "utf8");
    expect(primary).toContain("<PnwSidebarBlock");
    expect(primary).toContain(':body-scroll="bodyScroll"');
  });
  it("only releases vertical scroll chaining inside narrow workbench content", () => {
    const source = readFileSync(new URL("./PnwWorkbenchLayout.vue", import.meta.url), "utf8");
    const narrow = source.slice(source.indexOf("@container pnw-workbench (max-width: 840px)"));
    expect(narrow).toContain(".pnw-workbench-content :deep(.pnw-view-presentation-portal__main-frame--page)");
    expect(narrow).toContain(".pnw-workbench-content :deep(.pnw-sidebar-block--body-scroll .pnw-sidebar-block-body)");
    expect(narrow).toContain(".pnw-workbench-content :deep(.pnw-page-layout--body-scroll .pnw-page-layout-body)");
    expect(narrow).toContain("overscroll-behavior-y: auto;");
    expect(source.slice(0, source.indexOf("@container pnw-workbench (max-width: 840px)"))).not.toContain("overscroll-behavior-y: auto;");
    expect(narrow).toContain("overscroll-behavior: contain;");
    const floating = readFileSync(new URL("../components/PnwFloatingPanel.vue", import.meta.url), "utf8");
    expect(floating).toContain('<Teleport to="body">');
    expect(floating).toContain("overscroll-behavior: contain;");
  });
});
