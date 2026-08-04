// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mount } from "@vue/test-utils";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import PnwPageMainBlock from "./PnwPageMainBlock.vue";

const PNW_PAGE_MAIN_BLOCK_SOURCE = readFileSync(
  resolve(process.cwd(), "src/layout/PnwPageMainBlock.vue"),
  "utf8",
);

describe("PnwPageMainBlock", () => {
  it("提供无业务 provider 的默认 10px 工作内容层", () => {
    const wrapper = mount(PnwPageMainBlock, {
      slots: { default: "Raw table" },
    });

    expect(wrapper.classes()).toEqual(["pnw-page-main-block"]);
    expect(wrapper.text()).toBe("Raw table");
    expect(PNW_PAGE_MAIN_BLOCK_SOURCE).toMatch(
      /padding:\s*var\(--pnw-page-main-block-padding, var\(--pnw-page-body-padding, 10px\)\);/u,
    );
    expect(PNW_PAGE_MAIN_BLOCK_SOURCE).not.toMatch(/provide\s*\(/u);
  });

  it("SSR 保留稳定结构类与插槽内容", async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PnwPageMainBlock, null, () => "Fixture content"),
    }));

    expect(html).toContain("pnw-page-main-block");
    expect(html).toContain("Fixture content");
  });
});
