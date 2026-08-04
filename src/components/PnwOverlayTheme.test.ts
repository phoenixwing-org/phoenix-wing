import { readFileSync } from "node:fs";
import { createSSRApp, h, type Component, type Slots } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  pnwChoiceDialogOpen,
  pnwChoiceDialogRequest,
  pnwResolveChoice,
} from "../composables/pnwChoiceDialog.js";
import {
  pnwApplyColorScheme,
  pnwGetAppliedColorScheme,
} from "../utils/pnwColorScheme.js";
import PnwAppModalOverlay from "./PnwAppModalOverlay.vue";
import PnwChoiceDialogHost from "./PnwChoiceDialogHost.vue";
import PnwOverlayThemeProvider from "./PnwOverlayThemeProvider.vue";

const PNW_APP_MODAL_SOURCE = readFileSync(
  new URL("./PnwAppModalOverlay.vue", import.meta.url),
  "utf8",
);
const PNW_CHOICE_DIALOG_SOURCE = readFileSync(
  new URL("./PnwChoiceDialogHost.vue", import.meta.url),
  "utf8",
);
const PNW_FLOATING_PANEL_SOURCE = readFileSync(
  new URL("./PnwFloatingPanel.vue", import.meta.url),
  "utf8",
);
const PNW_ASYNC_PROGRESS_SOURCE = readFileSync(
  new URL("./PnwAsyncProgressOverlay.vue", import.meta.url),
  "utf8",
);
const PNW_ACTIVITY_TREE_RAIL_SOURCE = readFileSync(
  new URL("../layout/PnwActivityTreeRail.vue", import.meta.url),
  "utf8",
);
const PNW_WORKBENCH_THEME_SOURCE = readFileSync(
  new URL("../styles/pnwWorkbenchTheme.css", import.meta.url),
  "utf8",
);

async function pnwRenderWithTeleports(
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

afterEach(() => {
  pnwResolveChoice(null);
  pnwApplyColorScheme("light");
  vi.unstubAllGlobals();
});

describe("Pnw Teleport overlay 主题契约", () => {
  it("统一 Theme Provider 在 light/dark 下携带确定 scheme 与公共根标记", async () => {
    const lightHtml = await pnwRenderWithTeleports(
      PnwOverlayThemeProvider,
      { colorScheme: "light" },
      { default: () => [h("span", "Light overlay")] },
    );
    const darkHtml = await pnwRenderWithTeleports(
      PnwOverlayThemeProvider,
      { colorScheme: "dark" },
      { default: () => [h("span", "Dark overlay")] },
    );

    expect(lightHtml).toContain('data-pnw-color-scheme="light"');
    expect(darkHtml).toContain('data-pnw-color-scheme="dark"');
    expect(lightHtml).toContain("data-pnw-overlay-theme-root");
    expect(darkHtml).toContain("pnw-workbench-theme-root");
  });

  it("PnwAppModalOverlay Teleport 到 body 后仍携带显式 dark theme root", async () => {
    const html = await pnwRenderWithTeleports(
      PnwAppModalOverlay,
      { open: true, ariaLabel: "Dark modal", colorScheme: "dark" },
      { default: () => [h("p", "Modal content")] },
    );

    expect(html).toContain('data-pnw-color-scheme="dark"');
    expect(html).toContain("data-pnw-overlay-theme-root");
    expect(html).toContain("pnw-modal-overlay");
    expect(html).toContain("pnw-modal-panel");
    expect(html).toContain('aria-label="Dark modal"');
  });

  it("PnwChoiceDialogHost 复用公共 Modal 并输出 dark surface 与按钮状态语义", async () => {
    pnwChoiceDialogRequest.value = {
      title: "停用 Function",
      message: "确认停用当前 Function？",
      choices: [
        { id: "confirm", label: "停用", variant: "danger" },
        { id: "cancel", label: "取消", variant: "default" },
      ],
      defaultChoiceId: "cancel",
    };
    pnwChoiceDialogOpen.value = true;

    const html = await pnwRenderWithTeleports(PnwChoiceDialogHost, {
      colorScheme: "dark",
    });

    expect(html).toContain('data-pnw-color-scheme="dark"');
    expect(html).toContain("pnw-choice-dialog");
    expect(html).toContain("停用 Function");
    expect(html).toContain('class="btn pnw-choice-btn danger"');
    expect(html).toContain("autofocus");
  });

  it("pnwApplyColorScheme 写入根标记并驱动未显式指定 scheme 的 overlay", async () => {
    const dataset: DOMStringMap = {};
    vi.stubGlobal("document", { documentElement: { dataset } });
    pnwApplyColorScheme("dark");

    const html = await pnwRenderWithTeleports(
      PnwOverlayThemeProvider,
      {},
      { default: () => [h("span", "Applied theme")] },
    );

    expect(dataset.theme).toBe("dark");
    expect(dataset.pnwColorScheme).toBe("dark");
    expect(pnwGetAppliedColorScheme()).toBe("dark");
    expect(html).toContain('data-pnw-color-scheme="dark"');
  });

  it("公共 token 源覆盖 surface/text/muted/border/backdrop 与按钮 light/dark 状态", () => {
    for (const token of [
      "--pnw-workbench-default-surface",
      "--pnw-workbench-default-text",
      "--pnw-workbench-default-muted",
      "--pnw-workbench-default-border",
      "--pnw-workbench-default-overlay-backdrop",
      "--pnw-workbench-default-control-bg",
      "--pnw-workbench-default-primary-bg",
      "--pnw-workbench-default-danger-bg",
    ]) {
      expect(PNW_WORKBENCH_THEME_SOURCE.match(new RegExp(token, "gu"))?.length)
        .toBeGreaterThanOrEqual(2);
    }
    expect(PNW_WORKBENCH_THEME_SOURCE).toContain(
      '.pnw-workbench-theme-root[data-pnw-color-scheme="dark"]',
    );
  });

  it("所有 Wing Teleport 浮层复用 Provider，核心 Modal 不再优先读取 legacy token", () => {
    expect(PNW_APP_MODAL_SOURCE).toContain("PnwOverlayThemeProvider");
    expect(PNW_CHOICE_DIALOG_SOURCE).toContain("PnwAppModalOverlay");
    expect(PNW_CHOICE_DIALOG_SOURCE).toContain(".el-checkbox__inner");
    expect(PNW_CHOICE_DIALOG_SOURCE).toContain("--pnw-workbench-default-primary-bg");
    expect(PNW_FLOATING_PANEL_SOURCE).toContain("PnwOverlayThemeProvider");
    expect(PNW_ASYNC_PROGRESS_SOURCE).toContain("PnwOverlayThemeProvider");
    expect(PNW_ACTIVITY_TREE_RAIL_SOURCE).toContain("PnwOverlayThemeProvider");

    for (const source of [PNW_APP_MODAL_SOURCE, PNW_CHOICE_DIALOG_SOURCE]) {
      expect(source).not.toContain("var(--page-bg");
      expect(source).not.toContain("var(--text");
      expect(source).not.toContain("var(--border-strong");
    }
  });
});
